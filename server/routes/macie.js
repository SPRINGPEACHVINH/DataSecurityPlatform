import express from "express";
import {
  handleStartMacieScan,
  handleListMacieJobs,
  handleListFindings,
  handleGetFindingDetails,
  handleGetFindingsFilter,
  handleFilterFindings,
} from "../controllers/macieEventController.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";

const router = express.Router();

router.post("/start-scan", handleStartMacieScan);
router.get("/jobs", handleListMacieJobs);
router.get("/findings", handleListFindings);
router.post("/findings/details", handleGetFindingDetails);
router.get("/findings/filters", handleGetFindingsFilter);
router.get("/findings/filter", handleFilterFindings);

export default router;
