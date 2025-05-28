// Handles incoming events/calls from Microsoft Purview
import {
  getOAuth2,
  createOrUpdateCustomClassificationRule,
  RunScan,
} from "../services/purviewDataTransfer.js";

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
    const { ruleName, keyword, classificationName, description } = req.body;

    const missingFields = [];
    if (!ruleName) missingFields.push("ruleName");
    if (!keyword) missingFields.push("keyword");
    if (!classificationName) missingFields.push("classificationName");

    if (missingFields.length > 0) {
      return res
        .status(400)
        .json({
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
    }

    const bearerToken = await getOAuth2();

    const result = await createOrUpdateCustomClassificationRule(
      bearerToken,
      ruleName,
      keyword,
      classificationName,
      description
    );
    res
      .status(201)
      .json({
        message: "Classification rule processed successfully.",
        data: result,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        message: error.message || "Failed to process classification rule.",
      });
  }
};

export const handleRunScan = async (req, res) => {
  try {
    const { dataSourceName, scanName, scanLevel } = req.body;
    
    const missingFields = [];
    if (!dataSourceName) missingFields.push("dataSourceName");
    if (!scanName) missingFields.push("scanName");

    if (missingFields.length > 0) {
      return res
        .status(400)
        .json({
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
    }

    const bearerToken = await getOAuth2();

    const result = await RunScan(
      bearerToken,
      dataSourceName,
      scanName,
      scanLevel
    );
    res
      .status(202)
      .json({ message: "Scan initiated successfully.", data: result });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to run scan" });
  }
};
