import express from "express";
import {
  handleStartMacieScan,
  handleListMacieJobs,
  handleListFindings,
  handleGetFindingDetails,
  handleGetFindingsFilter,
  handleFilterFindings,
  getFindingsBySensitiveType,
} from "../controllers/macieEventController.js";

const router = express.Router();

router.post("/start-scan", handleStartMacieScan);
router.get("/jobs", handleListMacieJobs);
router.get("/findings", handleListFindings);
router.post("/findings/details", handleGetFindingDetails);
router.get("/findings/filters", handleGetFindingsFilter);
router.get("/findings/filter", handleFilterFindings);
router.get("/findings/types", getFindingsBySensitiveType);

export default router;
