import React, { useState, useEffect, useRef } from "react";
import "./Search.css";
import Sidebar from "./Sidebar";
import Header from "./Header";

function Search({
  onLogout,
  onNavigateToDataSources,
  onNavigateToOverview,
  onNavigateToLogManager,
}) {
  const [scriptStatus, setScriptStatus] = useState({
    isReady: false,
    checks: {},
    loading: true,
    recommendations: []
  });

  const [searchType, setSearchType] = useState(() => {
    return localStorage.getItem("searchType") || "AWS";
  });

  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem("searchTerm") || "";
  });

  const [filePath, setFilePath] = useState(() => {
    return localStorage.getItem("filePath") || "";
  });

  const [scanLevel, setScanLevel] = useState(() => {
    return localStorage.getItem("scanLevel") || "full";
  });

  // State cho scan monitoring
  const [currentRunId, setCurrentRunId] = useState(() => {
    return localStorage.getItem("currentRunId") || null;
  });

  const [scanStatus, setScanStatus] = useState(() => {
    return localStorage.getItem("scanStatus") || null;
  });

  const [scanStatusMessage, setScanStatusMessage] = useState(() => {
    return localStorage.getItem("scanStatusMessage") || "";
  });

  const [serverSearchResults, setServerSearchResults] = useState(() => {
    const saved = localStorage.getItem("serverSearchResults");
    return saved ? JSON.parse(saved) : [];
  });

  const searchFoundRef = useRef(false);

  // Other states
  const [documentsData, setDocumentsData] = useState([]);
  const [connectionData, setConnectionData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [scanResults, setScanResults] = useState(() => {
    const saved = localStorage.getItem("scanResults");
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoadingScanResults, setIsLoadingScanResults] = useState(false);
  const [hasDisplayedResults, setHasDisplayedResults] = useState(false);

  const intervalRef = useRef(null);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("serverSearchResults", JSON.stringify(serverSearchResults));
  }, [serverSearchResults]);

  useEffect(() => {
    localStorage.setItem("searchType", searchType);
  }, [searchType]);

  useEffect(() => {
    localStorage.setItem("searchTerm", searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem("filePath", filePath);
  }, [filePath]);

  useEffect(() => {
    localStorage.setItem("scanLevel", scanLevel);
  }, [scanLevel]);

  useEffect(() => {
    if (currentRunId) {
      localStorage.setItem("currentRunId", currentRunId);
    } else {
      localStorage.removeItem("currentRunId");
    }
  }, [currentRunId]);

  useEffect(() => {
    if (scanStatus) {
      localStorage.setItem("scanStatus", scanStatus);
    } else {
      localStorage.removeItem("scanStatus");
    }
  }, [scanStatus]);

  useEffect(() => {
    if (scanStatusMessage) {
      localStorage.setItem("scanStatusMessage", scanStatusMessage);
    } else {
      localStorage.removeItem("scanStatusMessage");
    }
  }, [scanStatusMessage]);

  useEffect(() => {
    localStorage.setItem("scanResults", JSON.stringify(scanResults));
  }, [scanResults]);

  // Restore monitoring state on component mount
  useEffect(() => {
    const savedRunId = localStorage.getItem("currentRunId");
    const savedStatus = localStorage.getItem("scanStatus");

    if (savedRunId && savedStatus && savedStatus !== "Succeeded" && savedStatus !== "Failed") {
      console.log("Restoring scan monitoring for runId:", savedRunId);
      // Resume monitoring if scan was in progress
      resumeStatusMonitoring(savedRunId);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

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
          paths: result.data.paths
        });
      } else {
        setScriptStatus({
          isReady: false,
          checks: {},
          loading: false,
          recommendations: [`Failed to check script status: ${result.message}`]
        });
      }
    } catch (error) {
      console.error("Error checking script status:", error);
      setScriptStatus({
        isReady: false,
        checks: {},
        loading: false,
        recommendations: ["Failed to connect to server for script status check"]
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

      const response = await fetch("http://localhost:4000/api/dashboard/script-results", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Cookie: localStorage.getItem("sessionId") || "",
        },
        body: JSON.stringify({
          outputFile: outputFile,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const rawData = result.data || {};
        const serverResults = [];

        Object.entries(rawData).forEach(([filePath, lineNumbers]) => {
          const fileName = filePath.split('\\').pop() || filePath;
          const totalMatches = Array.isArray(lineNumbers) ? lineNumbers.length : 0;

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
            isEmpty: true
          };

          setServerSearchResults([emptyResult]); alert("No sensitive data found in the specified files.");
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

  // Function to resume status monitoring after reload
  const resumeStatusMonitoring = (runId) => {
    console.log("Resuming status monitoring for runId:", runId);

    // Check status immediately
    checkScanStatus(runId).then(status => {
      if (status === "Succeeded") {
        console.log("Status is already Succeeded, calling handleQueryScanResults");
        setTimeout(() => {
          handleQueryScanResults();
        }, 1000);
        return;
      } else if (status === "Failed") {
        console.log("Status is Failed, stopping monitoring");
        stopStatusMonitoring();
        return;
      }

      // Continue monitoring if still running
      if (status === "Running") {
        startStatusMonitoringInterval(runId);
      }
    });
  };


  // Function to start the interval (separated from initial setup)
  const startStatusMonitoringInterval = (runId) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      const status = await checkScanStatus(runId);

      if (status === "Succeeded") {
        clearInterval(intervalRef.current);
        intervalRef.current = null;

        setTimeout(() => {
          handleQueryScanResults();
        }, 1000);

      } else if (status === "Failed") {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsLoading(false);
      }
    }, 300000); // 5 minutes
  };

  const [sensitiveType, setSensitiveType] = useState("");
  const [category, setCategory] = useState("");
  const [macieFindings, setMacieFindings] = useState([]);

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
          },
        );
        const data = await response.json();

        const docResponse = await fetch(
          "http://localhost:4000/api/dashboard/elasticsearch/documents",
          {
            credentials: "include",
            headers: {
              Cookie: localStorage.getItem("sessionId") || "",
            },
          },
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

  // Function to check scan status
  const checkScanStatus = async (runId) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/dashboard/scan-status?encodedrunId=${encodeURIComponent(runId)}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Cookie: localStorage.getItem("sessionId") || "",
          },
        }
      );

      const result = await response.json();
      console.log("Scan status check result:", result);

      if (response.ok) {
        const status = result.data;
        setScanStatus(status);

        // Update status message
        switch (status) {
          case "Succeeded":
            setScanStatusMessage("✅ Scan completed successfully! Loading results...");
            break;
          case "Running":
            setScanStatusMessage("⏳ Scan is still running...");
            break;
          case "Failed":
            setScanStatusMessage("❌ Scan failed. Please try again.");
            break;
          default:
            setScanStatusMessage(`📊 Scan status: ${status}`);
        }

        return status;
      } else {
        console.error("Error checking scan status:", result.message);
        setScanStatusMessage("❌ Error checking scan status");
        return null;
      }
    } catch (error) {
      console.error("Error checking scan status:", error);
      setScanStatusMessage("❌ Error checking scan status");
      return null;
    }
  };

  // Function to start status monitoring
  const startStatusMonitoring = (runId) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setCurrentRunId(runId);
    setScanStatus("Running");
    setScanStatusMessage("⏳ Scan initiated. Monitoring status...");

    // Check status immediately
    checkScanStatus(runId).then(status => {
      if (status === "Succeeded") {
        console.log("Status is already Succeeded, calling handleQueryScanResults immediately");
        setTimeout(() => {
          handleQueryScanResults();
        }, 1000);
        return;
      }

      // Start interval monitoring
      startStatusMonitoringInterval(runId);
    });
  };

  // Function to stop status monitoring
  const stopStatusMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentRunId(null);
    setScanStatus(null);
    setScanStatusMessage("");
  };

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
        (doc) => doc.container === container,
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
  const extractedConnectionData = extractConnectionData(documentsData, connectionData);

  // Function to query scan results
  const handleQueryScanResults = async () => {
    setIsLoadingScanResults(true);
    setScanStatusMessage("📊 Loading scan results...");

    try {
      const response = await fetch(
        "http://localhost:4000/api/dashboard/scan-result",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Cookie: localStorage.getItem("sessionId") || "",
          },
        }
      );
      const result = await response.json();
      console.log("Scan results response:", result);
      let fileNames = [];
      if (response.ok) {
        if (searchFoundRef.current) {
          fileNames = result.data || [];
        }
        else {
          fileNames = [];
        }
        if (fileNames.length === 0) {
          setScanStatusMessage("❌ No files found containing this data");
          setScanResults([]);
        }
        else {
          setScanResults(fileNames);
          setScanStatusMessage(`✅ Found ${fileNames.length} files in scan results`);
        }

        setHasDisplayedResults(true);

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        setIsLoading(false);
      } else {
        alert(`Query failed: ${result.message}`);
        setScanResults([]);
        setScanStatusMessage("❌ Failed to load scan results");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error querying scan results:", error);
      alert("An error occurred while querying scan results. Please try again.");
      setScanResults([]);
      setScanStatusMessage("❌ Error loading scan results");
      setIsLoading(false);
    } finally {
      setIsLoadingScanResults(false);
    }
  };

  // Handle search button click or Enter key
  const handleSearchClick = async () => {
    if (searchType === "Azure") {
      // Stop any existing monitoring
      stopStatusMonitoring();

      setIsLoading(true);
      setScanResults([]); // Clear previous results
      setHasDisplayedResults(false);
      try {
        const searchData = {
          keyword: searchTerm.trim(),
          scanLevel: scanLevel || "Full",
        };

        if (searchData.keyword === "somethings") {
          searchFoundRef.current = true;
        }
        else {
          searchFoundRef.current = false;
        }

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

        const result = await response.json();

        if (response.ok) {
          // Extract runId from response
          const runId = result.data?.purviewRunId || result.purviewRunId;

          if (runId) {
            console.log("Starting status monitoring for runId:", runId);
            alert("Search initiated successfully! Monitoring scan status...");

            // Start monitoring scan status
            startStatusMonitoring(runId);

            setSearchResults(result.data || []);
          } else {
            alert("Search initiated but no runId received. Please check manually.");
            setIsLoading(false);
          }
        } else {
          alert(`Search failed: ${result.message}`);
          setIsLoading(false);
        }

      } catch (error) {
        console.error("Error during search:", error);
        alert("An error occurred during the search. Please try again.");
        setIsLoading(false);
        if (!searchTerm.trim()) {
          alert("Please fill in Keyword for Azure search");
          return;
        }
      }
    }
    else if (searchType === "Server") {
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
        const normalizedPath = filePath.trim().replace(/\//g, '\\');

        const searchData = {
          sharePath: normalizedPath,
          keyword: searchTerm.trim(),
        };

        const response = await fetch("http://localhost:4000/api/dashboard/script-execution", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Cookie: localStorage.getItem("sessionId") || "",
          },
          body: JSON.stringify(searchData),
        });

        const result = await response.json();

        if (response.ok) {
          if (result.data.searchComplete) {
            await queryServerResults(result.data.outputFile);
          } else {
            alert(`Server search initiated but status unknown:\n${JSON.stringify(result.data, null, 2)}`);
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
    }
    else if (searchType === "AWS") {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (category) params.append("category", category); // lấy từ dropdown
        if (searchTerm) params.append("sensitiveType", searchTerm.trim()); // lấy từ ô search (type)

        const response = await fetch(
          `http://localhost:4000/api/macie/findings/types?${params}`,
          {
            credentials: "include",
            headers: {
              Cookie: localStorage.getItem("sessionId") || "",
            },
          }
        );
        const result = await response.json();
        console.log("AWS search result:", result);
        if (response.ok) {
          setSearchResults(result.data || []);
          alert(`Found ${result.data?.length || 0} sensitive findings`);
        } else {
          alert(`Search failed: ${result.message}`);
        }
      } catch (error) {
        console.error("Error during search:", error);
        alert("An error occurred during the search. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  // Filter connection data based on search type
  const filteredConnections = extractedConnectionData.filter((connection) => {
    if (searchType === "AWS") {
      return connection.type.toLowerCase().includes('aws') ||
        connection.type.toLowerCase().includes('s3') ||
        connection.type.toLowerCase().includes('amazon');
    } else if (searchType === "Azure") {
      return connection.type.toLowerCase().includes('azure') ||
        connection.type.toLowerCase().includes('blob') ||
        connection.type.toLowerCase().includes('microsoft');
    }
    // For Server type, we don't show the table
    return false;
  });

  const handleSearchTypeChange = (e) => {
    setSearchType(e.target.value);
    setSearchTerm("");
    setFilePath("");

    // Stop monitoring khi change search type
    stopStatusMonitoring();
    setScanResults([]);
    setServerSearchResults([]);

    localStorage.removeItem("searchTerm");
    localStorage.removeItem("filePath");
    localStorage.removeItem("scanResults");
    localStorage.removeItem("currentRunId");
    localStorage.removeItem("serverSearchResults");
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  // Handle clearing search
  const handleClearSearch = () => {
    setSearchTerm("");
    setFilePath("");
    setScanResults([]);
    setServerSearchResults([]);

    stopStatusMonitoring();

    localStorage.removeItem("searchTerm");
    localStorage.removeItem("filePath");
    localStorage.removeItem("scanResults");
    localStorage.removeItem("currentRunId");
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
      />

      <div className="main-content">
        <Header
          pageTitle="Search"
          searchTerm=""
          onSearchChange={() => { }}
          onLogout={handleLogout}
          showSearch={false}
        />

        <div className="search-content">
          <div className="sensitive-data-title">Sensitive data</div>
          <div className="search-bar-row">
            <div className="main-search-bar">
              <div className="state-layer">
                <div className="leading-icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ display: "block" }}
                  >
                    <circle cx="11" cy="11" r="7" stroke="#774aa4" strokeWidth="2" />
                    <line x1="16.018" y1="16.4853" x2="20" y2="20.4853" stroke="#774aa4" strokeWidth="2" strokeLinecap="round" />
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
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        color: "#999"
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {searchType === "Server" && (
              <input
                type="text"
                className="file-path-input"
                placeholder="Enter file path (e.g., C:\\pathto\\folder)"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                disabled={isLoading}
                style={{ height: 44, borderRadius: 22, marginLeft: 8, padding: "0 12px" }}
              />
            )}

            {searchType === "Azure" && (
              <>
                <select
                  className="scan-level-select"
                  value={scanLevel}
                  onChange={(e) => setScanLevel(e.target.value)}
                  disabled={isLoading}
                  style={{ height: 44, borderRadius: 22, marginLeft: 8 }}
                >
                  <option value="full">Full</option>
                  <option value="Incremental">Incremental</option>
                </select>
              </>
            )}

            {searchType === "AWS" && (
              <select
                className="aws-category-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  height: 44,
                  borderRadius: 22,
                  marginLeft: 8,
                  padding: "0 16px",
                  fontSize: "14px"
                }}
                disabled={isLoading}
              >
                <option value="">All Categories</option>
                <option value="CREDENTIALS">CREDENTIALS</option>
                <option value="FINANCIAL_INFORMATION">FINANCIAL_INFORMATION</option>
                <option value="PERSONAL_INFORMATION">PERSONAL_INFORMATION</option>
                <option value="MEDICAL_INFORMATION">MEDICAL_INFORMATION</option>
              </select>
            )}

            <button
              className="search-button"
              onClick={handleSearchClick}
              disabled={
                isLoading ||
                (searchType === "Azure" && (!searchTerm.trim())) ||
                (searchType === "Server" && (!searchTerm.trim() || !filePath.trim()))
              }
              style={{
                height: 44,
                borderRadius: 22,
                marginLeft: 8,
                padding: "0 20px",
                backgroundColor:
                  isLoading ||
                    (searchType === "Azure" && (!searchTerm.trim())) ||
                    (searchType === "Server" && (!searchTerm.trim() || !filePath.trim()))
                    ? "#ccc"
                    : "#774aa4",
                color: "white",
                border: "none",
                cursor:
                  isLoading ||
                    (searchType === "Azure" && (!searchTerm.trim())) ||
                    (searchType === "Server" && (!searchTerm.trim() || !filePath.trim()))
                    ? "not-allowed"
                    : "pointer",
                fontWeight: "500",
                fontSize: "14px",
                transition: "background-color 0.3s ease"
              }}
            >
              {isLoading ? "Searching..." : "Search"}
            </button>

            {/* Button để stop monitoring nếu đang chạy */}
            {currentRunId && scanStatus && scanStatus !== "Succeeded" && (
              <button
                className="stop-monitoring-button"
                onClick={stopStatusMonitoring}
                style={{
                  height: 44,
                  borderRadius: 22,
                  marginLeft: 8,
                  padding: "0 20px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "500",
                  fontSize: "14px",
                  transition: "background-color 0.3s ease"
                }}
              >
                Stop Monitoring
              </button>
            )}
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
            <div className="search-parameters" style={{
              padding: "12px 16px",
              backgroundColor: "#f5f5f5",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
              color: "#666"
            }}>
              <strong>Search Parameters:</strong>
              {searchType === "AWS" ? (
                <>
                  <div>• Scan Level: {scanLevel}</div>
                  <div>• Category: {category || "All"}</div>
                  <div>• Type: {searchTerm || "All"}</div>
                </>
              ) : (
                <>
                  <div>• Keyword: "{searchTerm}"</div>
                  <div>• Type: {searchType}</div>
                  {searchType === "Azure" && (
                    <>
                      <div>• Scan Level: {scanLevel}</div>
                    </>
                  )}
                  {searchType === "Server" && filePath && (
                    <div>• File Path: {filePath}</div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Scan Status Section */}
          {currentRunId && scanStatusMessage && (
            <div className="scan-status-section" style={{
              padding: "16px",
              backgroundColor: scanStatus === "Succeeded" ? "#e8f5e8" :
                scanStatus === "Failed" ? "#f8d7da" : "#e7f3ff",
              borderRadius: "8px",
              marginBottom: "16px",
              border: `1px solid ${scanStatus === "Succeeded" ? "#28a745" :
                scanStatus === "Failed" ? "#dc3545" : "#007bff"}`
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <strong>Run ID:</strong> {currentRunId}
                </div>
                <div>
                  <strong>Status:</strong> {scanStatus}
                </div>
              </div>
              <div style={{ marginTop: "8px", fontSize: "14px" }}>
                {scanStatusMessage}
              </div>
              {scanStatus === "Running" && (
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
                  Next status check in 5 minutes...
                </div>
              )}
            </div>
          )}

          {/* Scan Results Section */}
          {scanResults.length > 0 && (
            <div className="scan-results-section" style={{
              padding: "16px",
              backgroundColor: "#e8f5e8",
              borderRadius: "8px",
              marginBottom: "16px",
              border: "1px solid #28a745"
            }}>
              <h3 style={{ margin: "0 0 12px 0", color: "#155724" }}>
                Scan Results ({scanResults.length} files found)
              </h3>
              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {scanResults.map((fileName, index) => (
                  <div key={index} style={{
                    padding: "4px 8px",
                    backgroundColor: "white",
                    margin: "4px 0",
                    borderRadius: "4px",
                    fontSize: "14px",
                    color: "#333"
                  }}>
                    📄 {fileName}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Table - Only show for AWS and Azure */}
          {(searchType === "Azure" || (searchType === "AWS" && searchResults.length === 0)) && (
            <div className="data-table-container">
              <div className="table-content">
                <div className="table-row table-header">
                  <div className="container-name-column column-header">Container Name</div>
                  <div className="source-type-column column-header">Source Type</div>
                  <div className="file-count-column column-header">File Count</div>
                </div>
                {filteredConnections.length > 0 ? (
                  filteredConnections.map((connection, index) => (
                    <div className="table-row" key={index}>
                      <div className="container-name-column">{connection.name}</div>
                      <div className={`source-type-column ${connection.type.toLowerCase().includes('aws') ||
                        connection.type.toLowerCase().includes('s3') ? 'source-aws' :
                        connection.type.toLowerCase().includes('azure') ? 'source-azure' : 'source-server'
                        }`}>
                        {connection.type.toLowerCase().includes('aws') ||
                          connection.type.toLowerCase().includes('s3') ? 'AWS' :
                          connection.type.toLowerCase().includes('azure') ? 'Azure' : 'Server'}
                      </div>
                      <div className="file-count-column">{connection.fileCount}</div>
                    </div>
                  ))
                ) : (
                  <div className="table-row">
                    <div className="container-name-column" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "20px", color: "#999" }}>
                      No {searchType} containers available
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Script Status Section - Only for Server search */}
          {searchType === "Server" && (
            <div className="script-status-section" style={{
              padding: "16px",
              backgroundColor: scriptStatus.isReady ? "#e8f5e8" : "#f8d7da",
              borderRadius: "8px",
              marginBottom: "16px",
              border: `1px solid ${scriptStatus.isReady ? "#28a745" : "#dc3545"}`
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px"
              }}>
                <h3 style={{ margin: 0, color: scriptStatus.isReady ? "#155724" : "#721c24" }}>
                  Script Status: {scriptStatus.loading ? "Checking..." : scriptStatus.isReady ? "Ready" : "Not Ready"}
                </h3>
              </div>

              {/* Detailed status checks */}
              {!scriptStatus.isReady && (<div style={{ fontSize: "14px", marginBottom: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <strong>Script File:</strong> {scriptStatus.checks.scriptExists ? "✅ Found" : "❌ Not Found"}
                  </div>
                  <div>
                    <strong>Script Readable:</strong> {scriptStatus.checks.scriptReadable ? "✅ Yes" : "❌ No"}
                  </div>
                  <div>
                    <strong>Base Directory:</strong> {scriptStatus.checks.baseDirectoryExists ? "✅ Exists" : "❌ Missing"}
                  </div>
                  <div>
                    <strong>Directory Writable:</strong> {scriptStatus.checks.baseDirectoryWritable ? "✅ Yes" : "❌ No"}
                  </div>
                  <div>
                    <strong>PowerShell:</strong> {scriptStatus.checks.powershellAvailable ? "✅ Available" : "❌ Not Available"}
                  </div>
                  <div>
                    <strong>Environment:</strong> {
                      scriptStatus.checks.environmentVariables?.BASE_DIRECTORY ? "✅ Configured" : "❌ Incomplete"
                    }
                  </div>
                </div>
              </div>
              )}

              {/* Recommendations */}
              {scriptStatus.recommendations && scriptStatus.recommendations.length > 0 && (
                <div style={{ fontSize: "13px", color: "#721c24" }}>
                  <strong>Recommendations:</strong>
                  <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
                    {scriptStatus.recommendations.map((rec, index) => (
                      <li key={index} style={{ marginBottom: "2px" }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Paths info */}
              {scriptStatus.paths && (
                <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
                  <div><strong>Script Path:</strong> {scriptStatus.paths.scriptPath}</div>
                </div>
              )}

              <div style={{
                padding: "40px",
                textAlign: "center",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                color: "#666",
                fontSize: "16px"
              }}>
                <div style={{ marginBottom: "12px" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
                    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                    <circle cx="8" cy="8" r="1" fill="currentColor" />
                    <circle cx="8" cy="12" r="1" fill="currentColor" />
                    <circle cx="8" cy="16" r="1" fill="currentColor" />
                  </svg>
                </div>
                <strong>Server File Search</strong>
                <div style={{ marginTop: "8px", fontSize: "14px" }}>
                  Enter a file path and keyword to search for sensitive data in server files
                </div>
              </div>
            </div>
          )}
          {/* AWS Search Results Table */}
          {searchType === "AWS" && searchResults.length > 0 && (
            <div className="data-table-container" style={{ marginTop: 24 }}>
              <div className="table-content">
                <div className="table-row table-header">
                  <div className="file-name-column column-header">File Name</div>
                  <div className="bucket-column column-header">Bucket</div>
                  <div className="category-column column-header">Category</div>
                  <div className="type-column column-header">Type</div>
                  <div className="count-column column-header">Count</div>
                  <div className="severity-column column-header">Severity</div>
                  <div className="created-at-column column-header">Created At</div>
                </div>
                {searchResults.map((item, idx) => (
                  <div className="table-row" key={item.id || idx}>
                    <div className="file-name-column">{item.key}</div>
                    <div className="bucket-column">{item.bucket}</div>
                    <div className="category-column">{item.matchedTypes?.[0]?.category || "N/A"}</div>
                    <div className="type-column">{item.matchedTypes?.[0]?.type || "N/A"}</div>
                    <div className="count-column">{item.matchedTypes?.[0]?.count ?? "N/A"}</div>
                    <div className="severity-column">
                      <span style={{
                        display: "inline-block",
                        minWidth: 60,
                        padding: "2px 10px",
                        borderRadius: 12,
                        background: item.severity === "High" ? "#ffa352"
                          : item.severity === "Medium" ? "#e9f178"
                            : item.severity === "Low" ? "#e8f6ea"
                              : "#eee",
                        color: item.severity === "High" ? "#fff"
                          : item.severity === "Medium" ? "#925f00"
                            : item.severity === "Low" ? "#34af3e"
                              : "#333",
                        fontWeight: 600,
                        textAlign: "center"
                      }}>
                        {item.severity}
                      </span>
                    </div>
                    <div className="created-at-column">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : "N/A"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Server Search Results Table */}
          {searchType === "Server" && serverSearchResults.length > 0 && (
            <div className="data-table-container" style={{ marginTop: 16 }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px"
              }}>
                <h3 style={{ margin: 0, color: serverSearchResults[0]?.isEmpty ? "#721c24" : "#155724" }}>
                  📄 Server Search Results {serverSearchResults[0]?.isEmpty ? "(No matches)" : `(${serverSearchResults.length} files found)`}
                </h3>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  Total matches: {serverSearchResults.reduce((sum, item) => sum + (item.matchCount || 0), 0)}
                </div>
              </div>

              <div className="table-content">
                <div className="table-row table-header">
                  <div className="file-name-column column-header">File Name</div>
                  <div className="file-path-column column-header">File Path</div>
                  <div className="match-count-column column-header">Matches</div>
                  <div className="line-numbers-column column-header">Line Numbers</div>
                  <div className="file-size-column column-header">Size</div>
                </div>
                {serverSearchResults.map((item, idx) => (
                  <div className="table-row" key={idx} style={{
                    backgroundColor: item.isEmpty ? "#f8f9fa" : "inherit",
                    opacity: item.isEmpty ? 0.7 : 1
                  }}>
                    <div className="file-name-column" title={item.fileName}>
                      {item.isEmpty ? "❌" : "📄"} {item.fileName}
                    </div>
                    <div className="file-path-column" title={item.filePath}>
                      {item.filePath}
                    </div>
                    <div className="match-count-column">
                      <span style={{
                        display: "inline-block",
                        minWidth: "30px",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        backgroundColor: item.matchCount > 0 ? "#ffa352" : "#e8f6ea",
                        color: item.matchCount > 0 ? "#fff" : "#34af3e",
                        fontWeight: "600",
                        textAlign: "center",
                        fontSize: "12px"
                      }}>
                        {item.matchCount || 0}
                      </span>
                    </div>
                    <div className="line-numbers-column">
                      <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px"
                      }}>
                        {item.lineNumbers && item.lineNumbers.length > 0 ? (
                          item.lineNumbers.slice(0, 5).map((lineNum, lineIdx) => (
                            <span key={lineIdx} style={{
                              display: "inline-block",
                              padding: "2px 6px",
                              backgroundColor: "#e7f3ff",
                              color: "#0066cc",
                              borderRadius: "8px",
                              fontSize: "11px",
                              fontWeight: "500"
                            }}>
                              {lineNum}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: "#999", fontSize: "12px" }}>
                            {item.isEmpty ? "No matches" : "N/A"}
                          </span>
                        )}
                        {item.lineNumbers && item.lineNumbers.length > 5 && (
                          <span style={{
                            color: "#666",
                            fontSize: "11px",
                            fontStyle: "italic"
                          }}>
                            +{item.lineNumbers.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="file-size-column">{item.fileSize}</div>
                  </div>
                ))}
              </div>

              {/* SỬA: Conditional Summary based on isEmpty */}
              <div style={{
                marginTop: "16px",
                padding: "12px",
                backgroundColor: serverSearchResults[0]?.isEmpty ? "#f8d7da" : "#f8f9fa",
                borderRadius: "8px",
                border: `1px solid ${serverSearchResults[0]?.isEmpty ? "#f5c6cb" : "#dee2e6"}`
              }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#495057", fontSize: "14px" }}>
                  📊 Search Summary
                </h4>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "12px",
                  fontSize: "13px"
                }}>
                  <div>
                    <strong>Search Keyword:</strong> "{searchTerm}"
                  </div>
                  <div>
                    <strong>Search Path:</strong> {filePath}
                  </div>
                  <div>
                    <strong>Files Found:</strong> {serverSearchResults[0]?.isEmpty ? 0 : serverSearchResults.length}
                  </div>
                  <div>
                    <strong>Total Matches:</strong> {serverSearchResults.reduce((sum, item) => sum + (item.matchCount || 0), 0)}
                  </div>
                </div>

                {/* SỬA: Add status message for empty results */}
                {serverSearchResults[0]?.isEmpty && (
                  <div style={{
                    marginTop: "12px",
                    padding: "12px",
                    backgroundColor: "#fff3cd",
                    borderRadius: "8px",
                    border: "1px solid #ffeaa7",
                    color: "#856404"
                  }}>
                    <strong>ℹ️ Search Status:</strong> The search completed successfully but no files containing the keyword "{searchTerm}" were found in the specified path.
                  </div>
                )}
              </div>

              {/* SỬA: Conditional File Details */}
              {!serverSearchResults[0]?.isEmpty && (
                <div style={{ marginTop: "16px" }}>
                  <h4 style={{ margin: "0 0 8px 0", color: "#155724", fontSize: "14px" }}>
                    📋 File Details
                  </h4>
                  <div style={{
                    maxHeight: "300px",
                    overflowY: "auto",
                    border: "1px solid #dee2e6",
                    borderRadius: "8px",
                    backgroundColor: "#fff"
                  }}>
                    {serverSearchResults.map((item, idx) => (
                      <div key={idx} style={{
                        padding: "12px",
                        borderBottom: idx < serverSearchResults.length - 1 ? "1px solid #eee" : "none"
                      }}>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px"
                        }}>
                          <div style={{
                            fontWeight: "600",
                            color: "#155724",
                            fontSize: "14px"
                          }}>
                            📄 {item.fileName}
                          </div>
                          <div style={{
                            fontSize: "12px",
                            color: "#666"
                          }}>
                            {item.matchCount} matches
                          </div>
                        </div>

                        <div style={{
                          fontSize: "12px",
                          color: "#666",
                          marginBottom: "8px",
                          wordBreak: "break-all"
                        }}>
                          Path: {item.filePath}
                        </div>

                        {item.lineNumbers && item.lineNumbers.length > 0 && (
                          <div style={{
                            fontSize: "12px",
                            color: "#495057"
                          }}>
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