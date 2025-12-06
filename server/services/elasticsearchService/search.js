// Handles all communication with Elasticsearch
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const { ES_LOCAL_USERNAME, ES_LOCAL_PASSWORD, ES_LOCAL_URL } = process.env;
const regexCCCD = ".*0[0-9]{2}[0-3][0-9]{2}[0-9]{6}.*";
const regexPCIDSSPattern = ".*[0-9]{13,19}.*|.*[0-9]{3,4}.*&.*[0-9]{3,6}.*";

export const utilitySearchKeyword = async (keyword, index_name) => {
    try {
        // Validate required parameters
        if (!keyword) {
            throw new Error({
                status: 400,
                message: "Keyword is required for search.",
            });
        }

        if (!index_name) {
            throw new Error({
                status: 400,
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
            throw new Error({
                status: response.status,
                message: `Failed to search documents.`
            });
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
                status: 200,
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
            status: 200,
            message: "Search completed successfully.",
            data: {
                keyword: keyword,
                index_name: index_name,
                took_ms: response.data.took,
                results: searchResults,
            },
        };
    } catch (error) {
        return {
            status: error.status || 500,
            message: "Failed to search documents.",
            error: error.response
                ? error.response.data
                : error.message || "Unknown error",
        };
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

        const response = await utilitySearchKeyword(keyword, index_name);

        if (response.status !== 200) {
            return res.status(response.status).json({
                message: response.message,
                error: response.error,
            });
        }

        res.status(response.status).json({
            message: response.message,
            data: response.data,
        });
    } catch(error) {
        res.status(500).json({
            message: "Failed to search documents.",
            error: error.response
                ? error.response.data
                : error.message || "Unknown error",
        });
    }
};

export const utilitySearchRegexPattern = async (pattern, index_name) => {
    try {
        // Validate required parameters
        if (!pattern) {
            throw new Error({
                status: 400,
                message: "Regex pattern is required for search.",
            });
        }
        if (!index_name) {
            throw new Error({
                status: 400,
                message: "Index name is required for search.",
            });
        }

        const PATTERN_CODES = {
            PT001: regexCCCD, // CCCD pattern
            PT002: regexPCIDSSPattern, // PCI-DSS pattern,
        };

        if (!PATTERN_CODES[pattern]) {
            throw new Error({
                status: 400,
                message: "Invalid pattern code. Supported codes are PT001 and PT002."
            });
        }

        const regexpattern = PATTERN_CODES[pattern];

        console.log(`Using regex pattern: ${regexpattern} - Indexname: ${index_name}`);
        // Execute search query
        const response = await axios.post(
            `${ES_LOCAL_URL}/${index_name}/_search`,
            {
                query: {
                    regexp: {
                        body: {
                            value: regexpattern,
                        },
                    },
                },
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

        if (response.status !== 200) {
            throw new Error({
                status: response.status,
                message: "Failed to search documents."
            });
        }

        const totalHits =
            response.data.hits.total?.value ?? response.data.hits.total ?? 0;

        // Convert UTC to UTC+7
        const convertToUTC7 = (timestamp) => {
            if (!timestamp) return null;
            try {
                const date = new Date(timestamp);
                date.setHours(date.getHours() + 7);
                return date.toISOString().replace("T", " ").substring(0, 19);
            } catch(error) {
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
                status: 200,
                message: `Search executed successfully. No documents found for pattern: "${pattern}"`,
                data: {
                    pattern: pattern,
                    index_name: index_name,
                    storage_type: "unknown",
                    total_hits: totalHits,
                    results: [],
                },
            };
        }

        return {
            status: 200,
            message: "Search completed successfully.",
            data: {
                pattern: pattern,
                index_name: index_name,
                took_ms: response.data.took,
                total_hits: totalHits,
                results: searchResults,
            },
        };
    } catch (error) {
        return {
            status: error.status || 500,
            message: "Failed to search documents with regex pattern.",
            error: error.response
                ? error.response.data
                : error.message || "Unknown error",
        };
    }
};

export const SearchRegexPattern = async (req, res) => {
    try {
        const { pattern, index_name } = req.body;

        // Validate required parameters
        if (!pattern) {
            return res.status(400).json({
                message: "Regex pattern is required for search.",
            });
        }
        if (!index_name) {
            return res.status(400).json({
                message: "Index name is required for search.",
            });
        }

        const response = await utilitySearchRegexPattern(pattern, index_name);

        if (response.status !== 200) {
            return res.status(response.status).json({
                message: response.message,
                error: response.error,
            });
        }

        res.status(response.status).json({
            message: response.message,
            data: response.data,
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to search documents with regex pattern.",
            error: error.response
                ? error.response.data
                : error.message || "Unknown error",
        });
    }
};