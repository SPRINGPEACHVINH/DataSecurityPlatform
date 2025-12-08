import express from "express";
import {
  classifyTextController,
  classifyByStandardController,
  esClassifyController,
  esClassifyByStandardController,
} from "../controllers/mlController.js";

const router = express.Router();

// POST /api/ml/classify
// Classify text với labels
router.post("/classify", classifyTextController);

// POST /api/ml/classify-by-standard
// Classify text theo standard
router.post("/classify-by-standard", classifyByStandardController);

// POST /api/ml/es-classify
// Classify documents từ Elasticsearch
router.post("/es-classify", esClassifyController);

// POST /api/ml/es-classify-by-standard
// Classify documents từ Elasticsearch theo standard
router.post("/es-classify-by-standard", esClassifyByStandardController);

export default router;
