// Handles requests from the dashboard (queries Elasticsearch)
import {
  getOAuth2,
  createOrUpdateCustomClassificationRule,
  RunScan,
  queryScanResult,
  getScanStatus,
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
  findByIdAndUpdateScanRun,
} from "../models/scanModel.js";

import ScanModels from "../models/scanModel.js";
const { ScanRun } = ScanModels;

import userModels from "../models/userModel.js";
const { userHistory } = userModels;

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
      scanRunDbId: newScanRun._id,
      purviewRunId: purviewRunId,
    });

    checkScanStatusRecursive(
      bearerToken,
      dsDocument.dataSourceName,
      sdDocument.scanName,
      purviewRunId,
      classificationName,
      newScanRun._id
    );
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

async function checkScanStatusRecursive(
  bearerToken,
  dataSourceName,
  scanName,
  purviewRunId,
  classificationNameToQuery,
  attempt = 0,
  scanRunDbId,
) {
  const MAX_ATTEMPTS = 5;
  const DELAY_MS = 5 * 60 * 1000; // 5 phút

  if (attempt >= MAX_ATTEMPTS) {
    console.error(
      `Max attempts reached for checking scan status of runId ${purviewRunId}.`
    );
    await findByIdAndUpdateScanRun(purviewRunId, { status: "Timeout" });
    return;
  }

  try {
    console.log(
      `Checking status for Purview runId ${purviewRunId} (DB ID: ${scanRunDbId}), attempt ${
        attempt + 1
      }`
    );
    const statusResponse = await getScanStatus(
      bearerToken,
      dataSourceName,
      scanName,
      purviewRunId
    );

    const scanRunUpdateData = {
      status: statusResponse.status || "Unknown",
      startTime: statusResponse.startTime
        ? new Date(statusResponse.startTime)
        : undefined,
      endTime: statusResponse.endTime
        ? new Date(statusResponse.endTime)
        : undefined,
      assetDiscovered:
        statusResponse.discoveryExecutionDetails?.statistics?.assets
          ?.discovered || 0,
      assetClassified:
        statusResponse.discoveryExecutionDetails?.statistics?.assets
          ?.classified || 0,
    };

    // Chỉ cập nhật nếu có giá trị, tránh ghi đè startTime nếu nó đã được set lúc tạo
    if (scanRunUpdateData.startTime === undefined)
      delete scanRunUpdateData.startTime;

    const updatedScanRun = await findByIdAndUpdateScanRun(
      purviewRunId,
      scanRunUpdateData,
      { new: true }
    );

    if (!updatedScanRun) {
      console.error(
        `ScanRun with run ID ${purviewRunId} not found for update.`
      );
      return;
    }
    console.log(
      `ScanRun ${purviewRunId} (DB ID: ${updatedScanRun._id}) status updated in DB: ${updatedScanRun.status}`
    );

    if (updatedScanRun.status === "Succeeded") {
      const queryResults = await queryScanResult(
        bearerToken,
        classificationNameToQuery
      );
      console.log(
        `Scan ${purviewRunId} completed. Query results obtained for ${classificationNameToQuery}.`
      );
      const names = queryResults?.value?.map((item) => item.name) || [];
      console.log("Extracted names from scan results:", names);

      await ScanRun.findByIdAndUpdate(scanRunDbId, {
        $set: { result: names },
      });
      return true;
    } else if (
      updatedScanRun.status === "Failed" ||
      updatedScanRun.status === "Canceled"
    ) {
      console.error(
        `Scan ${purviewRunId} failed or was canceled. Status: ${updatedScanRun.status}`
      );
      return false;
    } else if (
      updatedScanRun.status === "InProgress" ||
      updatedScanRun.status === "Accepted"
    ) {
      setTimeout(() => {
        checkScanStatusRecursive(
          bearerToken,
          dataSourceName,
          scanName,
          purviewRunId,
          classificationNameToQuery,
          attempt + 1,
          scanRunDbId
        );
      }, DELAY_MS);
    } else {
      console.log(
        `Scan ${purviewRunId} is in status '${updatedScanRun.status}', no further action needed.`
      );
    }
  } catch (error) {
    console.error(
      `Error checking scan status for ${purviewRunId} (attempt ${
        attempt + 1
      }):`,
      error
    );
  }
}
