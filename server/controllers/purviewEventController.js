// Handles incoming events/calls from Microsoft Purview
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
  findByIdAndUpdateScanRun,
  findScanRunById,
} from "../models/scanModel.js";

import { APIResponse } from "../utils/APIResponse.js";

export const getOAuth2Token = async (req, res) => {
  try {
    const token = await getOAuth2();
    res.status(200).json({ Purview_accessToken: token });
  } catch (error) {
    console.error("Error getting OAuth2 token:", error);
    res.status(500).json({ message: "Failed to get OAuth2 token" });
  }
};

export const handleCreateRule = async (req, res) => {
  try {
    const { bearerToken, ruleName, keyword, classificationName, description } =
      req.body;

    const missingFields = [];
    if (!bearerToken) missingFields.push("bearerToken");
    if (!ruleName) missingFields.push("ruleName");
    if (!keyword) missingFields.push("keyword");
    if (!classificationName) missingFields.push("classificationName");

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // const result = await createOrUpdateCustomClassificationRule(
    //   bearerToken,
    //   ruleName,
    //   keyword,
    //   classificationName,
    //   description
    // );
    const result = APIResponse.createRule;

    res.status(201).json({
      message: "Classification rule processed successfully.",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to process classification rule.",
    });
  }
};

export const handleRunScan = async (req, res) => {
  try {
    const { bearerToken, dataSourceName, scanName, scanLevel } = req.body;

    const missingFields = [];
    if (!dataSourceName) missingFields.push("dataSourceName");
    if (!scanName) missingFields.push("scanName");
    if (!bearerToken) missingFields.push("bearerToken");

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // const result = await RunScan(
    //   bearerToken,
    //   dataSourceName,
    //   scanName,
    //   scanLevel
    // );

    const result = APIResponse.RunScan;

    res
      .status(202)
      .json({ message: "Scan initiated successfully.", data: result });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to run scan" });
  }
};

export const handleQueryScanResult = async (req, res) => {
  try {
    const { bearerToken, classificationName } = req.body;

    const missingFields = [];
    if (!classificationName) missingFields.push("classificationName");
    if (!bearerToken) missingFields.push("bearerToken");
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // const result = await queryScanResult(bearerToken, classificationName);
    const result = APIResponse.queryScanResult;

    res.status(200).json({
      message: "Scan result queried successfully.",
      data: result,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to query scan result" });
  }
};

export const handleGetScanStatus = async (req, res) => {
  try {
    const { bearerToken, dataSourceName, scanName, runId } = req.body;

    const missingFields = [];
    if (!bearerToken) missingFields.push("bearerToken");
    if (!dataSourceName) missingFields.push("dataSourceName");
    if (!scanName) missingFields.push("scanName");
    if (!runId) missingFields.push("runId");

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // const result = await getScanStatus(
    //   bearerToken,
    //   dataSourceName,
    //   scanName,
    //   runId
    // );
    const result = APIResponse.ScanStatus;
    const scanRunUpdateData = {
      status: result.status || "Unknown",
      startTime: result.startTime ? new Date(result.startTime) : undefined,
      endTime: result.endTime ? new Date(result.endTime) : undefined,
      assetDiscovered:
        result.discoveryExecutionDetails?.statistics?.assets?.discovered || 0,
      assetClassified:
        result.discoveryExecutionDetails?.statistics?.assets?.classified || 0,
    };

    // Only update if there's a value, avoid overwriting startTime if it was already set during creation
    if (scanRunUpdateData.startTime === undefined)
      delete scanRunUpdateData.startTime;

    const updatedScanRun = await findByIdAndUpdateScanRun(
      runId,
      scanRunUpdateData,
      { new: true }
    );

    if (!updatedScanRun) {
      console.error(`ScanRun with run ID ${runId} not found for update.`);
      return;
    }
    console.log(
      `ScanRun ${runId} (DB ID: ${updatedScanRun._id}) status updated in DB: ${updatedScanRun.status}`
    );

    if (result.status == "Succeeded") {
    }

    res.status(200).json({
      message: "Scan status retrieved successfully.",
      data: result.status,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to get scan status" });
  }
};

export const handleGetDataSourceName = async (req, res) => {
  try {
    const { bearerToken } = req.body;
    console.log("handleGetDataSourceName\n");
    if (!bearerToken) {
      return res.status(400).json({
        message: "Bearer token is required to get data source names",
      });
    }

    //const result = await getDataSourceName(bearerToken);
    const result = APIResponse.DataSourceName;

    let names = [];
    if (result && Array.isArray(result.value)) {
      names = result.value.map((item) => item.name);
    }

    res.status(200).json({ names });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to get data source name" });
  }
};

export const handleGetScanName = async (req, res) => {
  try {
    const { bearerToken, dataSourceName } = req.body;

    if (!bearerToken) {
      return res.status(400).json({
        message: "Bearer token is required to get scan names",
      });
    }
    if (!dataSourceName) {
      return res.status(400).json({
        message: "Missing required field: dataSourceName",
      });
    }

    //const result = await getScanName(bearerToken, dataSourceName);

    const result = APIResponse.ScanName;

    let names = [];
    if (result && Array.isArray(result.value)) {
      names = result.value.map((item) => item.name);
    }

    res.status(200).json({ names });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to get scan names" });
  }
};
