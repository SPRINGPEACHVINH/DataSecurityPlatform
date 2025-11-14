import { getConnector } from "../services/elasticsearchService/connector.js";

export const getOverviewData = async (req, res) => {
  try {
    const [connectors] = await Promise.all([
      safeGetConnectorInternal(),
    ]);

    const totalESDocs = await safeGetDocumentCountInternal();
    const totalFiles = totalESDocs;

    res.status(200).json({
      metrics: {
        totalFiles,
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