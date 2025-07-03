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
  const filteredMessages = searchTerm
    ? allMessages.filter((item) => {
        const searchLower = searchTerm.toLowerCase();
        if (searchType === "AWS") {
          // AWS: Search by format
          return item.format.toLowerCase().includes(searchLower);
        } else {
          // Azure: Search by keyword
          return (
            item.keywords.some((keyword) =>
              keyword.toLowerCase().includes(searchLower),
            ) || item.message.toLowerCase().includes(searchLower)
          );
        }
      })
    : allMessages;

  const handleHelp = () => {
    console.log("Help clicked");
  };

  const handleSearchTypeChange = (e) => {
    setSearchType(e.target.value);
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
          onSearchChange={() => {}}
          onLogout={onLogout}
          showSearch={false}
        />

        <div className="search-content">
          <div className="sensitive-data-title">Sensitive data</div>
          <div className="main-search-bar">
            <div className="state-layer">
              <div className="leading-icon">
                <div className="leading-icon-content">
                  <div className="leading-icon-state-layer">
                    <div>
                      <svg
                        className="menu-icon"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 18V16H21V18H3ZM3 13V11H21V13H3ZM3 8V6H21V8H3Z"
                          fill="#49454F"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="search-content-input">
                <input
                  type="text"
                  className="search-input-field"
                  placeholder={
                    searchType === "AWS"
                      ? "Search by format (e.g., csv, txt)"
                      : "Search by keyword"
                  }
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
              <div className="trailing-elements">
                <div className="trailing-icon">
                  <div className="trailing-icon-content">
                    <div className="trailing-icon-state-layer">
                      <div>
                        <svg
                          className="search-icon-large"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M19.6 21L13.3 14.7C12.8 15.1 12.225 15.4167 11.575 15.65C10.925 15.8833 10.2333 16 9.5 16C7.68333 16 6.14583 15.3708 4.8875 14.1125C3.62917 12.8542 3 11.3167 3 9.5C3 7.68333 3.62917 6.14583 4.8875 4.8875C6.14583 3.62917 7.68333 3 9.5 3C11.3167 3 12.8542 3.62917 14.1125 4.8875C15.3708 6.14583 16 7.68333 16 9.5C16 10.2333 15.8833 10.925 15.65 11.575C15.4167 12.225 15.1 12.8 14.7 13.3L21 19.6L19.6 21ZM9.5 14C10.75 14 11.8125 13.5625 12.6875 12.6875C13.5625 11.8125 14 10.75 14 9.5C14 8.25 13.5625 7.1875 12.6875 6.3125C11.8125 5.4375 10.75 5 9.5 5C8.25 5 7.1875 5.4375 6.3125 6.3125C5.4375 7.1875 5 8.25 5 9.5C5 10.75 5.4375 11.8125 6.3125 12.6875C7.1875 13.5625 8.25 14 9.5 14Z"
                            fill="#49454F"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
            </select>
          </div>

          {/* Data Table */}
          <div className="data-table-container">
            <div className="table-bg" />
            <div className="table-content">
              {/* Table Headers and Rows */}
              <div className="table-divider table-divider-0" />
              <div className="table-divider table-divider-1" />
              <div className="table-divider table-divider-2" />
              <div className="table-divider table-divider-3" />
              <div className="table-divider table-divider-4" />
              <div className="table-divider table-divider-5" />

              {/* File Names Column */}
              <div className="file-name-column">
                <div className="column-header">File Name</div>
                {filteredMessages.map((item, index) => (
                  <div
                    key={item.id}
                    className="file-name-item"
                    style={{ top: `${75 + index * 147}px` }}
                  >
                    {item.fileName}
                  </div>
                ))}
              </div>

              {/* Resources Column */}
              <div className="resources-column">
                <div className="column-header">Resources</div>
                {filteredMessages.map((item, index) => (
                  <div
                    key={item.id}
                    className="resource-path"
                    style={{ top: `${75 + index * 147}px` }}
                  >
                    {item.resource}
                  </div>
                ))}
              </div>

              {/* Severity Column */}
              <div className="severity-column">
                <div className="column-header">Serverity</div>
                {filteredMessages.map((item, index) => (
                  <div
                    key={item.id}
                    className={`severity-badge severity-${item.severity}`}
                    style={{ top: `${75 + index * 147}px` }}
                  >
                    <div
                      className={`severity-bg severity-bg-${item.severity}`}
                    />
                    <div className="severity-text">
                      {item.severity.charAt(0).toUpperCase() +
                        item.severity.slice(1)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Updated At Column */}
              <div className="updated-at-column">
                <div className="column-header">Updated at</div>
                {filteredMessages.map((item, index) => (
                  <div
                    key={item.id}
                    className="update-time"
                    style={{ top: `${75 + index * 147}px` }}
                  >
                    {item.updatedAt}
                  </div>
                ))}
              </div>

              {/* Message Column */}
              <div className="message-column">
                <div className="column-header">Message</div>
                {filteredMessages.map((item, index) => (
                  <div
                    key={item.id}
                    className="alert-message"
                    style={{ top: `${75 + index * 147}px` }}
                  >
                    {item.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Search;
