// Handles all communication with Elasticsearch
import axios from "axios";
import dotenv from "dotenv";

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

export const getConnector = async (req, res) => {
  try {
    const response = await _connector();

    res.status(200).json({
      message: "Elasticsearch connector retrieved successfully.",
      data: response,
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
    const { id, job_type = "full" } = req.body;
    if (!id) {
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
        id: id,
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
