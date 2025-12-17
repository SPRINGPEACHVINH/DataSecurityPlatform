import React, { useState, useEffect } from "react";
import "./Search.css";
import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";

function Search({
  onLogout,
  onNavigateToDataSources,
  onNavigateToOverview,
  onNavigateToLogManager,
  onNavigateToMisconfig,
  onNavigateToConnectorSetup,
}) {
  const [scriptStatus, setScriptStatus] = useState({
    isReady: false,
    checks: {},
    loading: true,
    recommendations: [],
  });

  const [searchType, setSearchType] = useState(() => {
    return localStorage.getItem("searchType") || "AWS";
  });

  const [searchMode, setSearchMode] = useState(() => {
    return localStorage.getItem("searchMode") || "keyword";
  });

  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem("searchTerm") || "";
  });

  const [filePath, setFilePath] = useState(() => {
    return localStorage.getItem("filePath") || "";
  });

  const [serverSearchResults, setServerSearchResults] = useState(() => {
    const saved = localStorage.getItem("serverSearchResults");
    return saved ? JSON.parse(saved) : [];
  });

  // Other states
  const [documentsData, setDocumentsData] = useState([]);
  const [connectionData, setConnectionData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "serverSearchResults",
      JSON.stringify(serverSearchResults)
    );
  }, [serverSearchResults]);

  useEffect(() => {
    localStorage.setItem("searchType", searchType);
  }, [searchType]);

  useEffect(() => {
    localStorage.setItem("searchMode", searchMode);
  }, [searchMode]);

  useEffect(() => {
    localStorage.setItem("searchTerm", searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem("filePath", filePath);
  }, [filePath]);

  useEffect(() => {
    checkScriptStatus();
  }, []);

  // Function to check if script is ready
  const checkScriptStatus = async () => {
    try {
      const response = await fetch(
        "http://localhost:4000/api/dashboard/script-status",
        {
          method: "GET",
          credentials: "include",
          headers: {
            Cookie: localStorage.getItem("sessionId") || "",
          },
        }
      );
      const result = await response.json();

      if (response.ok) {
        setScriptStatus({
          isReady: result.data.isReady,
          checks: result.data.checks,
          loading: false,
          recommendations: result.data.recommendations,
          paths: result.data.paths,
        });
      } else {
        setScriptStatus({
          isReady: false,
          checks: {},
          loading: false,
          recommendations: [`Failed to check script status: ${result.message}`],
        });
      }
    } catch (error) {
      console.error("Error checking script status:", error);
      setScriptStatus({
        isReady: false,
        checks: {},
        loading: false,
        recommendations: [
          "Failed to connect to server for script status check",
        ],
      });
    }
  };

  const queryServerResults = async (outputFile) => {
    try {
      if (outputFile === null) {
        const emptyResult = {
          fileName: "No files found",
          filePath: "N/A",
          matchCount: 0,
          lineNumbers: [],
          isEmpty: true,
        };

        setServerSearchResults([emptyResult]);

        return;
      }

      const response = await fetch(
        "http://localhost:4000/api/dashboard/script-results",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Cookie: localStorage.getItem("sessionId") || "",
          },
          body: JSON.stringify({
            outputFile: outputFile,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        const rawData = result.data || {};
        const serverResults = [];

        Object.entries(rawData).forEach(([filePath, lineNumbers]) => {
          const fileName = filePath.split("\\").pop() || filePath;
          const totalMatches = Array.isArray(lineNumbers)
            ? lineNumbers.length
            : 0;

          serverResults.push({
            fileName: fileName,
            filePath: filePath,
            matchCount: totalMatches,
            lineNumbers: lineNumbers,
            isEmpty: false,
          });
        });

        if (serverResults.length > 0) {
          setServerSearchResults(serverResults);
        } else {
          const emptyResult = {
            fileName: "No files found",
            filePath: "N/A",
            matchCount: 0,
            lineNumbers: [],
            isEmpty: true,
          };

          setServerSearchResults([emptyResult]);
          alert("No sensitive data found in the specified files.");
        }
      } else {
        console.error("Failed to query server results:", result.message);
        alert(`Failed to load search results: ${result.message}`);
      }
    } catch (error) {
      console.error("Error querying server results:", error);
      alert("An error occurred while loading search results.");
    }
  };

  // Fetch documents from API
  useEffect(() => {
    async function fetchDocuments() {
      try {
        const response = await fetch(
          "http://localhost:4000/api/dashboard/elasticsearch/connector",
          {
            credentials: "include",
            headers: {
              Cookie: localStorage.getItem("sessionId") || "",
            },
          }
        );
        const data = await response.json();

        const docResponse = await fetch(
          "http://localhost:4000/api/dashboard/elasticsearch/documents",
          {
            credentials: "include",
            headers: {
              Cookie: localStorage.getItem("sessionId") || "",
            },
          }
        );
        const docData = await docResponse.json();

        if (docData && docData.data) {
          setDocumentsData(docData.data);
          setConnectionData(data.data);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    }
    fetchDocuments();
  }, []);

  // Extract connection data function (same as DataSources.jsx)
  const extractConnectionData = (documents, connectionData) => {
    const containers = [...new Set(documents.map((doc) => doc.container))];

    return containers.map((container) => {
      // Find document for this container to get its index
      const containerDoc = documents.find((doc) => doc.container === container);
      const containerIndex = containerDoc ? containerDoc.index : null;

      // Find connection data matching this container's index
      const connection =
        connectionData.find((conn) => conn.name === containerIndex) || {};

      // Count files in this container
      const containerDocuments = documents.filter(
        (doc) => doc.container === container
      );
      const fileCount = containerDocuments.length;

      return {
        name: container,
        type: connection.type || "Unknown",
        status: connection.status || "Unknown",
        fileCount: fileCount,
        records: null,
      };
    });
  };

  // Get extracted connection data
  const extractedConnectionData = extractConnectionData(
    documentsData,
    connectionData
  );

  // Handle search button click or Enter key
  const handleSearchClick = async () => {
    // Pattern search mode - works for all storage types
    if (searchMode === "pattern") {
      if (!searchTerm.trim()) {
        alert("Please enter a pattern to search.");
        return;
      }

      // Get selected connection's index_name based on searchType
      let selectedIndexName = null;

      if (searchType === "AWS") {
        const s3Connector = connectionData.find((conn) => conn.type === "s3");
        selectedIndexName = s3Connector ? s3Connector.name : null;
      } else if (searchType === "Azure") {
        const azureConnector = connectionData.find(
          (conn) => conn.type === "azure_blob_storage"
        );
        selectedIndexName = azureConnector ? azureConnector.name : null;
      } else if (searchType === "Server") {
        alert("Pattern search is not supported for Server search type.");
        return;
      }

      if (!selectedIndexName) {
        alert(`No ${searchType} connector found with an index name.`);
        return;
      }

      setIsLoading(true);
      setSearchResults([]);

      try {
        const response = await fetch(
          "http://localhost:4000/api/dashboard/search",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Cookie: localStorage.getItem("sessionId") || "",
            },
            body: JSON.stringify({
              search_type: "pattern",
              pattern: searchTerm.trim(),
              index_name: selectedIndexName,
            }),
          }
        );

        const result = await response.json();

        if (response.ok && result.data && result.data.data) {
          const searchData = result.data.data;
          const results = searchData.results || [];
          console.log("Pattern search results:", results);
          
          // Transform the results to match the expected format
          const transformedResults = results.map((item) => ({
            id: item.id,
            index: item.index,
            container: item.container,
            title: item.title,
            size: item.size,
            size_unit: item.content_type ? "KB" : item.size_unit || "KB", // Default to KB if not specified
            storage_type: item.storage_type,
            updated_at: item.updated_at,
            content_type: item.content_type,
          }));

          setSearchResults(transformedResults);

          if (transformedResults.length === 0) {
            alert("No results found for the specified pattern.");
          } else {
            alert(
              `Found ${transformedResults.length} results for pattern "${searchTerm}" in ${searchType} storage`
            );
          }
        } else {
          console.error("Pattern search failed:", result.message);
          alert(`Search failed: ${result.message || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Error during pattern search:", error);
        alert("An error occurred during the search. Please try again.");
      } finally {
        setIsLoading(false);
      }
      return; // Exit early for pattern mode
    }

    // Keyword search mode (existing logic)
    if (searchType === "Azure") {
      setIsLoading(true);
      setSearchResults([]);
      try {
        const azureConnectors = connectionData.filter(
          (conn) => conn.type === "azure_blob_storage"
        );

        if (azureConnectors.length === 0) {
          alert("No Azure Blob Storage connectors found");
          setIsLoading(false);
          return;
        }

        let allSearchResults = [];

        for (const azureConnector of azureConnectors) {
          try {
            const searchData = {
              search_type: "keyword",
              keyword: searchTerm.trim(),
              index_name: azureConnector.name,
            };

            const response = await fetch(
              "http://localhost:4000/api/dashboard/search",
              {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  Cookie: localStorage.getItem("sessionId") || "",
                },
                body: JSON.stringify(searchData),
              }
            );

            if (response.ok) {
              const result = await response.json();

              if (result.data.data && result.data.data.results) {
                // Map results to consistent format
                const mappedResults = result.data.data.results.map((item) => ({
                  id: item.id,
                  index: item.index,
                  container: item.container,
                  title: item.title,
                  size: item.size,
                  storage_type: item.storage_type,
                  updated_at: item.updated_at,
                  searchKeyword: searchTerm.trim(),
                }));

                allSearchResults = allSearchResults.concat(mappedResults);
              }
            } else {
              const result = await response.json();
              console.warn(
                `Search failed for ${azureConnector.name}:`,
                result.data.message
              );
            }
          } catch (connectorError) {
            console.warn(
              `Search failed for connector ${azureConnector.name}:`,
              connectorError
            );
          }
        }

        if (allSearchResults.length > 0) {
          setSearchResults(allSearchResults);
          alert(
            `Found ${allSearchResults.length} results for "${searchTerm}" in Azure storage`
          );
        } else {
          setSearchResults([]);
          alert(`No results found for "${searchTerm}" in Azure storage`);
        }
      } catch (error) {
        console.error("Error during Azure search:", error);
        alert("An error occurred during the Azure search. Please try again.");
      } finally {
        setIsLoading(false);
      }
    } else if (searchType === "Server") {
      if (!searchTerm.trim() || !filePath.trim()) {
        alert("Please enter a keyword and file path for Server search");
        return;
      }

      // Kiểm tra script status trước khi search
      if (!scriptStatus.isReady) {
        alert("Script is not ready. Please check the script status.");
        return;
      }

      setIsLoading(true);

      try {
        const normalizedPath = filePath.trim().replace(/\//g, "\\");

        const searchData = {
          sharePath: normalizedPath,
          keyword: searchTerm.trim(),
        };

        const response = await fetch(
          "http://localhost:4000/api/dashboard/script-execution",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Cookie: localStorage.getItem("sessionId") || "",
            },
            body: JSON.stringify(searchData),
          }
        );

        const result = await response.json();

        if (response.ok) {
          if (result.data.searchComplete) {
            await queryServerResults(result.data.outputFile);
          } else {
            alert(
              `Server search initiated but status unknown:\n${JSON.stringify(
                result.data,
                null,
                2
              )}`
            );
          }
        } else {
          alert(`❌ Server search failed: ${result.message}`);
        }
      } catch (error) {
        console.error("Error during Server search:", error);
        alert("An error occurred during the Server search. Please try again.");
      } finally {
        setIsLoading(false);
      }
    } else if (searchType === "AWS") {
      setIsLoading(true);
      setSearchResults([]);
      try {
        const s3Connectors = connectionData.filter(
          (conn) => conn.type === "s3"
        );

        if (s3Connectors.length === 0) {
          alert("No S3 connectors found");
          setIsLoading(false);
          return;
        }

        let allSearchResults = [];

        for (const s3Connector of s3Connectors) {
          try {
            const searchData = {
              search_type: "keyword",
              keyword: searchTerm.trim(),
              index_name: s3Connector.name,
            };

            const response = await fetch(
              "http://localhost:4000/api/dashboard/search",
              {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  Cookie: localStorage.getItem("sessionId") || "",
                },
                body: JSON.stringify(searchData),
              }
            );

            if (response.ok) {
              const result = await response.json();

              if (result.data.data && result.data.data.results) {
                // Map results to consistent format
                const mappedResults = result.data.data.results.map((item) => ({
                  id: item.id,
                  index: item.index,
                  container: item.container,
                  title: item.title,
                  size: item.size,
                  storage_type: item.storage_type,
                  updated_at: item.updated_at,
                  searchKeyword: searchTerm.trim(),
                }));

                allSearchResults = allSearchResults.concat(mappedResults);
              }
            } else {
              const result = await response.json();
              console.warn(
                `Search failed for ${s3Connectors.name}:`,
                result.data.message
              );
            }
          } catch (connectorError) {
            console.warn(
              `Search failed for connector ${s3Connectors.name}:`,
              connectorError
            );
          }
        }

        if (allSearchResults.length > 0) {
          setSearchResults(allSearchResults);
          alert(
            `Found ${allSearchResults.length} results for "${searchTerm}" in S3 storage`
          );
        } else {
          setSearchResults([]);
          alert(`No results found for "${searchTerm}" in S3 storage`);
        }
      } catch (error) {
        console.error("Error during S3 search:", error);
        alert("An error occurred during the S3 search. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearchClick();
    }
  };

  // Filter connection data based on search type
  const filteredConnections = extractedConnectionData.filter((connection) => {
    if (searchType === "AWS") {
      return (
        connection.type.toLowerCase().includes("aws") ||
        connection.type.toLowerCase().includes("s3") ||
        connection.type.toLowerCase().includes("amazon")
      );
    } else if (searchType === "Azure") {
      return (
        connection.type.toLowerCase().includes("azure") ||
        connection.type.toLowerCase().includes("blob") ||
        connection.type.toLowerCase().includes("microsoft")
      );
    }
    // For Server type, we don't show the table
    return false;
  });

  const handleSearchTypeChange = (e) => {
    setSearchType(e.target.value);
    setSearchTerm("");
    setFilePath("");

    setServerSearchResults([]);
    setSearchResults([]);

    localStorage.removeItem("searchTerm");
    localStorage.removeItem("filePath");
    localStorage.removeItem("serverSearchResults");
    localStorage.removeItem("searchResults");
  };

  const handleSearchModeChange = (e) => {
    setSearchMode(e.target.value);
    setSearchTerm("");
    setFilePath("");

    setServerSearchResults([]);
    setSearchResults([]);

    localStorage.removeItem("searchTerm");
    localStorage.removeItem("filePath");
    localStorage.removeItem("serverSearchResults");
    localStorage.removeItem("searchResults");
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  // Handle clearing search
  const handleClearSearch = () => {
    setSearchTerm("");
    setFilePath("");
    setServerSearchResults([]);
    setSearchResults([]);

    localStorage.removeItem("searchTerm");
    localStorage.removeItem("filePath");
    localStorage.removeItem("serverSearchResults");
  };
  const handleLogout = () => {
    onLogout();
  };

  return (
    <div className="data-sources-container">
      <Sidebar
        currentPage="search"
        onNavigateToOverview={onNavigateToOverview}
        onNavigateToLogManager={onNavigateToLogManager}
        onNavigateToDataSources={onNavigateToDataSources}
        onNavigateToSearch={() => console.log("Already on search")}
        onNavigateToMisconfig={onNavigateToMisconfig}
        onNavigateToConnectorSetup={onNavigateToConnectorSetup}
      />

      <div className="main-content">
        <Header
          pageTitle="Search"
          searchTerm=""
          onSearchChange={() => {}}
          onLogout={handleLogout}
          showSearch={false}
        />

        <div className="search-content">
          <div className="sensitive-data-title">Sensitive data</div>
          
          {/* Search Mode Selection */}
          <div className="search-mode-container">
            <label htmlFor="search-mode-select" className="search-mode-label">
              Search Mode:
            </label>
            <select
              id="search-mode-select"
              className="search-mode-select"
              value={searchMode}
              onChange={handleSearchModeChange}
              disabled={isLoading || searchType === "Server"}
            >
              <option value="keyword">Keyword Search</option>
              <option value="pattern">Pattern Search</option>
            </select>
          </div>

          <div className="search-bar-row">
            {searchMode === "pattern" ? (
              <div className="pattern-select-container">
                <label htmlFor="pattern-select" className="pattern-select-label">
                  Select Pattern:
                </label>
                <select
                  id="pattern-select"
                  className="pattern-select-dropdown"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">-- Select a Pattern --</option>
                  <option value="PT001">CCCD</option>
                  <option value="PT002">PCI-DSS</option>
                </select>
              </div>
            ) : (
              <div className="main-search-bar">
                <div className="state-layer">
                  <div className="leading-icon">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        cx="11"
                        cy="11"
                        r="7"
                        stroke="#774aa4"
                        strokeWidth="2"
                      />
                      <line
                        x1="16.018"
                        y1="16.4853"
                        x2="20"
                        y2="20.4853"
                        stroke="#774aa4"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="search-content-input">
                    <input
                      type="text"
                      className="search-input-field"
                      placeholder={
                        searchType === "AWS"
                          ? "Enter keyword to search in AWS (e.g., sensitive, credit card)"
                          : searchType === "Azure"
                          ? "Enter keyword to search in Azure (e.g., password, SSN)"
                          : "Enter keyword to search in Server files"
                      }
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="trailing-elements">
                    {searchTerm && (
                      <button
                        className="clear-search-button"
                        onClick={handleClearSearch}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M18 6L6 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M6 6L18 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {searchType === "Server" && searchMode === "keyword" && (
              <input
                type="text"
                className="file-path-input inline"
                placeholder="Enter file path (e.g., C:\\pathto\\folder)"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                disabled={isLoading}
              />
            )}

            {/* {searchType === "AWS" && (
              <select
                className="aws-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isLoading}
              >
                <option value="">All Categories</option>
                <option value="CREDENTIALS">CREDENTIALS</option>
                <option value="FINANCIAL_INFORMATION">
                  FINANCIAL_INFORMATION
                </option>
                <option value="PERSONAL_INFORMATION">
                  PERSONAL_INFORMATION
                </option>
                <option value="MEDICAL_INFORMATION">MEDICAL_INFORMATION</option>
              </select>
            )} */}

            <button
              className="search-button"
              onClick={handleSearchClick}
              disabled={
                isLoading ||
                !searchTerm.trim() ||
                (searchType === "Server" && searchMode === "keyword" && !filePath.trim())
              }
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Search Type Select */}
          <div className="search-type-container">
            <label htmlFor="search-type-select" className="search-type-label">
              Search Type:
            </label>
            <select
              id="search-type-select"
              className="search-type-select"
              value={searchType}
              onChange={handleSearchTypeChange}
              disabled={isLoading}
            >
              <option value="AWS">AWS</option>
              <option value="Azure">Azure</option>
              <option value="Server">Server</option>
            </select>
          </div>

          {/* Show search parameters */}
          {searchTerm && (
            <div className="search-parameters">
              <strong>Search Parameters:</strong>
              <div>• {searchMode === "pattern" ? "Pattern" : "Keyword"}: "{searchTerm}"</div>
              <div>• Mode: {searchMode === "pattern" ? "Pattern Search" : "Keyword Search"}</div>
              <div>• Type: {searchType}</div>
              {searchType === "Server" && searchMode === "keyword" && filePath && (
                <div>• File Path: {filePath}</div>
              )}
            </div>
          )}

          {/* Data Table - Only show for AWS and Azure */}
          {(searchType === "Azure" ||
            (searchType === "AWS" && searchResults.length === 0)) && (
            <div className="data-table-container">
              <div className="table-content">
                <div className="table-row table-header">
                  <div className="container-name-column column-header">
                    Container Name
                  </div>
                  <div className="source-type-column column-header">
                    Source Type
                  </div>
                  <div className="file-count-column column-header">
                    File Count
                  </div>
                </div>
                {filteredConnections.length > 0 ? (
                  filteredConnections.map((connection, index) => (
                    <div className="table-row" key={index}>
                      <div className="container-name-column">
                        {connection.name}
                      </div>
                      <div
                        className={`source-type-column ${
                          connection.type.toLowerCase().includes("aws") ||
                          connection.type.toLowerCase().includes("s3")
                            ? "source-aws"
                            : connection.type.toLowerCase().includes("azure")
                            ? "source-azure"
                            : "source-server"
                        }`}
                      >
                        {connection.type.toLowerCase().includes("aws") ||
                        connection.type.toLowerCase().includes("s3")
                          ? "AWS"
                          : connection.type.toLowerCase().includes("azure")
                          ? "Azure"
                          : "Server"}
                      </div>
                      <div className="file-count-column">
                        {connection.fileCount}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="table-row">
                    <div className="container-name-column no-containers-message">
                      No {searchType} containers available
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Script Status Section - Only for Server search */}
          {searchType === "Server" && (
            <div
              className={`script-status-section ${
                scriptStatus.isReady ? "ready" : "not-ready"
              }`}
            >
              <div className="script-status-header">
                <h3
                  className={scriptStatus.isReady ? "ready" : "not-ready"}
                >
                  Script Status:{" "}
                  {scriptStatus.loading
                    ? "Checking..."
                    : scriptStatus.isReady
                    ? "Ready"
                    : "Not Ready"}
                </h3>
              </div>

              {/* Detailed status checks */}
              {!scriptStatus.isReady && (
                <div className="script-status-checks">
                  <div className="script-status-checks-grid">
                    <div>
                      <strong>Script File:</strong>{" "}
                      {scriptStatus.checks.scriptExists
                        ? "✅ Found"
                        : "❌ Not Found"}
                    </div>
                    <div>
                      <strong>Script Readable:</strong>{" "}
                      {scriptStatus.checks.scriptReadable ? "✅ Yes" : "❌ No"}
                    </div>
                    <div>
                      <strong>Base Directory:</strong>{" "}
                      {scriptStatus.checks.baseDirectoryExists
                        ? "✅ Exists"
                        : "❌ Missing"}
                    </div>
                    <div>
                      <strong>Directory Writable:</strong>{" "}
                      {scriptStatus.checks.baseDirectoryWritable
                        ? "✅ Yes"
                        : "❌ No"}
                    </div>
                    <div>
                      <strong>PowerShell:</strong>{" "}
                      {scriptStatus.checks.powershellAvailable
                        ? "✅ Available"
                        : "❌ Not Available"}
                    </div>
                    <div>
                      <strong>Environment:</strong>{" "}
                      {scriptStatus.checks.environmentVariables?.BASE_DIRECTORY
                        ? "✅ Configured"
                        : "❌ Incomplete"}
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {scriptStatus.recommendations &&
                scriptStatus.recommendations.length > 0 && (
                  <div className="script-status-recommendations">
                    <strong>Recommendations:</strong>
                    <ul>
                      {scriptStatus.recommendations.map((rec, index) => (
                        <li key={index}>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Paths info */}
              {scriptStatus.paths && (
                <div className="script-status-paths">
                  <div>
                    <strong>Script Path:</strong>{" "}
                    {scriptStatus.paths.scriptPath}
                  </div>
                </div>
              )}

              <div className="server-search-placeholder">
                <div className="server-search-placeholder-icon">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <rect
                      x="2"
                      y="4"
                      width="20"
                      height="16"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle cx="8" cy="8" r="1" fill="currentColor" />
                    <circle cx="8" cy="12" r="1" fill="currentColor" />
                    <circle cx="8" cy="16" r="1" fill="currentColor" />
                  </svg>
                </div>
                <strong>Server File Search</strong>
                <div className="server-search-placeholder-subtitle">
                  Enter a file path and keyword to search for sensitive data in
                  server files
                </div>
              </div>
            </div>
          )}
          {/* AWS Search Results Table */}
          {searchType === "AWS" &&
            searchResults.length > 0 &&
            searchTerm.trim() && (
              <div className="data-table-container mt-24">
                <div className="search-results-header">
                  <h3 className="search-results-title">
                    AWS S3 {searchMode === "pattern" ? "Pattern" : "Keyword"} Search Results ({searchResults.length} files
                    found)
                  </h3>
                </div>

                <div className="table-content">
                  <div className="table-row table-header">
                    <div className="file-name-column column-header">
                      File Name
                    </div>
                    <div className="container-column column-header">
                      Container
                    </div>
                    <div className="index-column column-header">Index</div>
                    <div className="size-column column-header">Size</div>
                    <div className="storage-type-column column-header">
                      Storage
                    </div>
                    <div className="updated-at-column column-header">
                      Updated At
                    </div>
                  </div>
                  {searchResults.map((item, idx) => (
                    <div className="table-row" key={item.id || idx}>
                      <div className="file-name-column" title={item.title}>
                        📄 {item.title}
                      </div>
                      <div className="container-column">{item.container}</div>
                      <div className="index-column">
                        {item.index}
                      </div>
                      <div className="size-column">
                        {item.size ? `${item.size} ${item.size_unit || 'KB'}` : "N/A"}
                      </div>
                      <div className="storage-type-column">
                        <span className="storage-type-badge s3">
                          {item.storage_type?.toUpperCase() || "S3"}
                        </span>
                      </div>
                      <div className="updated-at-column">
                        {item.updated_at || "N/A"}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="search-results-summary">
                  <h4 className="search-summary-title">
                    AWS S3 Search Summary
                  </h4>
                  <div className="search-summary-grid">
                    <div>
                      <strong>Search {searchMode === "pattern" ? "Pattern" : "Keyword"}:</strong> "{searchTerm}"
                    </div>
                    <div>
                      <strong>Search Mode:</strong> {searchMode === "pattern" ? "Pattern Search" : "Keyword Search"}
                    </div>
                    <div>
                      <strong>Results Found:</strong> {searchResults.length}
                    </div>
                    <div>
                      <strong>Containers:</strong>{" "}
                      {[...new Set(searchResults.map((r) => r.container))].join(
                        ", "
                      )}
                    </div>
                    <div>
                      <strong>Indexes:</strong>{" "}
                      {[...new Set(searchResults.map((r) => r.index))].join(
                        ", "
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          {/* Azure Search Results Table */}
          {searchType === "Azure" && searchResults.length > 0 && (
            <div className="data-table-container mt-24">
              <div className="search-results-header">
                <h3 className="search-results-title">
                  Azure {searchMode === "pattern" ? "Pattern" : "Keyword"} Search Results ({searchResults.length} files found)
                </h3>
              </div>

              <div className="table-content">
                <div className="table-row table-header">
                  <div className="file-name-column column-header">
                    File Name
                  </div>
                  <div className="container-column column-header">
                    Container
                  </div>
                  <div className="index-column column-header">Index</div>
                  <div className="size-column column-header">Size</div>
                  <div className="storage-type-column column-header">
                    Storage
                  </div>
                  <div className="updated-at-column column-header">
                    Updated At
                  </div>
                </div>
                {searchResults.map((item, idx) => (
                  <div className="table-row" key={item.id || idx}>
                    <div className="file-name-column" title={item.title}>
                      📄 {item.title}
                    </div>
                    <div className="container-column">{item.container}</div>
                    <div className="index-column">
                      {item.index}
                    </div>
                    <div className="size-column">
                      {item.size ? `${item.size} ${item.size_unit || 'KB'}` : "N/A"}
                    </div>
                    <div className="storage-type-column">
                      <span className="storage-type-badge azure">
                        {item.storage_type?.toUpperCase() || "AZURE"}
                      </span>
                    </div>
                    <div className="updated-at-column">
                      {item.updated_at || "N/A"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Search Summary */}
              <div className="search-results-summary">
                <h4 className="search-summary-title">
                  📊 Azure Search Summary
                </h4>
                <div className="search-summary-grid">
                  <div>
                    <strong>Search {searchMode === "pattern" ? "Pattern" : "Keyword"}:</strong> "{searchTerm}"
                  </div>
                  <div>
                    <strong>Search Mode:</strong> {searchMode === "pattern" ? "Pattern Search" : "Keyword Search"}
                  </div>
                  <div>
                    <strong>Results Found:</strong> {searchResults.length}
                  </div>
                  <div>
                    <strong>Containers:</strong>{" "}
                    {[...new Set(searchResults.map((r) => r.container))].join(
                      ", "
                    )}
                  </div>
                  <div>
                    <strong>Indexes:</strong>{" "}
                    {[...new Set(searchResults.map((r) => r.index))].join(", ")}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Server Search Results Table */}
          {searchType === "Server" && serverSearchResults.length > 0 && (
            <div className="data-table-container mt-16">
              <div className="search-results-header">
                <h3
                  className={`search-results-title ${
                    serverSearchResults[0]?.isEmpty ? "error" : ""
                  }`}
                >
                  📄 Server Search Results{" "}
                  {serverSearchResults[0]?.isEmpty
                    ? "(No matches)"
                    : `(${serverSearchResults.length} files found)`}
                </h3>
                <div className="total-matches-info">
                  Total matches:{" "}
                  {serverSearchResults.reduce(
                    (sum, item) => sum + (item.matchCount || 0),
                    0
                  )}
                </div>
              </div>

              <div className="table-content">
                <div className="table-row table-header">
                  <div className="file-name-column column-header">
                    File Name
                  </div>
                  <div className="file-path-column column-header">
                    File Path
                  </div>
                  <div className="match-count-column column-header">
                    Matches
                  </div>
                  <div className="line-numbers-column column-header">
                    Line Numbers
                  </div>
                  <div className="file-size-column column-header">Size</div>
                </div>
                {serverSearchResults.map((item, idx) => (
                  <div
                    className={`table-row ${item.isEmpty ? "empty-result" : ""}`}
                    key={idx}
                  >
                    <div className="file-name-column" title={item.fileName}>
                      {item.isEmpty ? "❌" : "📄"} {item.fileName}
                    </div>
                    <div className="file-path-column" title={item.filePath}>
                      {item.filePath}
                    </div>
                    <div className="match-count-column">
                      <span
                        className={`match-count-badge ${
                          item.matchCount > 0 ? "has-matches" : "no-matches"
                        }`}
                      >
                        {item.matchCount || 0}
                      </span>
                    </div>
                    <div className="line-numbers-column">
                      <div className="line-numbers-display">
                        {item.lineNumbers && item.lineNumbers.length > 0 ? (
                          item.lineNumbers
                            .slice(0, 5)
                            .map((lineNum, lineIdx) => (
                              <span
                                key={lineIdx}
                                className="line-number-item"
                              >
                                {lineNum}
                              </span>
                            ))
                        ) : (
                          <span className="line-numbers-na">
                            {item.isEmpty ? "No matches" : "N/A"}
                          </span>
                        )}
                        {item.lineNumbers && item.lineNumbers.length > 5 && (
                          <span className="line-numbers-more">
                            +{item.lineNumbers.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="file-size-column">{item.fileSize}</div>
                  </div>
                ))}
              </div>

              {/* Conditional Summary based on isEmpty */}
              <div
                className={`search-results-summary ${
                  serverSearchResults[0]?.isEmpty ? "error-summary" : ""
                }`}
              >
                <h4 className="search-summary-title">
                  📊 Search Summary
                </h4>
                <div className="search-summary-grid">
                  <div>
                    <strong>Search Keyword:</strong> "{searchTerm}"
                  </div>
                  <div>
                    <strong>Search Path:</strong> {filePath}
                  </div>
                  <div>
                    <strong>Files Found:</strong>{" "}
                    {serverSearchResults[0]?.isEmpty
                      ? 0
                      : serverSearchResults.length}
                  </div>
                  <div>
                    <strong>Total Matches:</strong>{" "}
                    {serverSearchResults.reduce(
                      (sum, item) => sum + (item.matchCount || 0),
                      0
                    )}
                  </div>
                </div>

                {/* Add status message for empty results */}
                {serverSearchResults[0]?.isEmpty && (
                  <div className="search-status-message">
                    <strong>Search Status:</strong> The search completed
                    successfully but no files containing the keyword "
                    {searchTerm}" were found in the specified path.
                  </div>
                )}
              </div>

              {/* Conditional File Details */}
              {!serverSearchResults[0]?.isEmpty && (
                <div className="file-details-section">
                  <h4 className="file-details-title">
                    📋 File Details
                  </h4>
                  <div className="file-details-container">
                    {serverSearchResults.map((item, idx) => (
                      <div
                        key={idx}
                        className="file-detail-item"
                      >
                        <div className="file-detail-header">
                          <div className="file-detail-name">
                            📄 {item.fileName}
                          </div>
                          <div className="file-detail-match-count">
                            {item.matchCount} matches
                          </div>
                        </div>

                        <div className="file-detail-path">
                          Path: {item.filePath}
                        </div>

                        {item.lineNumbers && item.lineNumbers.length > 0 && (
                          <div className="file-detail-lines">
                            <strong>Found on lines:</strong>{" "}
                            {item.lineNumbers.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Search;
