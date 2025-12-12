import express from "express";
import {
  classifyTextController,
  classifyByStandardController,
  esClassifyController,
  esClassifyByStandardController,
  // classifyDocumentById,
  // classifyDocumentsBatch,
  // classifyAllDocuments,
} from "../controllers/mlController.js";

const router = express.Router();

// POST /api/ml/classify
router.post("/classify", classifyTextController);

// POST /api/ml/classify-by-standard
router.post("/classify-by-standard", classifyByStandardController);

// POST /api/ml/es-classify
router.post("/es-classify", esClassifyController);

// POST /api/ml/es-classify-by-standard
router.post("/es-classify-by-standard", esClassifyByStandardController);

// // POST /api/ml/classify-document
// // Classify single document by ID
// router.post("/classify-document", classifyDocumentById);

// // POST /api/ml/classify-documents-batch
// // Classify multiple documents by IDs
// router.post("/classify-documents-batch", classifyDocumentsBatch);

// // POST /api/ml/classify-all-documents
// // Classify all documents in index
// router.post("/classify-all-documents", classifyAllDocuments);

export default router;
