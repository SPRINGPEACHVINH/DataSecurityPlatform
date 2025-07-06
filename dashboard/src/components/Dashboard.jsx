import React from "react";
import "./Dashboard.css";

function Dashboard() {
  const findingsData = [
    {
      id: 1,
      severity: "High",
      finding: "Unauthorized access attempt detected",
      source: "Web Server",
      timestamp: "2024-01-15 14:30:22",
    },
    {
      id: 2,
      severity: "Medium",
      finding: "Suspicious file modification",
      source: "Database",
      timestamp: "2024-01-15 13:45:18",
    },
    {
      id: 3,
      severity: "High",
      finding: "Failed authentication attempts",
      source: "API Gateway",
      timestamp: "2024-01-15 12:15:33",
    },
    {
      id: 4,
      severity: "Low",
      finding: "Unusual network traffic pattern",
      source: "Firewall",
      timestamp: "2024-01-15 11:22:45",
    },
    {
      id: 5,
      severity: "Critical",
      finding: "Data exfiltration attempt",
      source: "File Server",
      timestamp: "2024-01-15 10:08:12",
    },
  ];

  const dataSensitiveData = [
    {
      id: 1,
      dataType: "Credit Card Numbers",
      location: "/var/data/payments/",
      riskLevel: "Critical",
      lastAccessed: "2024-01-15 09:30:15",
    },
    {
      id: 2,
      dataType: "Social Security Numbers",
      location: "/home/users/profiles/",
      riskLevel: "High",
      lastAccessed: "2024-01-15 08:45:22",
    },
    {
      id: 3,
      dataType: "Email Addresses",
      location: "/opt/marketing/lists/",
      riskLevel: "Medium",
      lastAccessed: "2024-01-15 07:12:33",
    },
    {
      id: 4,
      dataType: "Phone Numbers",
      location: "/data/contacts/",
      riskLevel: "Medium",
      lastAccessed: "2024-01-15 06:55:18",
    },
    {
      id: 5,
      dataType: "Medical Records",
      location: "/secure/health/",
      riskLevel: "Critical",
      lastAccessed: "2024-01-15 05:20:45",
    },
  ];

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="sidebar-content">
          <div className="sidebar-header">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/d4849b383616c2f4103824996486230e4a3ef64d?placeholderIfAbsent=true"
              alt="Logo"
              className="logo"
            />
            <div className="nav-item active">
              <div className="nav-indicator" />
              <div className="nav-content">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/25de559fa0f9d522caaa744987e9cfa7b7f739db?placeholderIfAbsent=true"
                  alt="Overview icon"
                  className="nav-icon"
                />
                <div className="nav-text">Overview</div>
              </div>
            </div>
            <div className="nav-menu">
              <div className="nav-item inactive">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/b73512fb2c8a58aa1d81d2fd47f78e1ae24073f0?placeholderIfAbsent=true"
                  alt="Log Manager icon"
                  className="nav-icon"
                />
                <div className="nav-text">Log Manager</div>
              </div>
              <div className="nav-item inactive">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/2b8e9a343955033ae1d626490b391d27e4ce3fd6?placeholderIfAbsent=true"
                  alt="Data Sources icon"
                  className="nav-icon"
                />
                <div className="nav-text">Data Sources</div>
              </div>
              <div className="nav-item inactive">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/b8d5045840a701da208dd57ad7d80615fc2c7fec?placeholderIfAbsent=true"
                  alt="Settings icon"
                  className="nav-icon"
                />
                <div className="nav-text">Setting</div>
              </div>
            </div>
          </div>
          <img
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/390c8cdbf997b2c746be168d2fbb7e4158e11ec7?placeholderIfAbsent=true"
            alt="Collapse icon"
            className="collapse-icon"
          />
        </div>
        <div className="sidebar-footer">
          <div className="help-section">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/2a81dbe3a52e7908136dd1559c32a29868939c49?placeholderIfAbsent=true"
              alt="Help icon"
              className="help-icon"
            />
            <div className="help-text">Help</div>
          </div>
          <img
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/c1a352735ceb2b355673f83bb3a246f485137194?placeholderIfAbsent=true"
            alt="Arrow icon"
            className="arrow-icon"
          />
        </div>
      </div>
      <div className="main-content">
        <div className="header">
          <div className="page-title">Dashboard</div>
          <div className="header-controls">
            <div className="search-box">Search</div>
            <div className="user-profile">
              <div className="user-info">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/26f0a624d150c8c02938247753a1054d42060a0b?placeholderIfAbsent=true"
                  alt="User avatar"
                  className="user-avatar"
                />
                <div className="user-name">{username}</div>
              </div>
              <img
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/2b743dbcd0157a48cdbb66a0049f7867f7fa50ed?placeholderIfAbsent=true"
                alt="Dropdown arrow"
                className="dropdown-arrow"
              />
            </div>
          </div>
        </div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-title">Critical assets</div>
            <div className="metric-divider" />
            <div className="metric-content">
              <div className="metric-value">N/A</div>
              <div className="metric-label">High risk</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-title">Total event occurrences</div>
            <div className="metric-divider" />
            <div className="metric-content">
              <div className="metric-value">1619</div>
              <div className="metric-label">High risk</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-title">Total user sessions</div>
            <div className="metric-divider" />
            <div className="metric-content">
              <div className="metric-value">1666</div>
              <div className="metric-label">High risk</div>
            </div>
          </div>
          <div className="metric-card total-users">
            <div className="metric-title">Total users (0)</div>
            <div className="metric-divider" />
            <div className="metric-value">N/A</div>
          </div>
        </div>
        <div className="tables-section">
          <div className="table-container">
            <div className="table-wrapper">
              <h3 className="table-title">Security Findings</h3>
              <table className="findings-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Finding</th>
                    <th>Source</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {findingsData.map((finding) => (
                    <tr key={finding.id}>
                      <td>
                        <span
                          className={`severity-badge severity-${finding.severity.toLowerCase()}`}
                        >
                          {finding.severity}
                        </span>
                      </td>
                      <td className="finding-description">{finding.finding}</td>
                      <td>{finding.source}</td>
                      <td className="timestamp">{finding.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="table-container">
            <div className="table-wrapper">
              <h3 className="table-title">Data Sensitive Assets</h3>
              <table className="data-sensitive-table">
                <thead>
                  <tr>
                    <th>Data Type</th>
                    <th>Location</th>
                    <th>Risk Level</th>
                    <th>Last Accessed</th>
                  </tr>
                </thead>
                <tbody>
                  {dataSensitiveData.map((data) => (
                    <tr key={data.id}>
                      <td className="data-type">{data.dataType}</td>
                      <td className="data-location">{data.location}</td>
                      <td>
                        <span
                          className={`risk-badge risk-${data.riskLevel.toLowerCase()}`}
                        >
                          {data.riskLevel}
                        </span>
                      </td>
                      <td className="timestamp">{data.lastAccessed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
