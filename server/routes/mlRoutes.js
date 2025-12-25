import express from "express";
import {
  classifyTextController,
  classifyByStandardController,
  esClassifyController,
  esClassifyByStandardController,
  classifyDocumentById,
  classifyDocumentsBatch,
  classifyAllDocuments,
} from "../controllers/mlController.js";

const router = express.Router();
router.post("/classify", classifyTextController);
router.post("/classify-by-standard", classifyByStandardController);
router.post("/es-classify", esClassifyController);
router.post("/es-classify-by-standard", esClassifyByStandardController);
router.post("/classify-document", classifyDocumentById);
router.post("/classify-documents-batch", classifyDocumentsBatch);
router.post("/classify-all-documents", classifyAllDocuments);

export default router;
