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
  getConnector,
  SyncConnectors,
  getSyncStatus
} from "../services/elasticsearchService/connector.js";
import {
  SearchKeyword,
  SearchRegexPattern
} from "../services/elasticsearchService/search.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";
import { getOverviewData } from "../controllers/overviewController.js";
import { scanCloudMisconfig } from "../controllers/misconfigController.js"

const router = express.Router();

// Public API
router.get("/public", isAuthenticated, (req, res) => {
  res.json({ message: "This is a public API response with authentication." });
});
router.post("/search", handleDashboardSearch);
router.post("/script-execution", isAuthenticated, handleScriptExecution);
router.get("/script-status", checkScriptStatus);
router.post("/script-results", isAuthenticated, queryScriptResults);
router.post("/elasticsearch/createconnector", isAuthenticated, createConnector);
router.get("/elasticsearch/connector", isAuthenticated, getConnector);
router.get("/elasticsearch/documents", isAuthenticated, getDocuments);
router.post("/elasticsearch/sync-connectors", isAuthenticated, SyncConnectors);
router.get("/elasticsearch/sync-status", isAuthenticated, getSyncStatus);
router.post("/elasticsearch/delete-file-content", isAuthenticated, deleteFileContent);
// router.post("/elasticsearch/search-keyword", isAuthenticated, SearchKeyword);
// router.post("/elasticsearch/search-pattern", isAuthenticated, SearchRegexPattern);
router.get("/overview/data", isAuthenticated, getOverviewData);
router.post("/misconfig/scan", isAuthenticated, scanCloudMisconfig);

export default router;
