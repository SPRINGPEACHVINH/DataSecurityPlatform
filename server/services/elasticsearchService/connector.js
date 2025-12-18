// Handles Elasticsearch connector operations: retrieval, synchronization, and status checking
import axios from "axios";
import dotenv from "dotenv";

import Models from "../../models/userModel.js";
const { Connector } = Models;
import { deleteConnectorById, deleteSyncByConnectorId } from "../../models/userModel.js";

import { generateConnectorIndexname, generateConnectorID } from "../../utils/index.js";

dotenv.config();

const { ES_LOCAL_USERNAME, ES_LOCAL_PASSWORD, ES_LOCAL_URL } = process.env;

export async function _connector() {
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

export const createConnector = async (req, res) => {
  try {
    let connector_id, index_name, service_type;
    const { name } = req.body;

    if (name !== "Azure" && name !== "AWS") {
      return res.status(400).json({
        message: "Unsupported cloud provider. Only 'Azure' and 'AWS' are supported.",
      });
    }
    if (name === "Azure") {
      service_type = "azure_blob_storage";
    }
    else if (name === "AWS") {
      service_type = "s3";
    }
    connector_id = generateConnectorID();
    index_name = generateConnectorIndexname(service_type);

    const response = await axios.put(
      `${ES_LOCAL_URL}/_connector/${connector_id}`,
      {
        index_name: index_name,
        name: name,
        service_type: service_type,
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
    )

    if (response.status !== 200 && response.status !== 201) {
      console.log("Create connector response:", response);
      throw new Error(`Failed to create Elasticsearch connector. Status code: ${response.status}`);
    }

    res.status(201).json({
      message: "Elasticsearch connector created successfully.",
      data: {
        id: response.data.id,
        name: name,
        type: service_type,
        index_name: index_name,
        result: response.data.result,
      }
    });
  }
  catch (error) {
    res.status(500).json({
      message: "Failed to create Elasticsearch connector.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    });
  }
}

export const deleteConnector = async (req, res) => {
  try {
    let { connector_id } = req.query;
    connector_id = decodeURIComponent(connector_id);

    if (!connector_id) {
      return res.status(400).json({
        message: "Connector ID is required to delete connector.",
      });
    }

    const response = await axios.delete(
      `${ES_LOCAL_URL}/_connector/${connector_id}`,
      {
        auth: {
          username: ES_LOCAL_USERNAME,
          password: ES_LOCAL_PASSWORD,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    )

    if (response.status !== 200 || response.data.acknowledged !== true) {
      throw new Error(`Failed to delete Elasticsearch connector. Status code: ${response.status}`);
    }
    try {
      // Delete from database
      await deleteConnectorById(connector_id);
      await deleteSyncByConnectorId(connector_id);
    }
    catch (dbError) {
      console.error("Error deleting connector from database:", dbError);
      throw new Error("Connector deleted from Elasticsearch but failed to delete from database.");
    }

    res.status(200).json({
      message: "Elasticsearch connector deleted successfully.",
      acknowledged: response.data.acknowledged,
    });
  }
  catch (error) {
    console.error("Error deleting Elasticsearch connector:", error);
    res.status(500).json({
      message: "Failed to delete Elasticsearch connector.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    });
  }
}

export const updateConnectorConfig = async (req, res) => {
  try {
    const { connectorType, buckets, aws_access_key_id, aws_secret_access_key, containers, blob_endpoint, account_key, account_name } = req.body;
    let { connector_id } = req.query;
    connector_id = decodeURIComponent(connector_id);

    if (!connector_id && !connectorType) {
      return res.status(400).json({
        message: "Connector ID and type are required to update configuration.",
      });
    }
    else if (connectorType === "s3" && (!buckets || !aws_access_key_id || !aws_secret_access_key)) {
      return res.status(400).json({
        message: "Buckets, AWS access key ID, and AWS secret access key are required for S3 connector configuration.",
      });
    }
    else if (connectorType === "azure_blob_storage" && (!containers || !blob_endpoint || !account_key || !account_name)) {
      return res.status(400).json({
        message: "Containers, blob endpoint, account key, and account name are required for Azure Blob Storage connector configuration.",
      });
    }
    else {
      const configPayload = {};
      if (connectorType === "s3") {
        configPayload.buckets = decodeURI(buckets);
        configPayload.aws_access_key_id = decodeURI(aws_access_key_id);
        configPayload.aws_secret_access_key = decodeURI(aws_secret_access_key);
      }
      else if (connectorType === "azure_blob_storage") {
        configPayload.account_name = decodeURI(account_name);
        configPayload.account_key = decodeURI(account_key);
        configPayload.blob_endpoint = decodeURI(blob_endpoint);
        configPayload.containers = decodeURI(containers);
      }
      configPayload.use_text_extraction_service = true;
      console.log("Updating connector config for ID:", connector_id);
      const response = await axios.put(
        `${ES_LOCAL_URL}/_connector/${connector_id}/_configuration`,
        {
          values: configPayload
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

      if (response.status !== 200 && response.status !== 201) {
        console.log("Update connector config response:", response);
        throw new Error(`Failed to update Elasticsearch connector configuration. Status code: ${response.status}`);
      }

      res.status(200).json({
        message: "Elasticsearch connector configuration updated successfully.",
        data: response.data,
      });
    }
  }
  catch (error) {
    if (error.response) {
      console.error("Elastic Error Detail:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error:", error.message);
    }
    res.status(500).json({
      message: "Failed to update Elasticsearch connector configuration.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    });
  }
}

export const syncConnectorData = async (req, res) => {
  try {
    let { connector_id } = req.query;
    connector_id = decodeURIComponent(connector_id);

    if (!connector_id) {
      return res.status(400).json({
        message: "Connector ID is required to sync data.",
      });
    }

    // Sync file content
    const syncResponse = await utilitySyncConnectors(connector_id);
    console.log("Sync response:", syncResponse);

    if (!syncResponse || !syncResponse.sync_id) {
      return res.status(500).json({
        message: "Failed to initiate sync.",
        data: syncResponse,
      });
    }

    // Wait for sync to complete (polling)
    let syncStatus = "pending";
    const maxRetries = 10;
    let attempts = 0;

    while (syncStatus !== "completed" && attempts < maxRetries) {
      await new Promise((r) => setTimeout(r, 30000)); // Wait 30 seconds

      const syncStatusResponse = await utilitygetSyncStatus(
        syncResponse.sync_id
      );
      console.log("Sync status response:", syncStatusResponse);

      syncStatus = syncStatusResponse?.sync_status || "pending";
      attempts++;
    }
    if (syncStatus === "completed") {
      console.log("Sync completed successfully.");
      res.status(200).json({
        message: "Elasticsearch connector data synced successfully.",
        syncstatus: syncStatus,
      });

    } else {
      console.log("Sync did not complete in time.");
      return res.status(500).json({
        message: "Sync did not complete in time.",
        syncstatus: syncStatus,
        attempts: attempts,
      });
    }
  }
  catch (error) {
    res.status(error.status || 500).json({
      message: "Failed to sync Elasticsearch connector data.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    });
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

export const utilitySyncConnectors = async (connector_id, job_type = "full") => {
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

    if (response.status !== 200 && response.status !== 201) {
      console.log("Sync connectors response:", response);
      throw new Error(`Failed to synchronize Elasticsearch connectors. Status code: ${response.status}`);
    }

    return {
      status: 200,
      message: "Elasticsearch connectors synchronized successfully.",
      sync_id: response.data.id,
    };
  } catch (error) {
    return {
      status: 500,
      message: "Failed to synchronize Elasticsearch connectors.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    };
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

    const response = await utilitySyncConnectors(connector_id, job_type);

    if (response.status !== 200) {
      return res.status(response.status).json({
        message: response.message,
        error: response.error,
      });
    }

    res.status(response.status).json({
      message: response.message,
      sync_id: response.sync_id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to synchronize Elasticsearch connectors.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    });
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

    if (response.status !== 200) {
      throw new Error(`Failed to retrieve synchronization status. Status code: ${response.status}`);
    }

    if (!response.data) {
      throw new Error(
        "No synchronization status found for the provided sync ID."
      );
    }

    return {
      status: 200,
      message: "Synchronization status retrieved successfully.",
      sync_status: response.data.status,
    };
  } catch (error) {
    return {
      status: 500,
      message: "Failed to retrieve synchronization status.",
      error: error.response
        ? error.response.data
        : error.message || "Unknown error",
    };
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

    const response = await utilitygetSyncStatus(sync_id);

    if (response.status !== 200) {
      return res.status(response.status).json({
        message: response.message,
        error: response.error,
      });
    }

    res.status(response.status).json({
      message: "Synchronization status retrieved successfully.",
      status: response.sync_status,
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
