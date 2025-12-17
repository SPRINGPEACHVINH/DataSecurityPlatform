import express from "express";
import {
  handleDashboardSearch,
  handleScriptExecution,
  queryScriptResults,
  checkScriptStatus,
} from "../controllers/dashboardQueryController.js";
import {
  getDocuments,
  deleteFileContent
} from "../services/elasticsearchService/document.js";
import {
  createConnector,
  updateConnectorConfig,
  getConnector,
  SyncConnectors,
  syncConnectorData,
  getSyncStatus,
  deleteConnector
} from "../services/elasticsearchService/connector.js";
import {
  SearchKeyword,
  SearchRegexPattern
} from "../services/elasticsearchService/search.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";
import { getOverviewData } from "../controllers/overviewController.js";
import {
  scanCloudMisconfig,
  checkKeysExist,
  generateUserKeys
} from "../controllers/misconfigController.js"

const router = express.Router();

// Public API
router.get("/public", isAuthenticated, (req, res) => {
  res.json({ message: "This is a public API response with authentication." });
});
router.post("/search", handleDashboardSearch);
router.post("/script-execution", isAuthenticated, handleScriptExecution);
router.get("/script-status", checkScriptStatus);
router.post("/script-results", isAuthenticated, queryScriptResults);

// Elasticsearch API
// Elasticsearch Connector APIs
router.post("/elasticsearch/createconnector", isAuthenticated, createConnector);
router.get("/elasticsearch/connector", isAuthenticated, getConnector);
router.post("/elasticsearch/connector_configuration", isAuthenticated, updateConnectorConfig);
router.get("/elasticsearch/connector/sync", isAuthenticated, syncConnectorData);
router.post("/elasticsearch/sync-connectors", isAuthenticated, SyncConnectors);
router.delete("/elasticsearch/delete_connector", isAuthenticated, deleteConnector);
// Elasticsearch Document APIs
router.get("/elasticsearch/documents", isAuthenticated, getDocuments);
router.get("/elasticsearch/sync-status", isAuthenticated, getSyncStatus);
router.post("/elasticsearch/delete-file-content", isAuthenticated, deleteFileContent);
// router.post("/elasticsearch/search-keyword", isAuthenticated, SearchKeyword);
// router.post("/elasticsearch/search-pattern", isAuthenticated, SearchRegexPattern);

// Overview API
router.get("/overview/data", isAuthenticated, getOverviewData);
// Misconfiguration API
router.post("/misconfig/scan", isAuthenticated, scanCloudMisconfig);
router.get("/misconfig/check_keys", isAuthenticated, checkKeysExist);
router.post("/misconfig/generate_keys", isAuthenticated, generateUserKeys);

export default router;
