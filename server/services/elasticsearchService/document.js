// Handles document retrieval and file content deletion from Elasticsearch indices
import axios from "axios";
import dotenv from "dotenv";

import { _connector } from "./connector.js";

dotenv.config();

const { ES_LOCAL_USERNAME, ES_LOCAL_PASSWORD, ES_LOCAL_URL } = process.env;

export const utilitygetDocuments = async (connectorData) => {
  try {
    let allDocuments = [],
      documents = [],
      indexName = null,
      indexType = null;
    if (!connectorData) {
      console.log("Request body is empty, fetching all connectors.");
      connectorData = await _connector();
      console.log("Fetched connector data:", connectorData);
      if (!connectorData || connectorData.length === 0) {
        return {
          status: 404,
          message: "No connectors found to retrieve documents."
        }
      }
      
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
      indexName = connectorData.indexName;
      indexType = connectorData.indexType;
    }

    if (!indexName) {
      return {
        status: 400,
        message: "Index name is required to fetch documents."
      }
    }
    if (!indexType) {
      return {
        status: 400,
        message: "Index type is required to fetch documents."
      }
    }

    for (let i = 0; i < indexType.length; i++) {
      if (indexType[i] !== "azure_blob_storage" && indexType[i] !== "s3") {
        throw new Error(
          "Unsupported index type. Only 'azure_blob_storage' and 's3' are supported."
        );
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
        if (response.status !== 200 && response.status !== 404) {
          throw new Error(
            `Failed to retrieve documents. Status code: ${response.status}`
          );
        }
        else if (response.status === 404) {
          return {
            status: 404,
            message: `Index ${indexName[i]} not found.`,
          }
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
        return {
          status: 400,
          message: `Unsupported index type: ${indexType[i]}`,
        }
      }
      allDocuments.push(...documents);
    }

    if (allDocuments.length === 0) {
      return {
        status: 404,
        message: "No documents found for the specified index.",
      }
    }

    return {
      status: 200,
      message: "Documents retrieved successfully.",
      data: allDocuments,
    }
  } catch (error) {
    return {
      status: error.response ? error.response.status : 500,
      message: "Failed to retrieve documents.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    }
  }
};

export const getDocuments = async (req, res) => {
  try {
    const connectorData = req.body;
    const response = await utilitygetDocuments(connectorData);

    if (response.status !== 200) {
      return res.status(response.status).json({
        message: response.message,
        error: response.error,
      });
    }

    res.status(200).json({
      message: "Documents retrieved successfully.",
      data: response.data,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve documents.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    });
  }
};

export const utilityDeleteFileContent = async (connector_name, connector_names) => {
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
        results.push({
          connector_name: connectorName,
          success: false,
          error: connectorError.response
            ? connectorError.response.data
            : connectorError.message || "Unknown error",
        });
      }
    }

    // Check if all operations were successful
    const allSuccessful = results.every((result) => result.success);
    const successfulCount = results.filter((result) => result.success).length;

    const totalConnectors = results.length;
    const updatedDocsCount = results.reduce((sum, r) => sum + (r.updated_documents || 0), 0);

    return {
      status: allSuccessful ? 200 : 207,
      message: allSuccessful
        ? `Successfully deleted file content from ${totalConnectors} connector${totalConnectors > 1 ? 's' : ''}. Total ${updatedDocsCount} document${updatedDocsCount > 1 ? 's' : ''} updated.`
        : `Partially completed. ${successfulCount}/${totalConnectors} connectors processed successfully.`,
      summary: {
        total_connectors: totalConnectors,
        successful: successfulCount,
        failed: totalConnectors - successfulCount,
        total_documents_updated: updatedDocsCount,
      },
      details: results,
    };
  } catch (error) {
    console.error("Error deleting file content:", error);
    return {
      status: 500,
      message: "Failed to delete file content.",
      error:
        error.response
          ? error.response.data
          : error.message || "Unknown error",
    };
  }
};

export const deleteFileContent = async (req, res) => {
  try {
    const { connector_name, connector_names } = req.body;
    const results = await utilityDeleteFileContent(connector_name, connector_names);

    if (results.status !== 200 && results.status !== 207) {
      return res.status(results.status).json({
        message: results.message,
        error: results.error,
      });
    }

    res.status(results.status).json({
      message: results.message,
      summary: results.summary,
      details: results.details,
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

// /**
//  * Get single document content by ID
//  * @param {string} indexName - Elasticsearch index name
//  * @param {string} documentId - Document ID
//  * @returns {Promise<Object>} Document with content
//  */
// export const utilityGetDocumentContent = async (indexName, documentId) => {
//   try {
//     if (!indexName || !documentId) {
//       throw new Error("Index name and document ID are required");
//     }

//     console.log(`[ES] Fetching document ${documentId} from index ${indexName}`);

//     const response = await axios.get(
//       `${ES_LOCAL_URL}/${indexName}/_doc/${documentId}`,
//       {
//         auth: {
//           username: ES_LOCAL_USERNAME,
//           password: ES_LOCAL_PASSWORD,
//         },
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     if (response.status !== 200 || !response.data.found) {
//       throw new Error(`Document ${documentId} not found in index ${indexName}`);
//     }

//     console.log(`[ES] Successfully fetched document ${documentId}`);
//     return response.data._source;
//   } catch (error) {
//     console.error(`[ES] Error fetching document:`, error.message);
//     throw error;
//   }
// };

// /**
//  * Get multiple documents content by IDs
//  * @param {string} indexName - Elasticsearch index name
//  * @param {Array<string>} documentIds - Array of document IDs
//  * @returns {Promise<Array>} Array of documents with content
//  */
// export const utilityGetMultipleDocumentsContent = async (indexName, documentIds) => {
//   try {
//     if (!indexName || !documentIds || documentIds.length === 0) {
//       throw new Error("Index name and document IDs array are required");
//     }

//     console.log(`[ES] Fetching ${documentIds.length} documents from index ${indexName}`);

//     const response = await axios.post(
//       `${ES_LOCAL_URL}/${indexName}/_mget`,
//       {
//         ids: documentIds,
//       },
//       {
//         auth: {
//           username: ES_LOCAL_USERNAME,
//           password: ES_LOCAL_PASSWORD,
//         },
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     if (response.status !== 200) {
//       throw new Error(`Failed to fetch documents from index ${indexName}`);
//     }

//     const documents = response.data.docs
//       .filter((doc) => doc.found)
//       .map((doc) => ({
//         _id: doc._id,
//         _source: doc._source,
//       }));

//     console.log(`[ES] Successfully fetched ${documents.length} documents`);
//     return documents;
//   } catch (error) {
//     console.error(`[ES] Error fetching multiple documents:`, error.message);
//     throw error;
//   }
// };

// /**
//  * Get all documents from index (with pagination)
//  * @param {string} indexName - Elasticsearch index name
//  * @param {number} size - Number of documents to return (default 100)
//  * @param {number} from - Starting position (default 0)
//  * @returns {Promise<Object>} Documents and total count
//  */
// export const utilityGetAllDocumentsFromIndex = async (indexName, size = 100, from = 0) => {
//   try {
//     if (!indexName) {
//       throw new Error("Index name is required");
//     }

//     console.log(`[ES] Fetching documents from index ${indexName} (size: ${size}, from: ${from})`);

//     const response = await axios.get(
//       `${ES_LOCAL_URL}/${indexName}/_search`,
//       {
//         params: {
//           size,
//           from,
//         },
//         auth: {
//           username: ES_LOCAL_USERNAME,
//           password: ES_LOCAL_PASSWORD,
//         },
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     if (response.status !== 200) {
//       throw new Error(`Failed to fetch documents from index ${indexName}`);
//     }

//     const documents = response.data.hits.hits.map((hit) => ({
//       _id: hit._id,
//       _source: hit._source,
//       _score: hit._score,
//     }));

//     console.log(`[ES] Successfully fetched ${documents.length} documents from ${response.data.hits.total.value} total`);
    
//     return {
//       total: response.data.hits.total.value,
//       documents,
//     };
//   } catch (error) {
//     console.error(`[ES] Error fetching documents from index:`, error.message);
//     throw error;
//   }
// };



