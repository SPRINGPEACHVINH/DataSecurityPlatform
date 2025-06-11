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
    const respone = await _connector();
    const indexName =
      respone && respone.length > 0
        ? respone.map((connector) => connector.name)
        : [];

    console.log("Index Name:", indexName);
    if (!indexName) {
      return res.status(400).json({
        message: "Index name is required to fetch documents.",
      });
    }
    const response = await axios.get(`${ES_LOCAL_URL}/${indexName}/_search`, {
      auth: {
        username: ES_LOCAL_USERNAME,
        password: ES_LOCAL_PASSWORD,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    const documents = response.data.hits.hits.map((hit) => ({
      index: hit._index,
      container: hit._source.container,
      title: hit._source.title,
    }));

    if (documents.length === 0) {
      return res.status(404).json({
        message: "No documents found for the specified index.",
      });
    }

    res.status(200).json({
      message: "Documents retrieved successfully.",
      data: documents,
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
