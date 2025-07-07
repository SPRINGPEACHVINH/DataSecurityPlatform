import express from "express";
import { fetchAccessLogs } from "../controllers/awsAccessLogsControllers.js";

const router = express.Router();

router.get("/access-logs", fetchAccessLogs);

export default router;
