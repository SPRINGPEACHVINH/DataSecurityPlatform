// Handles all communication with Elasticsearch
import axios from "axios";
import dotenv from "dotenv";

import Models from "../models/userModel.js";
const { Connector } = Models;

dotenv.config();

const { ES_LOCAL_USERNAME, ES_LOCAL_PASSWORD, ES_LOCAL_URL, ES_LOCAL_API_KEY } =
  process.env;

async function _connector() {
  try {
    const response = await axios.get(`${ES_LOCAL_URL}/_connector`, {
      auth: {
        username: ES_LOCAL_USERNAME,
        password: ES_LOCAL_PASSWORD,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status !== 200) {
      throw new Error(
        `Failed to retrieve Elasticsearch connector. Status code: ${response.status}`
      );
    }

    const connectors = response.data.results.map((index_name) => ({
      type: index_name.service_type,
      name: index_name.index_name,
      id: index_name.id,
      status: index_name.status,
    }));

    if (connectors.length === 0) {
      return {
        message: "No Elasticsearch connectors found.",
        data: [],
      };
    }

    return connectors;
  } catch (error) {
    console.error("Error getting Elasticsearch connectors:", error);
    throw new Error(
      error.response
        ? error.response.data
        : error.message || "Unknown error while getting connectors"
    );
  }
}

// Retrieves Elasticsearch connectors and syncs with the database
export const getConnector = async (req, res) => {
  try {
    const response = await _connector();
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized: User ID is required.",
      });
    }

    const elasticsearchConnectors = Array.isArray(response) ? response : [];

    const updatedConnectors = [];

    for (const esConnector of elasticsearchConnectors) {
      try {
        // Check if connector exists in database
        const existingConnector = await Connector.findOne({
          connector_id: esConnector.id,
        });

        if (existingConnector) {
          // Update existing connector
          const updatedConnector = await Connector.findOneAndUpdate(
            { connector_id: esConnector.id },
            {
              connector_name: esConnector.name,
              connector_type: esConnector.type,
              status: esConnector.status,
            },
            {
              new: true, // Return updated document
              runValidators: true,
            }
          );

          // Log the updated connector
          console.log(`Updated existing connector: ${esConnector.name}`);
          updatedConnectors.push({
            type: updatedConnector.connector_type,
            name: updatedConnector.connector_name,
            id: updatedConnector.connector_id,
            status: updatedConnector.status,
            database_id: updatedConnector._id,
            action: "updated",
          });
        } else {
          const newConnector = await Connector.create({
            userId: userId,
            connector_id: esConnector.id,
            connector_name: esConnector.name,
            connector_type: esConnector.type,
            status: esConnector.status,
          });

          console.log(`Created new connector: ${esConnector.name}`);
          updatedConnectors.push({
            type: newConnector.connector_type,
            name: newConnector.connector_name,
            id: newConnector.connector_id,
            status: newConnector.status,
            database_id: newConnector._id,
            action: "created",
          });
        }
      } catch (connectorError) {
        console.error(
          `Error syncing connector ${esConnector.name}:`,
          connectorError
        );

        // Log error but continue processing other connectors
        updatedConnectors.push({
          type: esConnector.type,
          name: esConnector.name,
          id: esConnector.id,
          status: esConnector.status,
          database_id: null,
          action: "sync_failed",
          error: connectorError.message,
        });
      }
    }

    res.status(200).json({
      message: "Elasticsearch connector retrieved and synced successfully.",
      data: updatedConnectors.map((conn) => ({
        type: conn.type,
        name: conn.name,
        id: conn.id,
        status: conn.status,
      })),
      sync_info: {
        total_connectors: updatedConnectors.length,
        created: updatedConnectors.filter((c) => c.action === "created").length,
        updated: updatedConnectors.filter((c) => c.action === "updated").length,
        failed: updatedConnectors.filter((c) => c.action === "sync_failed")
          .length,
        details: updatedConnectors,
      },
    });
  } catch (error) {
    console.error("Error fetching Elasticsearch nodes:", error);
    res.status(500).json({
      message: "Failed to retrieve Elasticsearch connector.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    });
  }
};

export const getDocuments = async (req, res) => {
  try {
    let connectorData = [],
      allDocuments = [],
      documents = [],
      indexName = null,
      indexType = null;
    if (!req.body) {
      console.log("Request body is empty, fetching all connectors.");
      connectorData = await _connector();

      indexName =
        connectorData && connectorData.length > 0
          ? connectorData.map((connector) => connector.name)
          : [];
      indexType =
        connectorData && connectorData.length > 0
          ? connectorData.map((connector) => connector.type)
          : [];
    } else {
      console.log("Request body is present, fetching specific index.");
      connectorData = req.body;
      indexName = connectorData.indexName;
      indexType = connectorData.indexType;
    }

    if (!indexName) {
      return res.status(400).json({
        message: "Index name is required to fetch documents.",
      });
    }
    if (!indexType) {
      return res.status(400).json({
        message: "Index type is required to fetch documents.",
      });
    }

    for (let i = 0; i < indexType.length; i++) {
      if (indexType[i] !== "azure_blob_storage" && indexType[i] !== "s3") {
        return res.status(400).json({
          message:
            "Unsupported index type. Only 'azure_blob_storage' and 's3' are supported.",
        });
      } else if (indexType[i] === "azure_blob_storage") {
        const response = await axios.get(
          `${ES_LOCAL_URL}/${indexName[i]}/_search`,
          {
            auth: {
              username: ES_LOCAL_USERNAME,
              password: ES_LOCAL_PASSWORD,
            },
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (response.status !== 200) {
          throw new Error(
            `Failed to retrieve documents. Status code: ${response.status}`
          );
        }
        documents = response.data.hits.hits.map((hit) => ({
          index: hit._index,
          id: hit._id,
          container: hit._source.container,
          title: hit._source.title,
          updated_at: hit._source._timestamp,
        }));
      } else if (indexType[i] === "s3") {
        const response = await axios.get(
          `${ES_LOCAL_URL}/${indexName[i]}/_search`,
          {
            auth: {
              username: ES_LOCAL_USERNAME,
              password: ES_LOCAL_PASSWORD,
            },
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (response.status !== 200) {
          throw new Error(
            `Failed to retrieve documents. Status code: ${response.status}`
          );
        }
        documents = response.data.hits.hits
          .filter((hit) => {
            const filename = hit._source.filename;
            // Loại bỏ folder (filename kết thúc bằng '/')
            return filename && !filename.endsWith("/");
          })
          .map((hit) => ({
            index: hit._index,
            id: hit._source.bucket + "/" + hit._source.filename,
            container: hit._source.bucket,
            title: hit._source.filename,
            updated_at: hit._source._timestamp,
          }));
      } else {
        return res.status(400).json({
          message: `Unsupported index type: ${indexType[i]}`,
        });
      }
      allDocuments.push(...documents);
    }

    if (allDocuments.length === 0) {
      return res.status(404).json({
        message: "No documents found for the specified index.",
      });
    }

    res.status(200).json({
      message: "Documents retrieved successfully.",
      data: allDocuments,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({
      message: "Failed to retrieve documents.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    });
  }
};

export const SyncConnectors = async (req, res) => {
  try {
    const { connector_id, job_type = "full" } = req.body;
    if (!connector_id) {
      return res.status(400).json({
        message: "Connector ID is required to synchronize.",
      });
    }
    if (!job_type || (job_type !== "full" && job_type !== "incremental")) {
      return res.status(400).json({
        message: "Invalid job type. Must be 'full' or 'incremental'.",
      });
    }

    const response = await axios.post(
      `${ES_LOCAL_URL}/_connector/_sync_job`,
      {
        id: connector_id,
        job_type: job_type,
        trigger_method: "on_demand",
      },
      {
        auth: {
          username: ES_LOCAL_USERNAME,
          password: ES_LOCAL_PASSWORD,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({
      message: "Elasticsearch connectors synchronized successfully.",
      sync_id: response.data.id,
    });
  } catch (error) {
    console.error("Error synchronizing Elasticsearch connectors:", error);
    res.status(500).json({
      message: "Failed to synchronize Elasticsearch connectors.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    });
  }
};

export const getSyncStatus = async (req, res) => {
  try {
    const { sync_id } = req.body;
    if (!sync_id) {
      return res.status(400).json({
        message: "Sync ID is required to check synchronization status.",
      });
    }

    const response = await axios.get(
      `${ES_LOCAL_URL}/_connector/_sync_job/${sync_id}`,
      {
        auth: {
          username: ES_LOCAL_USERNAME,
          password: ES_LOCAL_PASSWORD,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data) {
      return res.status(404).json({
        message: "No synchronization status found for the provided sync ID.",
        data: null,
      });
    }

    res.status(200).json({
      message: "Synchronization status retrieved successfully.",
      status: response.data.status,
    });
  } catch (error) {
    console.error("Error fetching synchronization status:", error);
    res.status(500).json({
      message: "Failed to retrieve synchronization status.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    });
  }
};

export const deleteFileContent = async (req, res) => {
  try {
    const { connector_name, connector_names } = req.body;

    // Support both single connector và multiple connectors
    let connectorsToProcess = [];

    if (connector_name) {
      connectorsToProcess = [connector_name];
    } else if (connector_names && Array.isArray(connector_names)) {
      connectorsToProcess = connector_names;
    } else {
      return res.status(400).json({
        message:
          "Either 'connector_name' or 'connector_names' array is required.",
      });
    }

    const requestBody = {
      script: {
        source: "ctx._source.remove('body')",
        lang: "painless",
      },
      query: {
        exists: { field: "body" },
      },
    };

    const results = [];

    // Process each connector
    for (const connectorName of connectorsToProcess) {
      try {
        const response = await axios.post(
          `${ES_LOCAL_URL}/${connectorName}/_update_by_query`,
          requestBody,
          {
            auth: {
              username: ES_LOCAL_USERNAME,
              password: ES_LOCAL_PASSWORD,
            },
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        results.push({
          connector_name: connectorName,
          success: true,
          data: {
            execution_time_ms: response.data.took,
            total_documents: response.data.total,
            updated_documents: response.data.updated,
            version_conflicts: response.data.version_conflicts,
            failures: response.data.failures || [],
          },
        });
      } catch (connectorError) {
        console.error(
          `Error processing connector ${connectorName}:`,
          connectorError
        );
        results.push({
          connector_name: connectorName,
          success: false,
          error: connectorError.response
            ? connectorError.response.data
            : connectorError.message,
        });
      }
    }

    // Check if all operations were successful
    const allSuccessful = results.every((result) => result.success);
    const successfulCount = results.filter((result) => result.success).length;

    res.status(allSuccessful ? 200 : 207).json({
      message: allSuccessful
        ? "File content deleted successfully from all connectors."
        : `File content deletion completed. ${successfulCount}/${results.length} connectors processed successfully.`,
      data: results,
    });
  } catch (error) {
    console.error("Error deleting file content:", error);
    res.status(500).json({
      message: "Failed to delete file content.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    });
  }
};

export const SearchKeyword = async (req, res) => {
  try {
    const { keyword, index_name } = req.body;

    // Validate required parameters
    if (!keyword) {
      return res.status(400).json({
        message: "Keyword is required for search.",
      });
    }

    if (!index_name) {
      return res.status(400).json({
        message: "Index name is required for search.",
      });
    }

    // Encode keyword để handle special characters
    const encodedKeyword = encodeURIComponent(keyword);

    // Execute search query
    const response = await axios.get(
      `${ES_LOCAL_URL}/${index_name}/_search?q=${encodedKeyword}`,
      {
        auth: {
          username: ES_LOCAL_USERNAME,
          password: ES_LOCAL_PASSWORD,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(
        `Failed to search documents. Status code: ${response.status}`
      );
    }

    // Convert UTC to UTC+7
    const convertToUTC7 = (timestamp) => {
      if (!timestamp) return null;
      try {
        const date = new Date(timestamp);
        date.setHours(date.getHours() + 7);
        return date.toISOString().replace("T", " ").substring(0, 19);
      } catch (error) {
        console.warn(`Failed to convert timestamp: ${timestamp}`);
        return timestamp;
      }
    };

    // Convert bytes to KB
    const convertBytesToKB = (bytes) => {
      if (!bytes || isNaN(bytes)) return 0;
      return Math.round((bytes / 1024) * 100) / 100; // Round to 2 decimal places
    };

    // Determine storage type based on index structure
    const firstHit = response.data.hits.hits[0];
    const isS3Storage =
      firstHit && firstHit._source.bucket && firstHit._source.filename;
    const isAzureStorage =
      firstHit && firstHit._source.container && firstHit._source.title;

    // Extract fields based on storage type
    const searchResults = response.data.hits.hits.map((hit) => {
      const baseResult = {
        index: hit._index,
        id: hit._id,
        updated_at: convertToUTC7(hit._source._timestamp),
      };

      if (isS3Storage) {
        // S3 bucket structure
        return {
          ...baseResult,
          container: hit._source.bucket,
          title: hit._source.filename,
          size: convertBytesToKB(hit._source.size_in_bytes), // Convert to KB
          size_unit: "KB",
          storage_type: "s3",
        };
      } else if (isAzureStorage) {
        // Azure Blob Storage structure
        return {
          ...baseResult,
          container: hit._source.container,
          title: hit._source.title,
          size: convertBytesToKB(hit._source.size),
          content_type: hit._source["content type"],
          storage_type: "azure_blob_storage",
        };
      } else {
        // Fallback for unknown structure
        return {
          ...baseResult,
          container: hit._source.container || hit._source.bucket || "Unknown",
          title: hit._source.title || hit._source.filename || hit._id,
          size:
            hit._source.size ||
            convertBytesToKB(hit._source.size_in_bytes) ||
            0,
          size_unit: "KB",
        };
      }
    });

    // Check if no results found
    if (searchResults.length === 0) {
      return res.status(200).json({
        message: `Search executed successfully. No documents found for keyword: "${keyword}"`,
        data: {
          keyword: keyword,
          index_name: index_name,
          storage_type: "unknown",
          total_hits: 0,
          results: [],
        },
      });
    }

    // Determine storage type for response
    const storageType = isS3Storage
      ? "s3"
      : isAzureStorage
      ? "azure_blob_storage"
      : "unknown";

    res.status(200).json({
      message: "Search completed successfully.",
      data: {
        keyword: keyword,
        index_name: index_name,
        took_ms: response.data.took,
        results: searchResults,
      },
    });
  } catch (error) {
    console.error("Error searching documents:", error);
    res.status(500).json({
      message: "Failed to search documents.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    });
  }
};

export const utilitySyncConnectors = async (
  connector_id,
  job_type = "full"
) => {
  try {
    if (!connector_id) {
      throw new Error("Connector ID is required to synchronize.");
    }
    if (!job_type || (job_type !== "full" && job_type !== "incremental")) {
      throw new Error("Invalid job type. Must be 'full' or 'incremental'.");
    }

    const response = await axios.post(
      `${ES_LOCAL_URL}/_connector/_sync_job`,
      {
        id: connector_id,
        job_type: job_type,
        trigger_method: "on_demand",
      },
      {
        auth: {
          username: ES_LOCAL_USERNAME,
          password: ES_LOCAL_PASSWORD,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return {
      message: "Elasticsearch connectors synchronized successfully.",
      sync_id: response.data.id,
    };
  } catch (error) {
    console.error("Error synchronizing Elasticsearch connectors:", error);
    return {
      message: "Failed to synchronize Elasticsearch connectors.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    };
  }
};

export const utilitygetSyncStatus = async (sync_id) => {
  try {
    if (!sync_id) {
      throw new Error("Sync ID is required to check synchronization status.");
    }

    const response = await axios.get(
      `${ES_LOCAL_URL}/_connector/_sync_job/${sync_id}`,
      {
        auth: {
          username: ES_LOCAL_USERNAME,
          password: ES_LOCAL_PASSWORD,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data) {
      throw new Error(
        "No synchronization status found for the provided sync ID."
      );
    }

    return {
      message: "Synchronization status retrieved successfully.",
      status: response.data.status,
    };
  } catch (error) {
    console.error("Error fetching synchronization status:", error);
    return {
      message: "Failed to retrieve synchronization status.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    };
  }
};

export const utilityDeleteFileContent = async (
  connector_name,
  connector_names
) => {
  try {
    // Support both single connector và multiple connectors
    let connectorsToProcess = [];

    if (connector_name) {
      connectorsToProcess = [connector_name];
    } else if (connector_names && Array.isArray(connector_names)) {
      connectorsToProcess = connector_names;
    } else {
      throw new Error(
        "Either 'connector_name' or 'connector_names' array is required."
      );
    }

    const requestBody = {
      script: {
        source: "ctx._source.remove('body')",
        lang: "painless",
      },
      query: {
        exists: { field: "body" },
      },
    };

    const results = [];

    // Process each connector
    for (const connectorName of connectorsToProcess) {
      try {
        const response = await axios.post(
          `${ES_LOCAL_URL}/${connectorName}/_update_by_query`,
          requestBody,
          {
            auth: {
              username: ES_LOCAL_USERNAME,
              password: ES_LOCAL_PASSWORD,
            },
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        results.push({
          connector_name: connectorName,
          success: true,
          data: {
            execution_time_ms: response.data.took,
            total_documents: response.data.total,
            updated_documents: response.data.updated,
            version_conflicts: response.data.version_conflicts,
            failures: response.data.failures || [],
          },
        });
      } catch (connectorError) {
        console.error(
          `Error processing connector ${connectorName}:`,
          connectorError
        );
        results.push({
          connector_name: connectorName,
          success: false,
          error: connectorError.response
            ? connectorError.response.data
            : connectorError.message,
        });
      }
    }

    // Check if all operations were successful
    const allSuccessful = results.every((result) => result.success);
    const successfulCount = results.filter((result) => result.success).length;

    return {
      message: allSuccessful
        ? "File content deleted successfully from all connectors."
        : `File content deletion completed. ${successfulCount}/${results.length} connectors processed successfully.`,
      data: results,
    };
  } catch (error) {
    console.error("Error deleting file content:", error);
    return {
      message: "Failed to delete file content.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    };
  }
};

export const utilitySearchKeyword = async (keyword, index_name) => {
  try {
    // Validate required parameters
    if (!keyword) {
      throw new Error("Keyword is required for search.");
    }

    if (!index_name) {
      throw new Error("Index name is required for search.");
    }

    // Encode keyword để handle special characters
    const encodedKeyword = encodeURIComponent(keyword);

    // Execute search query
    const response = await axios.get(
      `${ES_LOCAL_URL}/${index_name}/_search?q=${encodedKeyword}`,
      {
        auth: {
          username: ES_LOCAL_USERNAME,
          password: ES_LOCAL_PASSWORD,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(
        `Failed to search documents. Status code: ${response.status}`
      );
    }

    // Convert UTC to UTC+7
    const convertToUTC7 = (timestamp) => {
      if (!timestamp) return null;
      try {
        const date = new Date(timestamp);
        date.setHours(date.getHours() + 7);
        return date.toISOString().replace("T", " ").substring(0, 19);
      } catch (error) {
        console.warn(`Failed to convert timestamp: ${timestamp}`);
        return timestamp;
      }
    };

    // Convert bytes to KB
    const convertBytesToKB = (bytes) => {
      if (!bytes || isNaN(bytes)) return 0;
      return Math.round((bytes / 1024) * 100) / 100; // Round to 2 decimal places
    };

    // Determine storage type based on index structure
    const firstHit = response.data.hits.hits[0];
    const isS3Storage =
      firstHit && firstHit._source.bucket && firstHit._source.filename;
    const isAzureStorage =
      firstHit && firstHit._source.container && firstHit._source.title;

    // Extract fields based on storage type
    const searchResults = response.data.hits.hits.map((hit) => {
      const baseResult = {
        index: hit._index,
        id: hit._id,
        updated_at: convertToUTC7(hit._source._timestamp),
      };

      if (isS3Storage) {
        // S3 bucket structure
        return {
          ...baseResult,
          container: hit._source.bucket,
          title: hit._source.filename,
          size: convertBytesToKB(hit._source.size_in_bytes), // Convert to KB
          size_unit: "KB",
          storage_type: "s3",
        };
      } else if (isAzureStorage) {
        // Azure Blob Storage structure
        return {
          ...baseResult,
          container: hit._source.container,
          title: hit._source.title,
          size: convertBytesToKB(hit._source.size),
          content_type: hit._source["content type"],
          storage_type: "azure_blob_storage",
        };
      } else {
        // Fallback for unknown structure
        return {
          ...baseResult,
          container: hit._source.container || hit._source.bucket || "Unknown",
          title: hit._source.title || hit._source.filename || hit._id,
          size:
            hit._source.size ||
            convertBytesToKB(hit._source.size_in_bytes) ||
            0,
          size_unit: "KB",
        };
      }
    });

    // Check if no results found
    if (searchResults.length === 0) {
      return {
        message: `Search executed successfully. No documents found for keyword: "${keyword}"`,
        data: {
          keyword: keyword,
          index_name: index_name,
          storage_type: "unknown",
          total_hits: 0,
          results: [],
        },
      };
    }

    return {
      message: "Search completed successfully.",
      data: {
        keyword: keyword,
        index_name: index_name,
        took_ms: response.data.took,
        results: searchResults,
      },
    };
  } catch (error) {
    console.error("Error searching documents:", error);
    return {
      message: "Failed to search documents.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    };
  }
};
