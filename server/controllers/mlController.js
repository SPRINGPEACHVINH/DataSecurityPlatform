import {
  classifyText,
  classifyByStandard,
  esClassify,
  esClassifyByStandard,
} from "../services/pythonModelService.js";

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
