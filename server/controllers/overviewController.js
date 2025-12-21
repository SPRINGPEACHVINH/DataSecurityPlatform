import {
  utilitygetDocuments
} from "../services/elasticsearchService/document.js"
import {
  _connector
} from "../services/elasticsearchService/connector.js"
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const { ES_LOCAL_USERNAME, ES_LOCAL_PASSWORD, ES_LOCAL_URL } = process.env;

export const getOverviewData = async (req, res) => {
  try {
    const connectors = await _connector();

    const totalSources = (connectors?.length || 0);
    const documentsResponse = await utilitygetDocuments();

    if (documentsResponse.status !== 200) {
      return res.status(documentsResponse.status).json({
        message: "Failed to load overview data.",
        error: documentsResponse.message,
      });
    }

    const totalFiles = documentsResponse.data?.length || 0;
    const newFilesToday = documentsResponse.data?.filter((file) => {
      const created = new Date(file.updated_at);
      return Date.now() - created.getTime() < 24 * 60 * 60 * 1000;
    }).length || 0;

    res.status(200).json({
      metrics: {
        totalSources,
        totalFiles,
        newFilesToday,
      },
    });
  } catch (error) {
    console.error("Error in getOverviewData:", error);
    res.status(500).json({
      message: "Failed to load overview data.",
      error: error.message,
    });
  }
};

/**
 * GET /api/overview/label-statistics
 * Lấy danh sách documents được classify với chi tiết labels
 */
export const getLabelStatistics = async (req, res) => {
  try {
    // Get all indices
    const indicesResponse = await axios.get(
      `${ES_LOCAL_URL}/_cat/indices?format=json`,
      {
        auth: {
          username: ES_LOCAL_USERNAME,
          password: ES_LOCAL_PASSWORD,
        },
      }
    );

    const indexNames = indicesResponse.data
      .map((idx) => idx.index)
      .filter((idx) => !idx.startsWith("."));

    const classifiedDocuments = [];

    // Duyệt từng index
    for (const indexName of indexNames) {
      try {
        console.log(`[Overview] Searching index ${indexName} for ml_labels...`);
        
        // Tìm documents có ml_labels field
        const response = await axios.post(
          `${ES_LOCAL_URL}/${indexName}/_search`,
          {
            size: 1000,
            query: {
              exists: {
                field: "ml_labels",
              },
            },
            sort: [
              { ml_classification_date: { order: "desc" } }
            ],
          },
          {
            auth: {
              username: ES_LOCAL_USERNAME,
              password: ES_LOCAL_PASSWORD,
            },
          }
        );

        console.log(`[Overview] Found ${response.data.hits.hits.length} documents with ml_labels in ${indexName}`);

        // Extract document details
        if (response.data.hits.hits && response.data.hits.hits.length > 0) {
          response.data.hits.hits.forEach((hit) => {
            const source = hit._source;
            const mlLabels = source.ml_labels;
            const fileName = source.name || source.file_name || hit._id;
            const classifyTime = source.ml_classification_date || new Date().toISOString();

            if (mlLabels && Array.isArray(mlLabels)) {
              mlLabels.forEach((labelObj) => {
                classifiedDocuments.push({
                  file_name: fileName,
                  classify_time: classifyTime,
                  label: labelObj.label,
                  severity: Math.round(labelObj.score * 100), // Convert to percentage (0-100)
                  score: labelObj.score,
                  confidence: labelObj.confidence || `${Math.round(labelObj.score * 100)}%`,
                });
              });
            }
          });
        }
      } catch (error) {
        console.warn(`[Overview] Error searching index ${indexName}:`, error.message);
      }
    }

    // Sort by classify_time descending
    classifiedDocuments.sort((a, b) => new Date(b.classify_time) - new Date(a.classify_time));

    return res.json({
      message: "Classification details retrieved successfully",
      data: {
        total_records: classifiedDocuments.length,
        documents: classifiedDocuments,
      },
    });
  } catch (error) {
    console.error("[Overview] Error in getLabelStatistics:", error);
    return res.status(500).json({
      error: error.message || "Failed to retrieve classification details",
    });
  }
};