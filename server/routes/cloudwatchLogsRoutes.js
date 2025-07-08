import express from "express";
import { fetchCloudLogs } from "../controllers/cloudwatchLogsController.js";

const router = express.Router();

router.get("/cloudwatch/logs", fetchCloudLogs);

export default router;
