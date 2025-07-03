import React, { useState } from "react";
import "./LogManager.css";

function LogManager({ headerComponent }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  const allLogs = [
    {
      id: 1,
      timestamp: "2024-01-15 14:32:15",
      level: "error",
      source: "container-a",
      message: "Failed to scan file: bank.csv - Access denied",
      details: "File permissions insufficient for security scan",
    },
    {
      id: 2,
      timestamp: "2024-01-15 14:30:42",
      level: "warning",
      source: "bucket-a",
      message: "Sensitive data pattern detected in train.csv",
      details: "Credit card numbers found in column 3",
    },
    {
      id: 3,
      timestamp: "2024-01-15 14:28:33",
      level: "info",
      source: "system",
      message: "Security scan completed for container-a",
      details: "Scanned 12 files, found 3 issues",
    },
    {
      id: 4,
      timestamp: "2024-01-15 14:25:18",
      level: "debug",
      source: "bucket-b",
      message: "Connection established successfully",
      details: "AWS S3 bucket connected with read permissions",
    },
    {
      id: 5,
      timestamp: "2024-01-15 14:22:07",
      level: "error",
      source: "container-b",
      message: "Network timeout during file transfer",
      details: "Failed to upload temp.csv after 3 retry attempts",
    },
    {
      id: 6,
      timestamp: "2024-01-15 14:20:55",
      level: "info",
      source: "system",
      message: "Daily backup completed successfully",
      details: "All container data backed up to secure storage",
    },
    {
      id: 7,
      timestamp: "2024-01-15 14:18:41",
      level: "warning",
      source: "bucket-a",
      message: "Large file detected: archive.csv (15.7MB)",
      details: "File size exceeds recommended limit for real-time scanning",
    },
    {
      id: 8,
      timestamp: "2024-01-15 14:15:29",
      level: "info",
      source: "container-a",
      message: "New file uploaded: config.json",
      details: "Configuration file added to settings directory",
    },
    {
      id: 9,
      timestamp: "2024-01-15 14:12:16",
      level: "debug",
      source: "system",
      message: "Scheduled maintenance started",
      details: "System optimization and cleanup in progress",
    },
    {
      id: 10,
      timestamp: "2024-01-15 14:10:03",
      level: "error",
      source: "bucket-a",
      message: "Authentication failed for AWS S3",
      details: "Invalid credentials provided for bucket access",
    },
    {
      id: 11,
      timestamp: "2024-01-15 14:08:47",
      level: "info",
      source: "container-b",
      message: "File quarantined: suspicious.exe",
      details: "Potential malware detected and isolated",
    },
    {
      id: 12,
      timestamp: "2024-01-15 14:05:32",
      level: "warning",
      source: "system",
      message: "High CPU usage detected",
      details: "System resources at 85% capacity during scan",
    },
  ];

  // Filter logs based on search term and level
  const filteredLogs = allLogs.filter((log) => {
    const matchesSearch =
      searchTerm === "" ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLevel = filterLevel === "all" || log.level === filterLevel;

    return matchesSearch && matchesLevel;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const paginatedLogs = filteredLogs.slice(
    startIndex,
    startIndex + logsPerPage,
  );

  const handleExport = () => {
    console.log("Exporting logs...");
    // Add export logic here
  };

  const handleViewDetails = (log) => {
    console.log("Viewing log details:", log);
    // Add modal or detailed view logic here
  };

  const logStats = [
    {
      value: filteredLogs.filter((log) => log.level === "error").length,
      label: "Errors",
    },
    {
      value: filteredLogs.filter((log) => log.level === "warning").length,
      label: "Warnings",
    },
    {
      value: filteredLogs.filter((log) => log.level === "info").length,
      label: "Info",
    },
    {
      value: filteredLogs.filter((log) => log.level === "debug").length,
      label: "Debug",
    },
  ];

  return (
    <div className="main-content">
      {headerComponent}

      <div className="log-controls">
        <input
          type="text"
          className="log-search-input"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="log-filter-select"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
        >
          <option value="all">All Levels</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        <button className="log-export-button" onClick={handleExport}>
          Export Logs
        </button>
      </div>

      <div className="log-stats">
        {logStats.map((stat, index) => (
          <div key={index} className="log-stat">
            <div className="log-stat-value">{stat.value}</div>
            <div className="log-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="logs-table-card">
        <div className="logs-table">
          <div className="logs-table-header">
            <div>Timestamp</div>
            <div>Level</div>
            <div>Source</div>
            <div>Message</div>
            <div>Actions</div>
          </div>
          {paginatedLogs.map((log) => (
            <div key={log.id} className="logs-table-row">
              <div className="log-timestamp">{log.timestamp}</div>
              <div>
                <span className={`log-level ${log.level}`}>{log.level}</span>
              </div>
              <div className="log-source">{log.source}</div>
              <div className="log-message">{log.message}</div>
              <div className="log-actions">
                <button
                  className="log-action-button"
                  onClick={() => handleViewDetails(log)}
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="log-pagination">
          <div className="log-pagination-info">
            Showing {startIndex + 1}-
            {Math.min(startIndex + logsPerPage, filteredLogs.length)} of{" "}
            {filteredLogs.length} logs
          </div>
          <div className="log-pagination-controls">
            <button
              className="log-pagination-button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, index) => {
              const pageNum = index + 1;
              return (
                <button
                  key={pageNum}
                  className={`log-pagination-button ${currentPage === pageNum ? "active" : ""}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="log-pagination-button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LogManager;
