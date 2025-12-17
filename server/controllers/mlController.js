import {
  classifyText,
  classifyByStandard,
  esClassify,
  esClassifyByStandard,
} from "../services/pythonModelService.js";
import {
  utilityGetDocumentContent,
  utilityGetMultipleDocumentsContent,
  utilityGetAllDocumentsFromIndex,
  utilityTagDocumentWithLabels,
  utilityTagDocumentsWithLabels,
} from "../services/elasticsearchService/document.js";

/**
 * POST /api/ml/classify
 * Classify text với labels
 */
export const classifyTextController = async (req, res) => {
  try {
    const { text, labels } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const result = await classifyText(text, labels);
    return res.json(result);
  } catch (error) {
    console.error("Classify error:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/ml/classify-by-standard
 * Classify text theo standard (PCI_DSS, HIPAA, GDPR, ...)
 */
export const classifyByStandardController = async (req, res) => {
  try {
    const { text, standard } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const result = await classifyByStandard(text, standard);
    return res.json(result);
  } catch (error) {
    console.error("Classify by standard error:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/ml/es-classify
 * Classify documents từ Elasticsearch
 */
export const esClassifyController = async (req, res) => {
  try {
    const {
      index,
      query,
      size = 100,
      textField = "content",
      labels,
      updateIndex = false,
    } = req.body;

    if (!index) {
      return res.status(400).json({ error: "Index is required" });
    }

    const result = await esClassify({
      index,
      query,
      size,
      textField,
      labels,
      updateIndex,
    });

    return res.json(result);
  } catch (error) {
    console.error("ES classify error:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/ml/es-classify-by-standard
 * Classify documents từ Elasticsearch theo standard
 */
export const esClassifyByStandardController = async (req, res) => {
  try {
    const {
      index,
      query,
      size = 100,
      textField = "content",
      standard,
      updateIndex = false,
    } = req.body;

    if (!index) {
      return res.status(400).json({ error: "Index is required" });
    }

    const result = await esClassifyByStandard({
      index,
      query,
      size,
      textField,
      standard,
      updateIndex,
    });


    return res.json(result);
  } catch (error) {
    console.error("ES classify by standard error:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/ml/classify-document
 * Classify single document by ID from Elasticsearch
 */
export const classifyDocumentById = async (req, res) => {
  try {
    const { index_name, document_id, standard = null, tag = true } = req.body;

    // Validate
    if (!index_name || !document_id) {
      return res.status(400).json({
        error: "Missing required parameters: index_name and document_id are required",
      });
    }

    console.log(`[ML] Classifying document ${document_id} from index ${index_name}`);

    // Get document content
    const docContent = await utilityGetDocumentContent(index_name, document_id);

    if (!docContent || !docContent.content) {
      return res.status(404).json({
        error: `Document ${document_id} not found or has no content`,
      });
    }

    console.log(`[ML] Document content length: ${docContent.content.length}`);

    // Classify
    let classificationResult;
    if (standard) {
      console.log(`[ML] Classifying by standard: ${standard}`);
      classificationResult = await classifyByStandard(docContent.content, standard);
    } else {
      console.log(`[ML] Classifying without standard`);
      classificationResult = await classifyText(docContent.content);
    }

    const predictions = extractPredictionsFromClassification(classificationResult);
    const labels = predictions.map(p => ({
      label: p.label,
      score: p.score,
      confidence: `${Math.round(p.score * 100)}%`,
    }));

    // Tag document if enabled and has high-confidence predictions
    let taggingResult = null;
    if (tag) {
      try {
        taggingResult = await utilityTagDocumentWithLabels(index_name, document_id, predictions);
      } catch (tagError) {
        console.warn(`[ML] Tagging failed (non-critical):`, tagError.message);
        taggingResult = {
          status: "failed",
          error: tagError.message,
        };
      }
    }

    return res.json({
      message: "Document classified successfully",
      data: {
        document_id,
        index_name,
        content_length: docContent.content.length,
        source_file: docContent.file_name || docContent.name || "unknown",
        classification: classificationResult,
        labels,
        tagging: taggingResult,
      },
    });
  } catch (error) {
    console.error("[ML] Error in classifyDocumentById:", error);
    return res.status(500).json({
      error: error.message || "Failed to classify document",
    });
  }
};

/**
 * POST /api/ml/classify-documents-batch
 * Classify multiple documents by IDs from Elasticsearch
 */
export const classifyDocumentsBatch = async (req, res) => {
  try {
    const { index_name, document_ids, standard = null } = req.body;

    // Validate
    if (!index_name || !document_ids || !Array.isArray(document_ids)) {
      return res.status(400).json({
        error: "Missing required parameters: index_name and document_ids (array) are required",
      });
    }

    if (document_ids.length === 0) {
      return res.status(400).json({
        error: "document_ids array cannot be empty",
      });
    }

    console.log(`[ML] Batch classifying ${document_ids.length} documents from index ${index_name}`);

    const classificationResults = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each document
    for (const docId of document_ids) {
      try {
        console.log(`[ML] Fetching content for document ${docId}...`);
        
        // Get document content with fallback fields
        const docData = await utilityGetDocumentContent(index_name, docId);
        
        if (!docData || !docData.content) {
          console.warn(`[ML] Document ${docId} has no content, skipping...`);
          classificationResults.push({
            document_id: docId,
            status: "skipped",
            error: "No content found",
          });
          failureCount++;
          continue;
        }

        console.log(`[ML] Classifying document ${docId}...`);
        let classifyResponse;

        if (standard) {
          classifyResponse = await classifyByStandard(docData.content, standard);
        } else {
          classifyResponse = await classifyText(docData.content);
        }

        const predictions = extractPredictionsFromClassification(classifyResponse);

        classificationResults.push({
          document_id: docId,
          status: "success",
          content_length: docData.content.length,
          source_file: docData.file_name || docData.name || "unknown",
          classification: classifyResponse,
          labels: predictions,
        });

        successCount++;
        console.log(`[ML] Document ${docId} classified successfully`);
      } catch (error) {
        console.error(`[ML] Failed to classify document ${docId}:`, error.message);
        classificationResults.push({
          document_id: docId,
          status: "failed",
          error: error.message,
        });
        failureCount++;
      }
    }

    return res.json({
      message: "Batch classification completed",
      data: {
        summary: {
          total_requested: document_ids.length,
          successful: successCount,
          failed: failureCount,
          index_name,
          standard: standard || "none",
        },
        results: classificationResults,
      },
    });
  } catch (error) {
    console.error("[ML] Error in classifyDocumentsBatch:", error);
    return res.status(500).json({
      error: error.message || "Failed to process batch classification",
    });
  }
};

/**
 * POST /api/ml/classify-all-documents
 * Classify all documents in an index
 */
export const classifyAllDocuments = async (req, res) => {
  try {
    const { index_name, standard = null, size = 100 } = req.body;

    // Validate
    if (!index_name) {
      return res.status(400).json({
        error: "Missing required parameter: index_name is required",
      });
    }

    console.log(`[ML] Classifying all documents from index ${index_name}`);

    // Get all documents from index
    const { total, documents } = await utilityGetAllDocumentsFromIndex(index_name, size);

    console.log(`[ML] Found ${documents.length} documents to classify`);

    const classificationResults = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each document
    for (const doc of documents) {
      try {
        const docId = doc._id;
        const docSource = doc._source;

        if (!docSource) {
          console.warn(`[ML] Document ${docId} has no source, skipping...`);
          failureCount++;
          continue;
        }

        // Extract content with fallback fields
        const content = docSource.content || docSource.file_content || docSource.text || 
                       docSource.data || docSource.body || docSource.message;

        if (!content) {
          console.warn(`[ML] Document ${docId} has no content field, skipping...`);
          failureCount++;
          continue;
        }

        console.log(`[ML] Classifying document ${docId}...`);
        let classifyResponse;

        if (standard) {
          classifyResponse = await classifyByStandard(content, standard);
        } else {
          classifyResponse = await classifyText(content);
        }

        const predictions = extractPredictionsFromClassification(classifyResponse);

        classificationResults.push({
          document_id: docId,
          status: "success",
          content_length: content.length,
          source_file: docSource.file_name || docSource.name || "unknown",
          classification: classifyResponse,
          labels: predictions,
        });

        successCount++;
      } catch (error) {
        console.error(`[ML] Failed to classify document ${doc._id}:`, error.message);
        failureCount++;
      }
    }

    return res.json({
      message: "All documents classified",
      data: {
        summary: {
          total_in_index: total,
          total_processed: documents.length,
          successful: successCount,
          failed: failureCount,
          index_name,
          standard: standard || "none",
        },
        results: classificationResults,
      },
    });
  } catch (error) {
    console.error("[ML] Error in classifyAllDocuments:", error);
    return res.status(500).json({
      error: error.message || "Failed to classify all documents",
    });
  }
};

/**
 * Helper: Extract labels từ classification response
 */
const extractLabelsFromClassification = (classification) => {
  const labels = [];

  if (!classification) return [{ label: "unclassified" }];

  // Format 1: { "predictions": [...] }
  if (classification.predictions && Array.isArray(classification.predictions)) {
    classification.predictions.forEach((pred) => {
      if (pred.label) {
        labels.push({
          label: pred.label,
          score: pred.score || 0,
          confidence: `${Math.round((pred.score || 0) * 100)}%`,
        });
      }
    });
  }
  // Format 2: { "labels": [...] }
  else if (classification.labels && Array.isArray(classification.labels)) {
    classification.labels.forEach((label) => {
      labels.push({
        label,
        score: 1.0,
        confidence: "100%",
      });
    });
  }
  // Format 3: { "result": {...} }
  else if (classification.result && classification.result.label) {
    labels.push({
      label: classification.result.label,
      score: classification.result.score || 0,
      confidence: `${Math.round((classification.result.score || 0) * 100)}%`,
    });
  }

  return labels.length > 0 ? labels : [{ label: "unclassified" }];
};

/**
 * Helper: Extract predictions (label + score) from classification response
 * Used for tagging documents
 */
const extractPredictionsFromClassification = (classification) => {
  const predictions = [];

  if (!classification) return predictions;

  // Format 1: { "predictions": [...] }
  if (classification.predictions && Array.isArray(classification.predictions)) {
    return classification.predictions.filter(p => p.label && p.score !== undefined);
  }
  
  // Format 2: { "labels": [...], "scores": [...] } - match them together
  if (classification.labels && Array.isArray(classification.labels)) {
    return classification.labels.map((label, index) => ({
      label,
      score: classification.scores && classification.scores[index] !== undefined 
        ? classification.scores[index] 
        : 1.0, // Default to 1.0 if no corresponding score
    }));
  }
  
  // Format 3: { "result": {...} }
  if (classification.result && classification.result.label) {
    return [{
      label: classification.result.label,
      score: classification.result.score || 0.5,
    }];
  }

  return predictions;
};

