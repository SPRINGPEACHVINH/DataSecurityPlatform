import React, { useEffect, useState } from "react";
import "./Overview.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

function Overview({ headerComponent }) {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metricsRaw, setMetricsRaw] = useState({});

  useEffect(() => {
    async function fetchOverviewData() {
      try {
        const response = await fetch(
          "http://localhost:4000/api/dashboard/overview/data",
          {
            credentials: "include",
          }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch overview data");
        }

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
        setLoading(false);
      } catch (err) {
        console.error("Error loading overview data:", err);
        setError(err.message || "Unknown error");
        setLoading(false);
      }
    }

    fetchOverviewData();
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

      <div className="charts-grid">
        {/* Pie Chart */}
        {/* <div className="chart-card">
          <div className="card-title">Sensitive File Ratio</div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div> */}

        {/* Line Chart */}

        {/* Bar Chart */}
      </div>
    </div>
  );
}

export default Overview;
