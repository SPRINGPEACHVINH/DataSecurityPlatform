// Handles requests from the dashboard (queries Elasticsearch)
import {
  getOAuth2,
  createOrUpdateCustomClassificationRule,
  RunScan,
  queryScanResult,
  getDataSourceName,
  getScanName,
} from "../services/purviewDataTransfer.js";

import {
  findDataSourceByOwner,
  createDataSource,
} from "../models/dataSourceModel.js";

import {
  findScanDefinitionByName,
  createScanDefinition,
  createScanRun,
} from "../models/scanModel.js";

import userModels from "../models/userModel.js";
const { userHistory } = userModels;

import powershell from "powershell";
import fs from "fs";
import path from "path";

const handleDsDocument = async (userId, bearerToken) => {
  // Try to find existing DataSource by owner
  let dsDocument = await findDataSourceByOwner(userId);
  if (dsDocument == null || dsDocument.length === 0) {
    console.log(
      `No DataSource found for user ${userId} in local DB, checking Purview...`
    );
    // Fetch DataSource info from Purview if not found locally
    const purviewAPIResponse = await getDataSourceName(bearerToken);
    if (!purviewAPIResponse?.value?.length) {
      throw new Error("No DataSource found in Purview for this user.");
    }
    const purviewDSData = purviewAPIResponse.value[0];
    const dataSourceName = purviewDSData.name;
    const dataSourceType = purviewDSData.kind;
    console.log(
      `Purview DataSource found: ${dataSourceName} (${dataSourceType})`
    );

    dsDocument = await createDataSource({
      dataSourceName: dataSourceName,
      dataSourceType: dataSourceType,
      userId: userId,
    });
    console.log(
      `New DataSource '${dataSourceName}' created in local DB from Purview data.`
    );
  } else {
    // If found, ensure it has the correct dataSourceName
    dsDocument = dsDocument[0]; // Assuming findDataSourceByOwner returns an array
    if (!dsDocument.dataSourceName) {
      throw new Error(
        `DataSource for user ${userId} does not have a valid dataSourceName.`
      );
    }
    console.log(
      `Using existing DataSource '${dsDocument.dataSourceName}' for user ${userId}.`
    );
  }
  return dsDocument;
};

const handleSdDocument = async ({
  scanName,
  dsDocument,
  classificationName,
  bearerToken,
}) => {
  let sdDocument = await findScanDefinitionByName(scanName, dsDocument._id);
  if (!sdDocument) {
    const purviewScanData = await getScanName(
      bearerToken,
      dsDocument.dataSourceName
    );
    if (!purviewScanData?.value?.length) {
      throw new Error(
        `No scans found for DataSource '${dsDocument.dataSourceName}' in Purview.`
      );
    }
    const scanInfo = purviewScanData.value[0];
    console.log(`Purview Scan found: ${scanInfo.name}`);
    console.log(
      `dataSource: ${dsDocument._id}, classificationName: ${classificationName}`
    );
    sdDocument = await createScanDefinition({
      scanName: scanInfo.name,
      dataSourceId: dsDocument._id,
      classificationName: classificationName,
    });
    console.log(
      `New ScanDefinition '${scanInfo.name}' created in local DB from Purview data.`
    );
  } else {
    if (sdDocument.classificationName !== classificationName) {
      console.log(
        `Using user-provided classificationName '${classificationName}' for this run, existing default is '${sdDocument.classificationName}'.`
      );
    }
  }
  return sdDocument;
};

export const handleDashboardSearch = async (req, res) => {
  const { keyword, ruleName, classificationName, scanLevel } = req.body;
  const userId = req.session.userId;

  const missingFields = [];
  if (!keyword) missingFields.push("keyword");
  if (!ruleName) missingFields.push("ruleName");
  if (!classificationName) missingFields.push("classificationName");

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  try {
    const bearerToken = await getOAuth2();

    // --- Xử lý DataSource ---
    let dsDocument = await handleDsDocument(userId, bearerToken);
    if (!dsDocument) {
      return res.status(404).json({
        message: "No DataSource found for this user in Purview.",
      });
    }

    console.log(
      `Using DataSource '${dsDocument.dataSourceName}' for user ${userId}, dsDocument_.id: ${dsDocument._id}.`
    );

    // --- Xử lý ScanDefinition ---
    let sdDocument = await handleSdDocument({
      scanName: null,
      dsDocument: dsDocument,
      classificationName: classificationName,
      bearerToken: bearerToken,
    });

    // Lưu lịch sử tìm kiếm
    await userHistory.findOneAndUpdate(
      { userId, keyword, ruleName, classificationName },
      { $set: { lastUsedAt: new Date() } },
      { upsert: true, new: true }
    );
    console.log("Search history saved/updated.");

    // Tiếp tục luồng hiện tại
    await createOrUpdateCustomClassificationRule(
      bearerToken,
      ruleName,
      keyword,
      classificationName
    );

    const runScanResponse = await RunScan(
      bearerToken,
      dsDocument.dataSourceName,
      sdDocument.scanName,
      scanLevel
    );

    // Extract the runId from the correct location in the response
    let purviewRunId = runScanResponse?.data?.id || runScanResponse?.id || null;
    if (!purviewRunId) {
      throw new Error("Could not extract runId from runScanResponse.");
    }

    const newScanRun = await createScanRun({
      runId: purviewRunId,
      scanDefinition: sdDocument._id,
      scanLevel: scanLevel || "Full",
      status: "Queued",
      startTime: new Date(),
    });

    res.status(202).json({
      message: "Search and scan process initiated. Status will be updated.",
      data: {
        bearerToken: bearerToken,
        dataSourceName: dsDocument.dataSourceName,
        scanName: sdDocument.scanName,
        purviewRunId: purviewRunId,
        classificationName: classificationName,
        scanRunDbId: newScanRun._id,
      },
    });

    // checkScanStatusRecursive(
    //   bearerToken,
    //   dsDocument.dataSourceName,
    //   sdDocument.scanName,
    //   purviewRunId,
    //   classificationName,
    //   0,
    //   newScanRun._id
    // );
  } catch (error) {
    console.error(
      "Error in handleDashboardSearch:",
      error.message,
      error.stack
    );
    res.status(500).json({
      message: error.message || "An error occurred during the search process.",
    });
  }
};

export const handleDashboardScanResult = async (req, res) => {
  const { bearerToken, classificationName } = req.body;

  const missingFields = [];
  if (!classificationName) missingFields.push("classificationName");
  if (!bearerToken) missingFields.push("bearerToken");
  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  try {
    const response = await queryScanResult(bearerToken, classificationName);
    const names = response?.value?.map((item) => item.name) || [];
    console.log("Extracted names from scan results:", names);

    res.status(200).json({
      message: "Scan status check initiated successfully.",
      data: names,
    });
  } catch (error) {
    console.error("Error in handleDashboardScanResult:", error.message);
    res.status(500).json({
      message: error.message || "An error occurred while checking scan status.",
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
