/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import "./Overview.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Overview({ headerComponent }) {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metricsRaw, setMetricsRaw] = useState({});
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/dashboard/overview/data`,
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
          `${BACKEND_URL}/api/dashboard/overview/data`,
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
              <div className={`metric-icon ${metric.iconType}`}>
                {metric.icon}
              </div>
            </div>
            <div className="metric-value">{metric.value}</div>
            <div className={`metric-change ${metric.changeType}`}>
              {metric.changeType === "positive" && "↗"}
              {metric.changeType === "negative" && "↘"}
              {metric.change}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Overview;
