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
const { Connector } = Models;
import { exec } from "child_process";
import { promisify } from "util";
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