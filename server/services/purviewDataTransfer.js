// Data transfer service for Purview
import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";
import { generateTimeBasedRunScanID } from "../utils/index.js";
dotenv.config();

const {
  PURVIEW_CLIENT_ID,
  PURVIEW_CLIENT_SECRET,
  PURVIEW_TENANT_ID,
  PURVIEW_ENDPOINT,
  api_version = "2023-09-01",
} = process.env;

/**
@param {string} bearerToken
@param {string} classificationRuleName
@param {string} keywordInput
@param {string} classificationName
@param {string} [description]
@param {string} dataSourceName
@param {string} scanName
@param {string} [scanLevel]
@returns {Promise<object>}
*/

async function getOAuth2TokenInternal() {
  const url = `https://login.microsoftonline.com/${PURVIEW_TENANT_ID}/oauth2/v2.0/token`;

  const response = await axios.post(
    url,
    qs.stringify({
      client_id: PURVIEW_CLIENT_ID,
      client_secret: PURVIEW_CLIENT_SECRET,
      scope: "https://purview.azure.net/.default",
      grant_type: "client_credentials",
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  return response.data.access_token;
}

export async function getOAuth2() {
  try {
    const token = await getOAuth2TokenInternal();
    return token;
  } catch (error) {
    console.error(
      "Error getting OAuth2 token:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Failed to get OAuth2 token");
  }
}

export async function createOrUpdateCustomClassificationRule(
  bearerToken,
  classificationRuleName,
  keywordInput,
  classificationName,
  description = `Rule to find keyword '${keywordInput}'`
) {
  try {
    if (!bearerToken) {
      throw new Error("OAuth2 bearer token is required for Purview API.");
    }

    const apiUrl = `${PURVIEW_ENDPOINT}/scan/classificationrules/${classificationRuleName}?api-version=${api_version}`;

    const requestBody = {
      kind: "Custom",
      properties: {
        description: description,
        classificationName: classificationName,
        columnPatterns: [],
        dataPatterns: [
          {
            pattern: keywordInput,
            kind: "Regex",
          },
        ],
        minimumPercentageMatch: 60,
        ruleStatus: "Enabled",
      },
    };

    const response = await axios.put(apiUrl, requestBody, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(
      `Successfully created/updated classification rule: ${classificationRuleName}`
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error creating/updating classification rule '${classificationRuleName}':`,
      error.response ? error.response.data : error.message
    );

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
    }
    throw new Error(
      `Failed to create/update classification rule '${classificationRuleName}'.`
    );
  }
}

export async function createNewScanRulesets() {}

export async function createNewScan() {}

export async function RunScan(
  bearerToken,
  dataSourceName,
  scanName,
  scanLevel = "Full"
) {
  try {
    if (!bearerToken) {
      throw new Error("OAuth2 bearer token is required for Purview API.");
    }

    const runId = generateTimeBasedRunScanID();

    const apiUrl = `${PURVIEW_ENDPOINT}/scan/datasources/${dataSourceName}/scans/${scanName}:run?runId=${runId}&scanLevel=${scanLevel}&api-version=${api_version}`;

    const requestBody = {};

    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(
      `Successfully triggered scan '${scanName}' for data source '${dataSourceName}' with runId '${runId}'. Response status: ${response.status}`
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error running scan '${scanName}' for data source '${dataSourceName}':`,
      error.response
        ? JSON.stringify(error.response.data, null, 2)
        : error.message
    );
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
    }
    throw new Error(
      `Failed to run scan '${scanName}' for data source '${dataSourceName}'.`
    );
  }
}

export async function queryScanResult(bearerToken, classificationName) {
  try {
    if (!bearerToken) {
      throw new Error("OAuth2 bearer token is required for Purview API.");
    }
    if (!classificationName) {
      throw new Error("classificationName is required to query scan results.");
    }

    const apiUrl = `${PURVIEW_ENDPOINT}/datamap/api/search/query?api-version=${api_version}`;

    const requestBody = {
      keywords: null,
      filter: {
        classification: classificationName,
        includeSubClassifications: true,
      },
    };

    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(
      `Successfully queried Purview for classification '${classificationName}'.`
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error querying Purview for classification '${classificationName}':`,
      error.response
        ? JSON.stringify(error.response.data, null, 2)
        : error.message
    );
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
    }
    throw new Error(
      `Failed to query Purview for classification '${classificationName}'.`
    );
  }
}

