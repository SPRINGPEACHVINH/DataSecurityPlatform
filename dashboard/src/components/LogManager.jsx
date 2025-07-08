import React, { useState, useEffect } from "react";
import "./LogManager.css";

function exportLogsToCSV(logs) {
  if (!logs.length) return;

  const headers = Object.keys(logs[0]).filter(
    (k) => k !== "level" && k !== "statusText"
  ); // bỏ các trường hiển thị phụ
  const csvRows = [];

  // Add header
  csvRows.push(headers.join(","));

  // Add rows
  logs.forEach((log) => {
    const values = headers.map((key) => {
      const val = log[key] ?? "";
      // Escape double quotes
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  });

  // Create blob and trigger download
  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "logs_export.csv";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseLogMessage(message) {
  try {
    const quoted = [...message.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    const unquoted = message.replace(/"[^"]*"/g, "QUOTED");
    const parts = unquoted.trim().split(/\s+/);

    const timeMatch = message.match(/\[(.*?)\]/);

    return {
      bucketOwner: parts[0] || "-",
      bucket: parts[1] || "-",
      time: timeMatch ? timeMatch[1] : null,
      remoteIP: parts[4] || "-",
      requester: parts[5] || "-",
      requestId: parts[6] || "-",
      operation: parts[7] || "-",
      objectKey: parts[8] || "-",
      requestURI: quoted[0] || "-",
      statusCode: parts[10] || "-",
      bytesSent: parts[11] || "-",
      objectSize: parts[12] || "-",
      totalTime: parts[13] || "-",
      turnaroundTime: parts[14] || "-",
      referrer: quoted[1] || "-",
      userAgent: quoted[2] || "-",
      sslCipher: parts[17] || "-",
      sslProtocol: parts[18] || "-",
    };
  } catch (err) {
    console.warn("❌ Failed to parse log message:", err.message);
    return {};
  }
}

function formatLogTime(raw) {
  if (!raw) return "N/A";
  const match = raw.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}:\d{2}:\d{2})/);
  if (!match) return raw;

  const [_, day, monStr, year, time] = match;
  const months = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const month = months[monStr] || "01";
  return `${year}-${month}-${day} ${time}`;
}

function LogManager({ headerComponent }) {
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  useEffect(() => {
    async function fetchLogs() {
      try {
        const response = await fetch(
          "http://localhost:4000/api/aws/cloudwatch/logs",
          {
            credentials: "include",
          }
        );
        const result = await response.json();

        if (response.ok && Array.isArray(result.data)) {
          const transformed = result.data.map((log, index) => {
            const parsed = parseLogMessage(log.message);
            return {
              id: index + 1,
              timestamp: formatLogTime(parsed.time),
              statusText: parsed.statusCode === "200" ? "SUCCEED" : "FAILED",
              ...parsed,
            };
          });

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

    return searchMatch;
  });

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const paginatedLogs = filteredLogs.slice(
    startIndex,
    startIndex + logsPerPage
  );

  const handleExport = () => {
    console.log("Export logs...");
    exportLogsToCSV(filteredLogs);
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

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
        <button className="log-export-button" onClick={handleExport}>
          Export Logs
        </button>
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
                <span className={`log-level ${log.level}`}>
                  {log.statusText}
                </span>
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
            {Math.min(startIndex + logsPerPage, filteredLogs.length)} of{" "}
            {filteredLogs.length} logs
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
      {showModal && selectedLog && (
        <div className="log-modal-overlay">
          <div className="log-modal">
            <h3>Log Details</h3>
            <div className="log-modal-body">
              <table className="log-detail-table">
                <tbody>
                  {Object.entries(selectedLog)
                    .filter(([key]) => key !== "statusText")
                    .map(([key, value]) => (
                      <tr key={key}>
                        <td>
                          <strong>{key}</strong>
                        </td>
                        <td>{value ?? "-"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="log-modal-footer">
              <button
                className="log-modal-close"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogManager;
