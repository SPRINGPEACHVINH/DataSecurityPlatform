import express from "express";
import {
  handleStartMacieScan,
  handleListMacieJobs,
  handleListFindings,
  handleGetFindingDetails,
  handleGetFindingsFilter,
  handleFilterFindings,
  getFindingsBySensitiveType,
  handleGetFindingStats
} from "../controllers/macieEventController.js";

const router = express.Router();

router.post("/start-scan", handleStartMacieScan);
router.get("/jobs", handleListMacieJobs);
router.get("/findings", handleListFindings);
router.post("/findings/details", handleGetFindingDetails);
router.get("/findings/filters", handleGetFindingsFilter);
router.get("/findings/filter", handleFilterFindings);
router.get("/findings/types", getFindingsBySensitiveType);
router.get("/findings/stats", handleGetFindingStats);


export default router;
