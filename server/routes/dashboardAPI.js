import express from "express";
import {
  handleDashboardSearch,
  handleDashboardScanResult,
  handleDashboardGetScanStatus,
  handleScriptExecution,
  queryScriptResults,
  checkScriptStatus,
} from "../controllers/dashboardQueryController.js";
import {
  getConnector,
  getDocuments,
  SyncConnectors,
  getSyncStatus,
} from "../services/elasticsearchService.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";

const router = express.Router();

// Public API
router.get("/public", isAuthenticated, (req, res) => {
  res.json({ message: "This is a public API response with authentication." });
});
router.post("/search", isAuthenticated, handleDashboardSearch);
router.post("/scan-result", isAuthenticated, handleDashboardScanResult);
router.get("/scan-status", isAuthenticated, handleDashboardGetScanStatus);
router.post("/script-execution", isAuthenticated, handleScriptExecution);
router.get("/script-status", checkScriptStatus);
router.post("/script-results", isAuthenticated, queryScriptResults);
router.get("/elasticsearch/connector", isAuthenticated, getConnector);
router.get("/elasticsearch/documents", isAuthenticated, getDocuments);
router.post("/elasticsearch/sync-connectors", SyncConnectors);
router.get("/elasticsearch/sync-status", getSyncStatus);

export default router;
