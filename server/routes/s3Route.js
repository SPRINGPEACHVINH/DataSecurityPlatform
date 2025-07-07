import express from "express";
import { getS3Data } from "../controllers/s3Controller.js";

const router = express.Router();

router.get("/data", getS3Data);

export default router;
