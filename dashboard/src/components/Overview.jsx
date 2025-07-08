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
  const [recentActivities, setRecentActivities] = useState([]);
  const [alertsSummary, setAlertsSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLogType, setSelectedLogType] = useState("macie");
  const [metricsRaw, setMetricsRaw] = useState({});
  const [sensitiveFiles, setSensitiveFiles] = useState(0);
  const [alertsByDate, setAlertsByDate] = useState([]);

  useEffect(() => {
    async function fetchOverviewData() {
      try {
        const response = await fetch(
          "http://localhost:4000/api/overview/data",
          {
            credentials: "include",
          }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch overview data");
        }

        const totalAlerts = (result.alertsSummary || []).reduce(
          (sum, a) => sum + a.count,
          0
        );

        const newFiles = result.metrics.newFilesToday || 0;
        const newAlerts = result.metrics.newAlerts24h || 0;
        const newDataSources = result.metrics.newDataSourcesWeek || 0;

        const formattedMetrics = [
          {
            title: "Data Sources",
            value: result.metrics.totalSources.toString(),
            change: `+${newDataSources} this week`,
            changeType: newDataSources > 0 ? "positive" : "neutral",
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
          {
            title: "Security Alerts",
            value: totalAlerts.toString(),
            change: `+${newAlerts} in 24h`,
            changeType: newAlerts > 0 ? "positive" : "neutral",
            icon: "!",
            iconType: "alerts",
          },
          {
            title: "Active Scans",
            value: result.metrics.activeScans.toString(),
            change: "No change",
            changeType: "neutral",
            icon: "S",
            iconType: "scans",
          },
        ];

        setMetricsRaw(result.metrics || {});
        setMetrics(formattedMetrics);
        setRecentActivities(result.recentActivities || []);
        setAlertsSummary(result.alertsSummary || []);
        setSensitiveFiles(result.metrics.sensitiveFiles || 0);
        setAlertsByDate(result.alertsByDate || []);
        setLoading(false);
      } catch (err) {
        console.error("Error loading overview data:", err);
        setError(err.message || "Unknown error");
        setLoading(false);
      }
    }

    fetchOverviewData();
  }, []);

  const s3Activities = recentActivities.filter((a) => a.type === "s3");
  const macieActivities = recentActivities.filter((a) => a.type === "macie");

  function formatS3Activity(activity) {
    try {
      const parsed = JSON.parse(activity.description);
      const eventName = parsed.eventName || activity.title;
      const bucket = parsed.requestParameters?.bucketName || "unknown bucket";
      const objectKey = parsed.requestParameters?.key || "";
      const shortObject =
        objectKey.length > 50 ? objectKey.slice(0, 50) + "..." : objectKey;

      const arn = parsed.userIdentity?.arn || "";
      const userName =
        parsed.userIdentity?.userName || arn.split("/").pop() || "unknown user";
      const accountId = parsed.userIdentity?.accountId || "unknown";

      return {
        title: eventName,
        description: `${eventName} on ${bucket}/${shortObject} by ${userName} (Account: ${accountId})`,
        time: activity.time,
      };
    } catch {
      const match = activity.description.match(
        /([a-f0-9]+) ([^ ]+) \[(.*?)\].*?svc:([^ ]+) [^ ]+ [^ ]+ (REST\.[A-Z.]+)/
      );

      if (match) {
        const bucket = match[2];
        const requester = match[4];
        const action = match[5];

        return {
          title: action,
          description: `${action} by ${requester} on bucket ${bucket}`,
          time: activity.time,
        };
      }

      return {
        title: activity.title,
        description: activity.description,
        time: activity.time,
      };
    }
  }

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
        <div className="chart-card">
          <div className="card-title">Sensitive File Ratio</div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  {
                    name: "Sensitive",
                    value: sensitiveFiles,
                  },
                  {
                    name: "Non-sensitive",
                    value: Math.max(
                      (metricsRaw?.totalFiles || 0) - sensitiveFiles,
                      0
                    ),
                  },
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                <Cell name="Sensitive" fill="#ef4444" />
                <Cell name="Non-sensitive" fill="#10b981" />
                <Tooltip />
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart */}
        <div className="chart-card">
          <div className="card-title">Alerts Over Time</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={alertsByDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="chart-card">
          <div className="card-title">Severity</div>
          <div className="alerts-chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={alertsSummary}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="severity" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {alertsSummary.map((entry, index) => {
                    let fillColor = "#10b981";
                    if (entry.severity === "high") fillColor = "#ef4444";
                    else if (entry.severity === "medium") fillColor = "#facc15";
                    return <Cell key={`cell-${index}`} fill={fillColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="overview-content">
        <div className="recent-activity-card">
          <div className="activity-header">
            <div className="card-title">Recent Activity</div>
            <div className="dropdown-selector">
              <select
                id="logType"
                value={selectedLogType}
                onChange={(e) => setSelectedLogType(e.target.value)}
              >
                <option value="macie">Macie</option>
                <option value="s3">S3</option>
              </select>
            </div>
          </div>

          {selectedLogType === "macie" && macieActivities.length > 0 && (
            <div className="activity-list">
              {macieActivities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-content">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-description">
                      {activity.description}
                    </div>
                  </div>
                  <div className="activity-time">{activity.time}</div>
                </div>
              ))}
            </div>
          )}

          {selectedLogType === "s3" && s3Activities.length > 0 && (
            <div className="activity-list">
              {s3Activities.map((activity, index) => {
                const formatted = formatS3Activity(activity);
                return (
                  <div key={index} className="activity-item">
                    <div className="activity-content">
                      <div className="activity-title">{formatted.title}</div>
                      <div className="activity-description">
                        {formatted.description}
                      </div>
                    </div>
                    <div className="activity-time">{formatted.time}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="alerts-summary">
          <div className="card-title">Security Alerts</div>
          {alertsSummary.map((alert, index) => (
            <div key={index} className="alert-item">
              <div className="alert-info">
                <div className={`alert-severity ${alert.severity}`}></div>
                <div className="alert-text">{alert.text}</div>
              </div>
              <div className="alert-count">{alert.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Overview;
