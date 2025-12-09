import axios from "axios";

const PYTHON_MODEL_URL = process.env.PYTHON_MODEL_URL || "http://localhost:8000";

/**
 * Gọi endpoint classify của Python model
 * @param {string} text - Text cần classify
 * @param {Array<string>} labels - Labels để classify
 * @returns {Promise<Object>} Kết quả classify
 */
export const classifyText = async (text, labels = null) => {
  try {
    const response = await axios.post(`${PYTHON_MODEL_URL}/classify`, {
      text,
      labels,
    });
    return response.data;
  } catch (error) {
    console.error("Error calling Python classify:", error.message);
    throw new Error(`Python Model Error: ${error.message}`);
  }
};

/**
 * Gọi endpoint classify_by_standard của Python model
 * @param {string} text - Text cần classify
 * @param {string} standard - Standard (PCI_DSS, HIPAA, GDPR, ...)
 * @returns {Promise<Object>} Kết quả classify
 */
export const classifyByStandard = async (text, standard) => {
  try {
    const response = await axios.post(
      `${PYTHON_MODEL_URL}/classify_by_standard`,
      {
        text,
        standard,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error calling Python classify_by_standard:", error.message);
    throw new Error(`Python Model Error: ${error.message}`);
  }
};

/**
 * Gọi endpoint es_classify của Python model
 * @param {Object} params - Tham số
 * @returns {Promise<Object>} Kết quả classify
 */
export const esClassify = async (params) => {
  try {
    const {
      index,
      query,
      size = 100,
      textField = "content",
      labels,
      updateIndex = false,
    } = params;

    const response = await axios.post(`${PYTHON_MODEL_URL}/es_classify`, {
      index,
      query,
      size,
      text_field: textField,
      labels,
      update_index: updateIndex,
    });
    return response.data;
  } catch (error) {
    console.error("Error calling Python es_classify:", error.message);
    throw new Error(`Python Model Error: ${error.message}`);
  }
};

/**
 * Gọi endpoint es_classify_by_standard của Python model
 * @param {Object} params - Tham số
 * @returns {Promise<Object>} Kết quả classify
 */
export const esClassifyByStandard = async (params) => {
  try {
    const {
      index,
      query,
      size = 100,
      textField = "content",
      standard,
      updateIndex = false,
    } = params;

    const response = await axios.post(
      `${PYTHON_MODEL_URL}/es_classify_by_standard`,
      {
        index,
        query,
        size,
        text_field: textField,
        standard,
        update_index: updateIndex,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error calling Python es_classify_by_standard:", error.message);
    throw new Error(`Python Model Error: ${error.message}`);
  }
};

/**
 * Health check - Kiểm tra Python model có chạy không
 * @returns {Promise<boolean>}
 */
export const healthCheck = async () => {
  try {
    const response = await axios.get(`${PYTHON_MODEL_URL}/docs`);
    return response.status === 200;
  } catch (error) {
    console.error("Python Model health check failed:", error.message);
    return false;
  }
};
