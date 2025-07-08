import express from "express";
import { getOverviewData } from "../controllers/overviewController.js";

const router = express.Router();

router.get("/data", getOverviewData);

export default router;
