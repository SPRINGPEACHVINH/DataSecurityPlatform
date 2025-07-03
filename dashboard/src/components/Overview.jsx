import React from "react";
import "./Overview.css";

function Overview({ headerComponent }) {
  const metrics = [
    {
      title: "Data Sources",
      value: "4",
      change: "+2 this month",
      changeType: "positive",
      icon: "DS",
      iconType: "sources",
    },
    {
      title: "Total Files",
      value: "1,247",
      change: "+156 this week",
      changeType: "positive",
      icon: "F",
      iconType: "files",
    },
    {
      title: "Security Alerts",
      value: "23",
      change: "-5 from yesterday",
      changeType: "positive",
      icon: "!",
      iconType: "alerts",
    },
    {
      title: "Active Scans",
      value: "3",
      change: "No change",
      changeType: "neutral",
      icon: "S",
      iconType: "scans",
    },
  ];

  const recentActivities = [
    {
      type: "scan",
      title: "Security scan completed",
      description: "Full scan of container-a completed with 12 findings",
      time: "2 minutes ago",
      icon: "S",
    },
    {
      type: "alert",
      title: "High severity alert",
      description: "Sensitive data detected in bank.csv",
      time: "15 minutes ago",
      icon: "!",
    },
    {
      type: "connection",
      title: "New data source connected",
      description: "bucket-c successfully connected to AWS S3",
      time: "1 hour ago",
      icon: "+",
    },
    {
      type: "scan",
      title: "Scheduled scan started",
      description: "Daily security scan initiated for all containers",
      time: "2 hours ago",
      icon: "S",
    },
    {
      type: "alert",
      title: "Connection lost",
      description: "bucket-a connection temporarily unavailable",
      time: "3 hours ago",
      icon: "!",
    },
  ];

  const alertsSummary = [
    { severity: "critical", text: "Critical vulnerabilities", count: 3 },
    { severity: "high", text: "High risk findings", count: 8 },
    { severity: "medium", text: "Medium risk issues", count: 12 },
    { severity: "low", text: "Low priority items", count: 45 },
  ];

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

      <div className="overview-content">
        <div className="recent-activity-card">
          <div className="card-title">Recent Activity</div>
          <div className="activity-list">
            {recentActivities.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className={`activity-icon ${activity.type}`}>
                  {activity.icon}
                </div>
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
