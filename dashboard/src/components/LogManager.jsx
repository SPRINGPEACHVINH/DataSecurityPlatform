import React, { useState, useEffect } from "react";
import "./LogManager.css";

function LogManager({ headerComponent }) {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  useEffect(() => {
    async function fetchLogs() {
      try {
        // Prioritize MongoDB first
        const response = await fetch("http://localhost:4000/api/aws/access-logs", {
          credentials: "include",
        });
        const result = await response.json();

        if (response.ok && Array.isArray(result.data)) {
          const transformed = result.data.map((log, index) => ({
            id: index + 1,
            timestamp: log.time || "N/A",
            requester: log.requester || "-",
            operation: log.operation || "-",
            statusCode: log.statusCode || "-",
            level:
              log.statusCode === "200"
                ? "info"
                : log.statusCode?.startsWith("4")
                ? "warning"
                : "error",
          }));
          setLogs(transformed);
        } else {
          console.warn("Failed to load logs:", result);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      }
    }

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const searchMatch =
      log.operation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.requester.toLowerCase().includes(searchTerm.toLowerCase());

    const levelMatch = filterLevel === "all" || log.level === filterLevel;

    return searchMatch && levelMatch;
  });

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const paginatedLogs = filteredLogs.slice(
    startIndex,
    startIndex + logsPerPage
  );

  const handleExport = () => {
    console.log("Export logs...");
  };

  const handleViewDetails = (log) => {
    alert(`Status: ${log.statusCode}`);
  };

  const logStats = ["error", "warning", "info"].map((level) => ({
    label: level.charAt(0).toUpperCase() + level.slice(1),
    value: filteredLogs.filter((log) => log.level === level).length,
  }));

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
        </select>
        <button className="log-export-button" onClick={handleExport}>
          Export Logs
        </button>
      </div>

      <div className="log-stats">
        {logStats.map((stat, idx) => (
          <div key={idx} className="log-stat">
            <div className="log-stat-value">{stat.value}</div>
            <div className="log-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="logs-table-card">
        <div className="logs-table">
          <div className="logs-table-header">
            <div>Time</div>
            <div>Requester</div>
            <div>Operation</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          {paginatedLogs.map((log) => (
            <div key={log.id} className="logs-table-row">
              <div>{log.timestamp}</div>
              <div>{log.requester}</div>
              <div>{log.operation}</div>
              <div>
                <span className={`log-level ${log.level}`}>{log.statusCode}</span>
              </div>
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
            {Math.min(startIndex + logsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
          </div>
          <div className="log-pagination-controls">
            <button
              className="log-pagination-button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            {Array.from(
              { length: Math.min(totalPages, 5) },
              (_, i) => i + 1
            ).map((num) => (
              <button
                key={num}
                className={`log-pagination-button ${
                  currentPage === num ? "active" : ""
                }`}
                onClick={() => setCurrentPage(num)}
              >
                {num}
              </button>
            ))}
            <button
              className="log-pagination-button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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
