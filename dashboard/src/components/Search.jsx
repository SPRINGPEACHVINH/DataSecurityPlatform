import React, { useState, useEffect } from "react";
import "./Search.css";
import Sidebar from "./Sidebar";
import Header from "./Header";

function Search({
  onLogout,
  onNavigateToDataSources,
  onNavigateToOverview,
  onNavigateToLogManager,
}) {
  const [searchType, setSearchType] = useState("AWS");
  const [searchTerm, setSearchTerm] = useState("");
  const [filePath, setFilePath] = useState("");
  const [scanLevel, setScanLevel] = useState("full");
  const [ruleName, setRuleName] = useState("");
  const [classificationName, setClassificationName] = useState("");
  const [documentsData, setDocumentsData] = useState([]);
  const [connectionData, setConnectionData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [scanResults, setScanResults] = useState([]);
  const [isLoadingScanResults, setIsLoadingScanResults] = useState(false);

  // Helper function to get source type from container
  const getSourceType = (container, index) => {
    const connectionByIndex = connectionData.find(conn => conn.name === index);
    if (connectionByIndex) {
      return connectionByIndex.type;
    }

    const connectionByName = connectionData.find(conn => conn.name === container);
    if (connectionByName) {
      return connectionByName.type;
    }

    return "Unknown";
  };

  // Convert documents to search format
  const convertDocumentsToMessages = (documents) => {
    return documents.map((doc, index) => {
      const sourceType = getSourceType(doc.container, doc.index);

      let formattedDate = "1 day ago";
      if (doc.updated_at) {
        try {
          const date = new Date(doc.updated_at);
          const now = new Date();
          const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
          formattedDate = diffDays === 0 ? "Today" : `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } catch (e) {
          formattedDate = "1 day ago";
        }
      }

      return {
        id: index + 1,
        fileName: doc.title || "Unknown",
        resource: doc.id || "Unknown",
        updatedAt: formattedDate,
        format: doc.title ? doc.title.split('.').pop().toLowerCase() : "unknown",
        container: doc.container,
        sourceType: sourceType,
        keywords: [
          sourceType.toLowerCase(),
          doc.title ? doc.title.split('.').pop().toLowerCase() : "unknown",
          "sensitive",
          "serviceadmin"
        ]
      };
    });
  };

  // Get all messages from documents
  const allMessages = convertDocumentsToMessages(documentsData);

  // Function to query scan results
  const handleQueryScanResults = async () => {
    if (!classificationName.trim()) {
      alert("Please enter a classification name to query scan results");
      return;
    }

    setIsLoadingScanResults(true);
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
          body: JSON.stringify({
            classificationName: classificationName.trim(),
          }),
        }
      );

      const result = await response.json();
      console.log("Scan results:", result);

      if (response.ok) {
        const fileNames = result.data || [];
        setScanResults(fileNames);
        alert(`Found ${fileNames.length} files in scan results`);
      } else {
        alert(`Query failed: ${result.message}`);
        setScanResults([]);
      }
    } catch (error) {
      console.error("Error querying scan results:", error);
      alert("An error occurred while querying scan results. Please try again.");
      setScanResults([]);
    } finally {
      setIsLoadingScanResults(false);
    }
  };

  // Handle search button click or Enter key
  const handleSearchClick = async () => {
    // Validate required fields
    if (!searchTerm.trim()) {
      alert("Please enter a keyword to search");
      return;
    }

    if (searchType === "Azure") {
      if (!ruleName.trim() || !classificationName.trim()) {
        alert("Please fill in Rule Name and Classification Name for Azure search");
        return;
      }
    }

    if (searchType === "Server") {
      if (!filePath.trim()) {
        alert("Please enter a file path for Server search");
        return;
      }
    }

    setIsLoading(true);
    try {
      const searchData = {
        keyword: searchTerm.trim(),
        scanLevel: scanLevel || "Full",
        ruleName: ruleName.trim() || `rule-${Date.now()}`,
        classificationName: classificationName.trim() || `classification-${Date.now()}`,
      };

      console.log("Sending search request:", searchData);

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
      console.log("Search result:", result);

      if (response.ok) {
        alert("Search initiated successfully! Check the scan results for updates.");
        setSearchResults(result.data || []);
      } else {
        alert(`Search failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Error during search:", error);
      alert("An error occurred during the search. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  // Filter messages based on search type and term
  const filteredMessages = allMessages.filter((item) => {
    // First filter by search type (source type)
    let typeMatch = true;
    if (searchType === "AWS") {
      typeMatch = item.sourceType.toLowerCase().includes('aws');
    } else if (searchType === "Azure") {
      typeMatch = item.sourceType.toLowerCase().includes('azure');
    } else if (searchType === "Server") {
      typeMatch = !item.sourceType.toLowerCase().includes('aws') &&
        !item.sourceType.toLowerCase().includes('azure');
    }

    if (!typeMatch) return false;

    // Then filter by search term if provided (for display purposes)
    if (searchType === "Server" && filePath) {
      const filePathLower = filePath.toLowerCase();
      return item.resource.toLowerCase().includes(filePathLower) &&
        (searchTerm ? (item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.resource.toLowerCase().includes(searchTerm.toLowerCase())) : true);
    } else if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (searchType === "AWS") {
        return item.format.toLowerCase().includes(searchLower) ||
          item.fileName.toLowerCase().includes(searchLower);
      } else if (searchType === "Azure") {
        return item.keywords.some((keyword) =>
          keyword.toLowerCase().includes(searchLower)
        ) || item.fileName.toLowerCase().includes(searchLower);
      } else if (searchType === "Server") {
        return item.fileName.toLowerCase().includes(searchLower) ||
          item.resource.toLowerCase().includes(searchLower);
      }
    }

    return true;
  });

  const handleSearchTypeChange = (e) => {
    setSearchType(e.target.value);
    setSearchTerm("");
    setFilePath("");
    setRuleName("");
    setClassificationName("");
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  // Handle clearing search
  const handleClearSearch = () => {
    setSearchTerm("");
    setFilePath("");
    setRuleName("");
    setClassificationName("");
    setScanResults([]);
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
          onLogout={onLogout}
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
                        <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
                placeholder="Enter file path (e.g., \\\\server\\share\\folder)"
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
                <input
                  type="text"
                  className="rule-name-input"
                  placeholder="Rule name (required for Azure)"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  disabled={isLoading}
                  style={{ height: 44, borderRadius: 22, marginLeft: 8, padding: "0 12px" }}
                />
                <input
                  type="text"
                  className="classification-name-input"
                  placeholder="Classification name (required for Azure)"
                  value={classificationName}
                  onChange={(e) => setClassificationName(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  disabled={isLoading}
                  style={{ height: 44, borderRadius: 22, marginLeft: 8, padding: "0 12px" }}
                />
              </>
            )}
            
            <button
              className="search-button"
              onClick={handleSearchClick}
              disabled={isLoading || !searchTerm.trim()}
              style={{
                height: 44,
                borderRadius: 22,
                marginLeft: 8,
                padding: "0 20px",
                backgroundColor: isLoading || !searchTerm.trim() ? "#ccc" : "#774aa4",
                color: "white",
                border: "none",
                cursor: isLoading || !searchTerm.trim() ? "not-allowed" : "pointer",
                fontWeight: "500",
                fontSize: "14px",
                transition: "background-color 0.3s ease"
              }}
            >
              {isLoading ? "Searching..." : "Search"}
            </button>

            {/* NEW: Query Results Button */}
            <button
              className="query-results-button"
              onClick={handleQueryScanResults}
              disabled={isLoadingScanResults || !classificationName.trim()}
              style={{
                height: 44,
                borderRadius: 22,
                marginLeft: 8,
                padding: "0 20px",
                backgroundColor: isLoadingScanResults || !classificationName.trim() ? "#ccc" : "#28a745",
                color: "white",
                border: "none",
                cursor: isLoadingScanResults || !classificationName.trim() ? "not-allowed" : "pointer",
                fontWeight: "500",
                fontSize: "14px",
                transition: "background-color 0.3s ease"
              }}
            >
              {isLoadingScanResults ? "Querying..." : "Query Results"}
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
            <div className="search-parameters" style={{ 
              padding: "12px 16px", 
              backgroundColor: "#f5f5f5", 
              borderRadius: "8px", 
              marginBottom: "16px",
              fontSize: "14px",
              color: "#666"
            }}>
              <strong>Search Parameters:</strong>
              <div>• Keyword: "{searchTerm}"</div>
              <div>• Type: {searchType}</div>
              {searchType === "Azure" && (
                <>
                  <div>• Scan Level: {scanLevel}</div>
                  {ruleName && <div>• Rule Name: {ruleName}</div>}
                  {classificationName && <div>• Classification: {classificationName}</div>}
                </>
              )}
              {searchType === "Server" && filePath && (
                <div>• File Path: {filePath}</div>
              )}
            </div>
          )}

          {/* NEW: Scan Results Section */}
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

          {/* Data Table */}
          <div className="data-table-container">
            <div className="table-content">
              <div className="table-row table-header">
                <div className="file-name-column column-header">File Name</div>
                <div className="resources-column column-header">Resources</div>
                <div className="source-type-column column-header">Source Type</div>
                <div className="updated-at-column column-header">Updated at</div>
              </div>
              {filteredMessages.length > 0 ? (
                filteredMessages.map((item) => (
                  <div className="table-row" key={item.id}>
                    <div className="file-name-column">{item.fileName}</div>
                    <div className="resources-column">{item.resource}</div>
                    <div className={`source-type-column ${
                      item.sourceType.toLowerCase().includes('aws') ? 'source-aws' :
                      item.sourceType.toLowerCase().includes('azure') ? 'source-azure' :
                      'source-server'
                    }`}>
                      {item.sourceType.toLowerCase().includes('aws') ? 'AWS' :
                       item.sourceType.toLowerCase().includes('azure') ? 'Azure' : 'Server'}
                    </div>
                    <div className="updated-at-column">{item.updatedAt}</div>
                  </div>
                ))
              ) : (
                <div className="table-row">
                  <div className="file-name-column" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "20px", color: "#999" }}>
                    {searchTerm || filePath ? 
                      `No results found for "${searchTerm || filePath}" in ${searchType}` : 
                      `No ${searchType} documents available`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Search;