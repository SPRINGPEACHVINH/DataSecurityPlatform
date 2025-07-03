import React, { useState } from "react";
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

  // Sample data for messages
  const allMessages = [
    {
      id: 1,
      fileName: "train.csv",
      resource: "bucket-a/archive_2/DeSSI_v2/test/",
      severity: "low",
      updatedAt: "1 day ago",
      message:
        '⚠️ Alert: Sensitive file "train.csv" found in Azure Blob Storage.\nClassification: [Find Keywords]\nUser: ServiceAdmin | Risk Score: 33.95\nURL: https://forelk.blob.core.windows.net/data/train.csv',
      format: "csv",
      keywords: ["sensitive", "azure", "keywords", "serviceadmin"],
    },
    {
      id: 2,
      fileName: "bank.csv",
      resource: "bucket-a/archive_2/DeSSI_v2/standard_data/",
      severity: "critical",
      updatedAt: "1 day ago",
      message:
        '⚠️ Alert: Sensitive file "bank.csv" found in AWS S3 Storage.\nClassification: [Credit Card Data]\nUser: AdminUser | Risk Score: 89.5\nURL: https://s3.amazonaws.com/bucket/bank.csv',
      format: "csv",
      keywords: ["sensitive", "aws", "credit", "card", "adminuser"],
    },
    {
      id: 3,
      fileName: "dev.txt",
      resource: "bucket-a/archive_2/dessi/",
      severity: "medium",
      updatedAt: "1 day ago",
      message:
        '⚠️ Alert: Sensitive file "dev.txt" found in Azure Blob Storage.\nClassification: [API Keys]\nUser: Developer | Risk Score: 65.2\nURL: https://forelk.blob.core.windows.net/data/dev.txt',
      format: "txt",
      keywords: ["sensitive", "azure", "api", "keys", "developer"],
    },
    {
      id: 4,
      fileName: "archive.csv",
      resource: "bucket-a/data/credentials",
      severity: "high",
      updatedAt: "1 day ago",
      message:
        '⚠️ Alert: Sensitive file "archive.csv" found in AWS S3 Storage.\nClassification: [Personal Data]\nUser: SystemAdmin | Risk Score: 78.3\nURL: https://s3.amazonaws.com/bucket/archive.csv',
      format: "csv",
      keywords: ["sensitive", "aws", "personal", "data", "systemadmin"],
    },
  ];

  // Filter messages based on search type and term
  const filteredMessages =
    (searchType === "Server" ? filePath || searchTerm : searchTerm)
      ? allMessages.filter((item) => {
        const searchLower = searchTerm.toLowerCase();
        const filePathLower = filePath.toLowerCase();
        if (searchType === "AWS") {
          return item.format.toLowerCase().includes(searchLower);
        } else if (searchType === "Azure") {
          return (
            item.keywords.some((keyword) =>
              keyword.toLowerCase().includes(searchLower)
            ) || item.message.toLowerCase().includes(searchLower)
          );
        } else if (searchType === "Server") {
          return (
            item.resource.toLowerCase().includes(filePathLower) &&
            (item.fileName.toLowerCase().includes(searchLower) ||
              item.message.toLowerCase().includes(searchLower))
          );
        }
        return true;
      })
      : allMessages;

  const handleSearchTypeChange = (e) => {
    setSearchType(e.target.value);
    setSearchTerm("");
    setFilePath("");
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
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
                  {/* Search icon SVG */}
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
                        ? "Search by format (e.g., csv, txt)"
                        : searchType === "Server"
                          ? "Enter keyword"
                          : "Search by keyword"
                    }
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>
                <div className="trailing-elements">
                  {/* ...icon code... */}
                </div>
              </div>
            </div>
            {searchType === "Server" && (
              <input
                type="text"
                className="file-path-input"
                placeholder="Enter file path"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
              />
            )}
            {searchType === "Azure" && (
              <>
                <select
                  className="scan-level-select"
                  value={scanLevel}
                  onChange={(e) => setScanLevel(e.target.value)}
                  style={{ height: 44, borderRadius: 22, marginLeft: 8 }}
                >
                  <option value="full">Full</option>
                  <option value="quick">Quick</option>
                </select>
                <input
                  type="text"
                  className="rule-name-input"
                  placeholder="Rule name"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  style={{ height: 44, borderRadius: 22, marginLeft: 8, padding: "0 12px" }}
                />
                <input
                  type="text"
                  className="classification-name-input"
                  placeholder="Classification name"
                  value={classificationName}
                  onChange={(e) => setClassificationName(e.target.value)}
                  style={{ height: 44, borderRadius: 22, marginLeft: 8, padding: "0 12px" }}
                />
              </>
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
            >
              <option value="AWS">AWS</option>
              <option value="Azure">Azure</option>
              <option value="Server">Server</option>
            </select>
          </div>

          {/* Data Table */}
          <div className="data-table-container">
            <div className="table-content">
              {/* Header */}
              <div className="table-row table-header">
                <div className="file-name-column column-header">File Name</div>
                <div className="resources-column column-header">Resources</div>
                <div className="severity-column column-header">Severity</div>
                <div className="updated-at-column column-header">Updated at</div>
                <div className="message-column column-header">Message</div>
              </div>
              {/* Data rows */}
              {filteredMessages.map((item) => (
                <div className="table-row" key={item.id}>
                  <div className="file-name-column">{item.fileName}</div>
                  <div className="resources-column">{item.resource}</div>
                  <div className={`severity-column severity-badge severity-${item.severity}`}>
                    <div className={`severity-bg severity-bg-${item.severity}`} />
                    <div className="severity-text">
                      {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
                    </div>
                  </div>
                  <div className="updated-at-column">{item.updatedAt}</div>
                  <div className="message-column alert-message">{item.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Search;
