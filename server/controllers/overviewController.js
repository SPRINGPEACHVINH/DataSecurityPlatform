import {
  utilitygetDocuments
} from "../services/elasticsearchService/document.js"
import {
  _connector
} from "../services/elasticsearchService/connector.js"

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