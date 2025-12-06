import React, { useState, useEffect } from "react";
import "./LogManager.css";

function exportLogsToCSV(logs) {
  if (!logs.length) return;

  const headers = Object.keys(logs[0]).filter(
    (k) => k !== "level" && k !== "statusText"
  );
  const csvRows = [];

  csvRows.push(headers.join(","));
  logs.forEach((log) => {
    const values = headers.map((key) => {
      const val = log[key] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  });

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

function parseCloudTrailLog(message) {
  try {
    const data = JSON.parse(message);

    let requester = "-";

    // Ưu tiên lấy userName từ sessionIssuer nếu là AssumedRole
    if (data.userIdentity?.type === "AssumedRole") {
      requester =
        data.userIdentity?.sessionContext?.sessionIssuer?.userName &&
        data.userIdentity?.accountId
          ? `${data.userIdentity.sessionContext.sessionIssuer.userName} (${data.userIdentity.accountId})`
          : data.userIdentity?.principalId ?? "-";
    } else if (data.userIdentity?.userName && data.userIdentity?.accountId) {
      requester = `${data.userIdentity.userName} (${data.userIdentity.accountId})`;
    } else {
      requester = data.userIdentity?.principalId ?? "-";
    }

    return {
      raw: data,
      time: data.eventTime ?? "-",
      requester,
      operation: data.eventName ?? "-",
      remoteIP: data.sourceIPAddress ?? "-",
      requestURI: data.requestParameters?.bucketName ?? "-",
      statusCode: data.errorCode ? "500" : "200",
      userAgent: data.userAgent ?? "-",
      eventSource: data.eventSource ?? "-",
      objectKey: data.requestParameters?.key ?? "-",
    };
  } catch (err) {
    console.warn("❌ Failed to parse CloudTrail JSON:", err.message);
    return null;
  }
}

function formatLogTime(raw) {
  if (!raw) return "N/A";

  if (raw.includes("T")) {
    const date = new Date(raw);
    return date.toLocaleString();
  }

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
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  useEffect(() => {
    async function fetchLogs() {
      try {
        const response = await fetch(
          "http://localhost:4000/api/aws/cloudwatch/logs",
          { credentials: "include" }
        );
        const result = await response.json();

        if (response.ok && Array.isArray(result.data)) {
          const transformed = result.data
            .map((log, index) => {
              const parsed = parseCloudTrailLog(log.message);
              if (!parsed) return null;

              return {
                id: index + 1,
                timestamp: formatLogTime(parsed.time),
                statusText: parsed.statusCode === "200" ? "SUCCEED" : "FAILED",
                ...parsed,
              };
            })
            .filter(Boolean);

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
    return (
      log.operation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.requester.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const paginatedLogs = filteredLogs.slice(
    startIndex,
    startIndex + logsPerPage
  );

  const handleExport = () => {
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
            <h3>Log Details (CloudTrail)</h3>
            <div className="log-modal-body">
              <table className="log-detail-table">
                <tbody>
                  {Object.entries(selectedLog.raw).map(([key, value]) => (
                    <tr key={key}>
                      <td>
                        <strong>{key}</strong>
                      </td>
                      <td>
                        {typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </td>
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
