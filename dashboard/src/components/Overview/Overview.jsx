/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import "./Overview.css";

function Overview({ headerComponent }) {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metricsRaw, setMetricsRaw] = useState({});
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [labelStats, setLabelStats] = useState([]);
  const [labelLoading, setLabelLoading] = useState(false);
  const [classifyLoading, setClassifyLoading] = useState(false);
  const [classifyMessage, setClassifyMessage] = useState("");
  const [labelMetrics, setLabelMetrics] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(
        "http://localhost:4000/api/dashboard/overview/data",
        { credentials: "include" }
      );

      if (response.ok) {
        const result = await response.json();
        const newFiles = result.metrics.newFilesToday || 0;

        const formattedMetrics = [
          {
            title: "Data Sources",
            value: result.metrics.totalSources.toString(),
            icon: "DS",
            iconType: "sources",
          },
          {
            title: "Total Files",
            value: result.metrics.totalFiles.toLocaleString(),
            change: `+${newFiles} today`,
            changeType: newFiles > 0 ? "positive" : "neutral",
            icon: "F",
            iconType: "files",
          },
        ];

        setMetricsRaw(result.metrics || {});
        setMetrics(formattedMetrics);
        setShowConfigGuide(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      return false;
    }
  };

  const fetchLabelStatistics = async () => {
    try {
      setLabelLoading(true);
      console.log("🔄 Fetching classification details...");
      
      const response = await fetch(
        "http://localhost:4000/api/dashboard/overview/label-statistics",
        { credentials: "include" }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("📊 Classification response:", result);
        
        // Group documents by file name
        const groupedDocs = {};
        (result.data.documents || []).forEach((doc) => {
          if (!groupedDocs[doc.file_name]) {
            groupedDocs[doc.file_name] = {
              file_name: doc.file_name,
              classify_time: doc.classify_time,
              labels: [],
              max_severity: 0,
            };
          }
          groupedDocs[doc.file_name].labels.push({
            label: doc.label,
            severity: doc.severity,
          });
          groupedDocs[doc.file_name].max_severity = Math.max(
            groupedDocs[doc.file_name].max_severity,
            doc.severity
          );
        });

        const groupedArray = Object.values(groupedDocs).sort(
          (a, b) => new Date(b.classify_time) - new Date(a.classify_time)
        );

        setLabelStats(groupedArray);

        // Calculate label metrics (count unique files per label)
        const labelCounts = {};
        groupedArray.forEach((doc) => {
          doc.labels.forEach((item) => {
            if (!labelCounts[item.label]) {
              labelCounts[item.label] = new Set();
            }
            labelCounts[item.label].add(doc.file_name);
          });
        });

        const labelMetricsArray = Object.entries(labelCounts)
          .map(([label, fileSet]) => ({
            label,
            count: fileSet.size,
          }))
          .sort((a, b) => b.count - a.count);

        setLabelMetrics(labelMetricsArray);
      } else {
        console.error("❌ Failed to fetch classification details:", response.status);
      }
    } catch (err) {
      console.error("Error fetching classification details:", err);
    } finally {
      setLabelLoading(false);
    }
  };

  const handleClassifyAllDocuments = async () => {
    try {
      setClassifyLoading(true);
      setClassifyMessage("🔄 Classifying all documents...");

      // Get all indices first
      const indicesResponse = await fetch(
        "http://localhost:4000/api/dashboard/elasticsearch/documents",
        { credentials: "include" }
      );

      if (!indicesResponse.ok) {
        setClassifyMessage("❌ Failed to get indices");
        return;
      }

      const indicesData = await indicesResponse.json();
      console.log("📋 Indices response:", indicesData);
      
      // Extract unique indices
      let indices = [];
      if (indicesData.data && Array.isArray(indicesData.data)) {
        indices = [...new Set(indicesData.data.map(doc => doc.index || doc._index).filter(Boolean))];
      }

      console.log("📋 Extracted indices:", indices);

      if (indices.length === 0) {
        setClassifyMessage("ℹ️ No indices found with documents");
        return;
      }

      // Classify all documents in each index
      let totalProcessed = 0;
      let totalSuccess = 0;
      let totalTagged = 0;

      for (const indexName of indices) {
        try {
          console.log(`🔍 Classifying index: ${indexName}`);
          
          const response = await fetch(
            "http://localhost:4000/api/ml/classify-all-documents",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                index_name: indexName,
                standard: "GDPR",
                tag: true,
                size: 100,
              }),
            }
          );

          if (response.ok) {
            const result = await response.json();
            totalProcessed += result.data.summary.total_processed;
            totalSuccess += result.data.summary.successful;
            totalTagged += result.data.summary.tagged || 0;
            
            console.log(`✅ Index ${indexName} classified:`, result.data.summary);
            
            setClassifyMessage(
              `📊 Processed ${totalProcessed} documents (${totalSuccess} classified, ${totalTagged} tagged)`
            );
          } else {
            const errorData = await response.json();
            console.error(`❌ Error classifying index ${indexName}:`, errorData);
            setClassifyMessage(`❌ Error: ${errorData.error || "Failed to classify"}`);
          }
        } catch (err) {
          console.error(`Error classifying index ${indexName}:`, err);
        }
      }

      setClassifyMessage(
        `✅ Done! ${totalSuccess} classified, ${totalTagged} tagged with high-confidence labels`
      );

      // Refresh statistics after a short delay (ES needs time to index)
      setTimeout(async () => {
        await fetchLabelStatistics();
      }, 1000);

      // Clear message after 4 seconds
      setTimeout(() => setClassifyMessage(""), 4000);
    } catch (err) {
      console.error("Error in handleClassifyAllDocuments:", err);
      setClassifyMessage("❌ Error during classification");
    } finally {
      setClassifyLoading(false);
    }
  };

  const handleSetupComplete = async () => {
    setLoading(true);
    const success = await fetchDashboardData();
    setLoading(false);

    if (!success) {
      setError(
        "Setup completed but failed to load dashboard data. Please refresh the page."
      );
    }
  };

  useEffect(() => {
    async function initializeOverview() {
      try {
        setLoading(true);

        // Try to fetch dashboard data
        const dashboardResponse = await fetch(
          "http://localhost:4000/api/dashboard/overview/data",
          { credentials: "include" }
        );

        // Dashboard data exists - show dashboard
        if (dashboardResponse.ok) {
          const result = await dashboardResponse.json();
          const newFiles = result.metrics.newFilesToday || 0;

          const formattedMetrics = [
            {
              title: "Data Sources",
              value: result.metrics.totalSources.toString(),
              icon: "DS",
              iconType: "sources",
            },
            {
              title: "Total Files",
              value: result.metrics.totalFiles.toLocaleString(),
              change: `+${newFiles} today`,
              changeType: newFiles > 0 ? "positive" : "neutral",
              icon: "F",
              iconType: "files",
            },
          ];

          setMetricsRaw(result.metrics || {});
          setMetrics(formattedMetrics);
          setShowConfigGuide(false);
          setLoading(false);
          return;
        }

        // Dashboard data not found (404) - show setup wizard
        if (dashboardResponse.status === 404) {
          setShowConfigGuide(true);
          setLoading(false);
          return;
        }

        // Other errors
        throw new Error("Failed to initialize dashboard. Unexpected error.");
      } catch (err) {
        console.error("Error initializing overview:", err);
        setError(err.message || "Unknown error");
        setLoading(false);
      }
    }

    initializeOverview();
  }, []);

  // Fetch label statistics when component loads
  useEffect(() => {
    fetchLabelStatistics();
  }, []);

  if (loading) {
    return (
      <div className="main-content">
        {headerComponent}
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        {headerComponent}
        <p>❌ {error}</p>
      </div>
    );
  }

  // Show Configuration Guide if needed
  // if (showConfigGuide) {
  //   return (
  //     <div className="data-sources-container">
  //       {sidebarComponent}
  //       <div className="main-content">
  //         {getHeaderForPage("Overview")}
  //         <div className="config-guide-message">
  //           <div className="message-card">
  //             <h2>⚙️ Initial Setup Required</h2>
  //             <p>
  //               No data sources have been configured yet. Please complete the
  //               initial setup in the Overview page to create your first
  //               connector.
  //             </p>
  //             <button
  //               className="setup-button"
  //               onClick={() => handleNavigation("ConnectorSetup")}
  //             >
  //               Go to Setup
  //             </button>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="main-content">
      {headerComponent}

      <div className="metrics-grid">
        {metrics.map((metric, index) => (
          <div key={index} className="metric-card">
            <div className="metric-header">
              <div className="metric-title">{metric.title}</div>
            </div>
            <div className="metric-value">{metric.value}</div>
            <div className={`metric-change ${metric.changeType}`}>
              {metric.changeType === "positive" && "↗"}
              {metric.changeType === "negative" && "↘"}
              {metric.change}
            </div>
          </div>
        ))}

        {/* Sensitive Files by Label Card */}
        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-title">Sensitive Files by Label</div>
            <div className="metric-icon">📁</div>
          </div>
          <div className="label-metrics-content">
            {labelMetrics && labelMetrics.length > 0 ? (
              <div className="label-metrics-list">
                {labelMetrics.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="label-metric-item">
                    <span className="label-name-small">{item.label}</span>
                    <span className="label-count-small">{item.count}</span>
                  </div>
                ))}
                {labelMetrics.length > 3 && (
                  <div className="label-metric-item more-item">
                    <span className="label-name-small">+{labelMetrics.length - 3} more</span>
                    <span className="label-count-small">{labelMetrics.reduce((sum, item, idx) => idx >= 3 ? sum + item.count : sum, 0)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="no-data-text">No labeled files yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Label Statistics Table */}
      <div className="label-statistics-section">
        <div className="section-header">
          <h2>📊 Classification Statistics</h2>
          <button
            className={`classify-all-btn ${classifyLoading ? "loading" : ""}`}
            onClick={handleClassifyAllDocuments}
            disabled={classifyLoading}
            title="Classify all documents and apply labels"
          >
            {classifyLoading ? (
              <>
                <span className="spinner-small"></span>
                Classifying...
              </>
            ) : (
              <>
                🔄 Refresh & Classify All
              </>
            )}
          </button>
        </div>

        {classifyMessage && (
          <div className="classify-message">
            {classifyMessage}
          </div>
        )}

        {labelLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading statistics...</p>
          </div>
        ) : labelStats && labelStats.length > 0 ? (
          <div className="label-table-container">
            <table className="label-statistics-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Processed At</th>
                  <th>Risk Categories</th>
                </tr>
              </thead>
              <tbody>
                {labelStats.map((doc, index) => {
                  const displayLabels = doc.labels.slice(0, 2);
                  const remainingLabels = doc.labels.length - 2;

                  return (
                    <tr key={index}>
                      <td className="document-name">
                        <span className="file-badge">{doc.file_name}</span>
                      </td>
                      <td className="processed-time">
                        {new Date(doc.classify_time).toLocaleString()}
                      </td>
                      <td className="risk-categories">
                        <div className="labels-group">
                          {displayLabels.map((item, idx) => (
                            <span key={idx} className="category-badge">
                              {item.label}
                            </span>
                          ))}
                          {remainingLabels > 0 && (
                            <span className="more-labels">+{remainingLabels}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data-message">
            <p>📭 No classified documents found yet</p>
            <p>Start classifying documents to see results</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Overview;
