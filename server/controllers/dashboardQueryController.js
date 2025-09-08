// Handles requests from the dashboard (queries Elasticsearch)
import userModels from "../models/userModel.js";
const { userHistory } = userModels;

import powershell from "powershell";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

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
    // Create a promise to handle the asynchronous PowerShell execution
    const scriptExecution = new Promise((resolve, reject) => {
      const results = [];
      const errors = [];

      const ps = new powershell(
        `powershell.exe -File .\\utils\\finding.ps1 -Function Find-SensitiveData -SharePath "${sharePath}" -keyword "${keyword}"`
      );

      ps.on("output", (data) => {
        console.log("PowerShell output:", data);
        results.push(data);
      });

      ps.on("error-output", (data) => {
        console.error("PowerShell error:", data);
        errors.push(data);
      });

      ps.on("end", (code) => {
        const allOutput = results.concat(errors).join("\n");
        if (
          code !== 0 ||
          allOutput.includes("not found") ||
          allOutput.match(/SharePath '.*' not found/i)
        ) {
          reject({ message: allOutput, code });
        } else {
          resolve({ results, code });
        }
      });

      ps.on("error", (err) => {
        reject({ error: err, code: -1 });
      });
    });

    // Wait for the PowerShell script to complete
    const { results, code } = await scriptExecution;

    const resultsString = results.join("\n");

    const baseOutputFile = resultsString.match(
      /adding to (.*FilePaths-ALL--.*\.csv)/
    )?.[1];
    const defaultOutputFile = resultsString.match(
      /to the results to (.*FilePaths--.*\.csv)/
    )?.[1];
    const searchStarted = resultsString.match(
      /Search started for pattern '.*'/
    )?.[0];
    const searchComplete = resultsString.match(/Search complete/)?.[0];
    const outputFile = resultsString.match(/Wrote to (.*\.txt)/)?.[1];

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

    filePath =
      outputFile ||
      path.join(
        __dirname,
        "../utils/Result/PotentialData-CustomKeyword--daoxu.txt"
      );

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

    if (!fileRowsMap) {
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
    const powershellCheck = new Promise((resolve) => {
      const ps = new powershell("Get-Host");

      ps.on("output", (data) => {
        if (data) {
          checks.powershellAvailable = true;
        }
      });

      ps.on("end", () => {
        resolve();
      });

      ps.on("error", () => {
        checks.powershellAvailable = false;
        resolve();
      });

      setTimeout(() => {
        checks.powershellAvailable = false;
        resolve();
      }, 5000);
    });

    await powershellCheck;

    // Overall status
    const isReady =
      checks.scriptExists &&
      checks.scriptReadable &&
      checks.baseDirectoryExists &&
      checks.baseDirectoryWritable &&
      checks.powershellAvailable;

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
