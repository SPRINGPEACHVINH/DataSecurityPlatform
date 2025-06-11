import express from "express";
import { handleDashboardSearch, handleDashboardScanResult, handleScriptExecution } from "../controllers/dashboardQueryController.js";
import { getConnector, getDocuments } from "../services/elasticsearchService.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";

const router = express.Router();

// Public API
router.get("/public", isAuthenticated, (req, res) => {
  res.json({ message: "This is a public API response with authentication." });
});
router.post("/search", isAuthenticated, handleDashboardSearch);
router.post("/scan-result", isAuthenticated, handleDashboardScanResult);
router.post("/script-execution", handleScriptExecution);
router.get("/elasticsearch/connector", getConnector);
router.get("/elasticsearch/documents", getDocuments);

export default router;
