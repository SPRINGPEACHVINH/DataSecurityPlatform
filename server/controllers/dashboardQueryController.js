// Handles requests from the dashboard (queries Elasticsearch)
import {
  utilitySearchRegexPattern,
  utilitySearchKeyword,
} from "../services/elasticsearchService/search.js";
import {
  utilitySyncConnectors,
  utilitygetSyncStatus,
} from "../services/elasticsearchService/connector.js";
import { utilityDeleteFileContent } from "../services/elasticsearchService/document.js";
import Models from "../models/userModel.js";
const { Sync, Connector } = Models;
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const execFile = promisify(exec)

export const handleDashboardSearch = async (req, res) => {
  try {
    const { search_type, keyword, pattern, index_name } = req.body;

    // Validate required parameters
    if (!index_name) {
      return res.status(400).json({
        message: "Missing required parameters: index_name is required",
      });
    }

    // Validate search parameters based on search type
    if (search_type === "pattern") {
      if (!pattern) {
        return res.status(400).json({
          message:
            "Missing required parameter: pattern is required for regex search",
        });
      }
    } else if (search_type === "keyword") {
      if (!keyword) {
        return res.status(400).json({
          message:
            "Missing required parameter: keyword is required for keyword search",
        });
      }
    } else {
      return res.status(400).json({
        message: "Invalid search_type",
      });
    }

    const connector = await Connector.findOne({ connector_name: index_name });
    if (!connector) {
      return res.status(404).json({
        message: `Connector with name '${index_name}' not found.`,
      });
    }
    console.log(`Found connector:`, connector);

    // Sync file content before searching
    const syncResponse = await utilitySyncConnectors(connector.connector_id);
    console.log("Sync response:", syncResponse);

    if (!syncResponse || !syncResponse.sync_id) {
      return res.status(500).json({
        message: "Failed to initiate sync.",
        data: syncResponse,
      });
    }

    // Wait for sync to complete (polling)
    let syncStatus = "pending";
    const maxRetries = 10;
    let attempts = 0;

    while (syncStatus !== "completed" && attempts < maxRetries) {
      await new Promise((r) => setTimeout(r, 30000)); // Wait 30 seconds

      const syncStatusResponse = await utilitygetSyncStatus(
        syncResponse.sync_id
      );
      console.log("Sync status response:", syncStatusResponse);

      syncStatus = syncStatusResponse?.sync_status || "pending";
      attempts++;
    }
    if (syncStatus !== "completed") {
      return res.status(500).json({
        message: "Sync did not complete in time.",
        status: syncStatus,
        attempts: attempts,
      });
    } else {
      console.log("Sync completed successfully.");

      // Perform the search
      let results;
      if (search_type === "pattern") {
        console.log(`Performing regex search with pattern: ${pattern}`);
        results = await utilitySearchRegexPattern(
          pattern,
          connector.connector_name
        );
      } else if (search_type === "keyword") {
        console.log(`Performing keyword search with keyword: ${keyword}`);
        results = await utilitySearchKeyword(keyword, connector.connector_name);
      } else {
        return res.status(400).json({
          message: "There was an error with the search_type",
        });
      }

      if (!results || !results.data) {
        res.status(500).json({
          message: "Search failed or returned no data.",
          data: results,
        });
      } else {
        console.log(`Search completed.`);

        try {
          // Delete file content after search
          const deleteFileContentRes = await utilityDeleteFileContent(
            connector.connector_name
          );

          if (
            deleteFileContentRes?.status === 200 &&
            deleteFileContentRes?.summary?.successful > 0
          ) {
            console.log(
              `File content deleted successfully. ${deleteFileContentRes.summary.total_documents_updated} documents updated.`
            );
          } else {
            console.warn(
              "Warning: File content deletion reported failure:",
              deleteFileContentRes
            );
          }
        } catch (err) {
          console.warn("Warning: Error during file content deletion:", err);
        }

        res.status(200).json({
          data: results,
        });
      }
    }
  } catch (error) {
    console.error("Error handling dashboard search:", error);
    res.status(500).json({
      message: "Failed to handle dashboard search",
      error: error.message || "Unknown error",
    });
  }
};

export const handleScriptExecution = async (req, res) => {
  const { sharePath, keyword } = req.body;

  // Validate required parameters
  if (!sharePath || !keyword) {
    return res.status(400).json({
      message:
        "Missing required parameters: sharePath and keyword are required",
    });
  }

  try {
    const scriptPath = path.join(process.cwd(), "utils", "finding.ps1");

    const command = `pwsh -File "${scriptPath}" -Function Find-SensitiveData -SharePath "${sharePath}" -keyword "${keyword}"`;

    const { stdout, stderr } = await execFile(command, {
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr) {
      console.error("PowerShell stderr:", stderr);
    }

    const resultsString = stdout.toString();

    const searchStarted =
      resultsString.match(/Search started for pattern '.*'/)?.[0] || null;
    const searchComplete =
      resultsString.match(/Search complete/)?.[0] || null;
    const outputFile =
      resultsString.match(/Wrote to (.*\.txt)/)?.[1] || null;

    // Return the results to the client
    res.status(200).json({
      message: "PowerShell script executed successfully",
      data: {
        searchStarted: searchStarted || null,
        searchComplete: searchComplete || null,
        outputFile: outputFile || null,
      },
      exitCode: code,
    });
  } catch (error) {
    console.error("Error executing PowerShell script:", error);
    res.status(500).json({
      message: "Failed to execute PowerShell script",
      error: error.message || "Unknown error",
      details: error.errors || [],
    });
  }
};

export const queryScriptResults = async (req, res) => {
  try {
    const { outputFile } = req.body;
    let filePath = null;

    const defaultFilePath = path.join(baseDir, "Result", "PotentialData-CustomKeyword--daoxu.txt");

    filePath = outputFile || defaultFilePath;

    console.log("Searching for result file at:", filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "Result file not found.",
      });
    }

    const content = fs.readFileSync(filePath, "utf8");
    if (!content) {
      return res.status(404).json({
        message: "Result file is empty.",
      });
    }

    const fileRowsMap = {};
    content
      .split("\n")
      .filter(Boolean)
      .forEach((line) => {
        const firstColon = line.indexOf(":");
        const secondColon = line.indexOf(":", firstColon + 1);
        const fileName =
          secondColon !== -1 ? line.substring(0, secondColon) : line;

        const match = line.match(/\.txt:(\d+):/);
        const row = match ? parseInt(match[1], 10) : null;

        if (!fileRowsMap[fileName]) {
          fileRowsMap[fileName] = [];
        }
        fileRowsMap[fileName].push(row);
      });

    if (Object.keys(fileRowsMap).length === 0) {
      return res.status(404).json({
        message: "No file names found in the result file.",
      });
    }

    res.status(200).json({
      message: "Found file names successfully.",
      data: fileRowsMap,
    });
  } catch (error) {
    console.error("Error extracting file names:", error);
    res.status(500).json({
      message: "Failed to extract file names.",
      error: error.message || "Unknown error",
    });
  }
};

export const checkScriptStatus = async (req, res) => {
  try {
    const scriptPath = path.join(process.cwd(), "utils", "finding.ps1");
    const baseDirectory = process.env.BASE_DIRECTORY;
    console.log("Base Directory:", baseDirectory);
    console.log("Script Path:", scriptPath);
    const checks = {
      scriptExists: false,
      scriptReadable: false,
      baseDirectoryExists: false,
      baseDirectoryWritable: false,
      powershellAvailable: false,
      environmentVariables: {
        BASE_DIRECTORY: !!process.env.BASE_DIRECTORY,
      },
    };

    // 1. Check script file
    if (fs.existsSync(scriptPath)) {
      checks.scriptExists = true;
      try {
        fs.accessSync(scriptPath, fs.constants.R_OK);
        checks.scriptReadable = true;
      } catch (error) {
        console.log("Script not readable:", error.message);
      }
    }

    // 2. Check base directory
    if (fs.existsSync(baseDirectory)) {
      checks.baseDirectoryExists = true;
      try {
        fs.accessSync(baseDirectory, fs.constants.W_OK);
        checks.baseDirectoryWritable = true;
      } catch (error) {
        console.log("Base directory not writable:", error.message);
      }
    } else {
      // Try to create directory
      try {
        fs.mkdirSync(baseDirectory, { recursive: true });
        checks.baseDirectoryExists = true;
        checks.baseDirectoryWritable = true;
      } catch (error) {
        console.log("Cannot create base directory:", error.message);
      }
    }

    // 3. Check PowerShell
    const powershellCheck = new Promise(async (resolve) => {
      try {
        const { stdout, stderr } = await execFile(
          "pwsh -Command Get-Host",
          { windowsHide: true }
        );
        if (stderr) {
          console.error("PowerShell stderr:", stderr);
        }
        else if (stdout && stdout.includes("ConsoleHost")) {
          checks.powershellAvailable = true;
        }
        resolve();
      } catch (err) {
        console.error("PowerShell check failed:", err.message);
        checks.powershellAvailable = false;
        resolve();
      }
    });

    await powershellCheck;

    // Overall status
    const isReady =
      checks.scriptExists &&
      checks.scriptReadable &&
      checks.baseDirectoryExists &&
      checks.baseDirectoryWritable &&
      checks.powershellAvailable;

    console.log("Script status checks:", checks);

    res.status(200).json({
      message: "Script status check completed",
      data: {
        isReady,
        checks,
        paths: {
          scriptPath,
          baseDirectory,
        },
        recommendations: generateRecommendations(checks),
      },
    });
  } catch (error) {
    console.error("Error checking script status:", error);
    res.status(500).json({
      message: "Failed to check script status",
      error: error.message,
    });
  }
};

// Helper function to generate recommendations
const generateRecommendations = (checks) => {
  const recommendations = [];

  if (!checks.scriptExists) {
    recommendations.push(
      "PowerShell script 'finding.ps1' not found. Please ensure the script is in the utils folder."
    );
  }

  if (!checks.scriptReadable) {
    recommendations.push(
      "PowerShell script is not readable. Please check file permissions."
    );
  }

  if (!checks.baseDirectoryExists) {
    recommendations.push(
      "Base directory does not exist. Please create the directory or check the BASE_DIRECTORY environment variable."
    );
  }

  if (!checks.baseDirectoryWritable) {
    recommendations.push(
      "Base directory is not writable. Please check directory permissions."
    );
  }

  if (!checks.powershellAvailable) {
    recommendations.push(
      "PowerShell is not available or not responding. Please ensure PowerShell is installed and accessible."
    );
  }

  if (!checks.environmentVariables.BASE_DIRECTORY) {
    recommendations.push(
      "BASE_DIRECTORY environment variable is not set. Please check your .env file."
    );
  }

  return recommendations;
};
