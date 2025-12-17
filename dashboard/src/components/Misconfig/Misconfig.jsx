import { useState, useEffect } from "react";
import "./Misconfig.css";
import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";

function Misconfig({
  onLogout,
  onNavigateToDataSources,
  onNavigateToOverview,
  onNavigateToSearch,
  onNavigateToLogManager,
  onNavigateToConnectorSetup,
}) {
  const [cloudProvider, setCloudProvider] = useState("aws");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);

  // Key Management states
  const [keyExists, setKeyExists] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  // Check encryption key status on mount
  useEffect(() => {
    const checkKeyStatus = async () => {
      try {
        const response = await fetch(
          "http://localhost:4000/api/dashboard/misconfig/check_keys",
          {
            credentials: "include",
          }
        );
        const result = await response.json();
        if (response.ok && result.isExists === true) {
          setKeyExists(result.isExists);
        } else {
          console.error("Failed to check key status:", result.message);
        }
      } catch (err) {
        console.error("Error checking key status:", err);
      } finally {
        setIsCheckingKey(false);
      }
    };

    checkKeyStatus();
  }, []);

  const handleCloudProviderChange = (provider) => {
    setCloudProvider(provider);
  };

  const handleGenerateKey = async () => {
    setIsGeneratingKey(true);

    try {
      const response = await fetch(
        "http://localhost:4000/api/dashboard/misconfig/generate_keys",
        {
          method: "POST",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setKeyExists(true);
        alert("Encryption key generated successfully!");
      } else {
        alert(result.message || "Failed to generate encryption key.");
      }
    } catch (err) {
      console.error("Error generating key:", err);
      alert("Failed to generate encryption key. Please try again.");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    setScanResults(null);
    setSelectedResource(null);

    try {
      console.log("Starting scan for provider:", cloudProvider);
      const response = await fetch(
        `http://localhost:4000/api/dashboard/misconfig/scan`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cloud: cloudProvider }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setScanResults(result);
        setShowSuccessNotification(true);

        // Auto-hide notification after 5 seconds
        setTimeout(() => {
          setShowSuccessNotification(false);
        }, 5000);
      } else {
        alert(
          result.message ||
            "Scan failed. Please check your backend .env configuration."
        );
      }
    } catch (err) {
      console.error("Error during scan:", err);
      alert(
        "Scan failed. Please ensure the backend is running and .env is configured."
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  return (
    <div className="misconfig-container">
      <Sidebar
        currentPage="misconfig"
        onNavigateToOverview={onNavigateToOverview}
        onNavigateToDataSources={onNavigateToDataSources}
        onNavigateToSearch={onNavigateToSearch}
        onNavigateToLogManager={onNavigateToLogManager}
        onNavigateToMisconfig={() => console.log("Already on misconfig")}
        onNavigateToConnectorSetup={onNavigateToConnectorSetup}
      />

      <div className="main-content">
        <Header
          pageTitle="Cloud Security Misconfiguration Scanner"
          searchTerm=""
          onSearchChange={() => {}}
          onLogout={handleLogout}
          showSearch={false}
        />

        <div className="misconfig-content">
          {/* <div className="misconfig-title">Cloud Security Configuration Scanner</div> */}

          {/* Success Notification */}
          {showSuccessNotification && (
            <div className="success-notification">
              <div className="notification-content">
                <span className="notification-icon">✓</span>
                <div className="notification-text">
                  <strong>Scan Completed Successfully!</strong>
                  <p>
                    Found {scanResults?.data?.failedResources?.length || 0}{" "}
                    misconfiguration(s). Review the results below.
                  </p>
                </div>
                <button
                  className="notification-close"
                  onClick={() => setShowSuccessNotification(false)}
                  aria-label="Close notification"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Scan Results Section - Show at top when results exist */}
          {scanResults && (
            <div className="results-section">
              <h2 className="section-title">Scan Report</h2>

              <div className="results-header">
                <div className="scan-timestamp">
                  Scan completed at:{" "}
                  {new Date(scanResults.data.timestamp).toLocaleString("vi", {
                    dateStyle: "short",
                    timeStyle: "medium",
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </div>
                <div className="results-summary">
                  <span className="failed-count">
                    {scanResults.data.failedResources.length} Failed Resources
                  </span>
                </div>
              </div>

              <div className="results-table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Plugin</th>
                      <th>Category</th>
                      <th>Title</th>
                      <th>Resource</th>
                      <th>Region</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResults.data.failedResources.map((resource, index) => (
                      <tr
                        key={index}
                        className={
                          selectedResource === resource ? "selected" : ""
                        }
                        onClick={() => setSelectedResource(resource)}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="plugin-cell">{resource.plugin}</td>
                        <td className="category-cell">{resource.category}</td>
                        <td className="title-cell">{resource.title}</td>
                        <td className="resource-cell">{resource.resource}</td>
                        <td className="region-cell">{resource.region}</td>
                        <td className="status-cell">
                          <span
                            className={`status-badge ${resource.status.toLowerCase()}`}
                          >
                            {resource.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Recommended Action Section */}
              <div className="recommended-action-section">
                <h3 className="action-title">Recommended Action</h3>
                {selectedResource ? (
                  <div className="action-content">
                    <div className="action-header">
                      <div className="action-resource-info">
                        <span className="action-label">Resource:</span>
                        <span className="action-value">
                          {selectedResource.resource}
                        </span>
                      </div>
                      <div className="action-resource-info">
                        <span className="action-label">Plugin:</span>
                        <span className="action-value">
                          {selectedResource.plugin}
                        </span>
                      </div>
                    </div>

                    <div className="action-details">
                      <div className="detail-block">
                        <h4>Remediation Steps</h4>
                        <p>{selectedResource.message}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="action-placeholder">
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      <path d="M9 12h6m-6 4h6" />
                    </svg>
                    <p>
                      Select a resource from the table above to view remediation
                      steps.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Configuration Area */}
          <div className="config-section">
            <h2 className="section-title">Instruction</h2>

            {/* Key Management Section */}
            <div className="key-management-section">
              <div className="key-management-header">
                <h3>Encryption Key Management</h3>
                <p>
                  This key is required to encrypt your cloud credentials before
                  sending them to the CloudSploit server for misconfiguration
                  scanning.
                </p>
              </div>

              <div className="key-status-container">
                {isCheckingKey ? (
                  <div className="key-status checking">
                    <span className="status-icon">⏳</span>
                    <span className="status-text">
                      Checking encryption key status...
                    </span>
                  </div>
                ) : keyExists ? (
                  <div className="key-status success">
                    <span className="status-text">
                      Encryption Key exists. Ready to scan.
                    </span>
                  </div>
                ) : (
                  <div className="key-status-actions">
                    <div className="key-status warning">
                      <span className="status-icon">⚠</span>
                      <span className="status-text">
                        No encryption key found. Generate one to proceed.
                      </span>
                    </div>
                    <button
                      className="generate-key-btn"
                      onClick={handleGenerateKey}
                      disabled={isGeneratingKey}
                    >
                      {isGeneratingKey ? (
                        <>
                          <span className="spinner"></span>
                          Generating...
                        </>
                      ) : (
                        "Generate Key"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Cloud Provider Selector */}
            <div className="cloud-provider-tabs">
              <button
                className={`provider-tab ${
                  cloudProvider === "aws" ? "active" : ""
                }`}
                onClick={() => handleCloudProviderChange("aws")}
              >
                AWS
              </button>
              <button
                className={`provider-tab ${
                  cloudProvider === "azure" ? "active" : ""
                }`}
                onClick={() => handleCloudProviderChange("azure")}
              >
                Azure
              </button>
            </div>

            {/* Environment Configuration Instructions */}
            <div className="env-instructions">
              <div className="instruction-header">
                <h3>Backend Configuration Required</h3>
                <p>
                  Update your backend <code>.env</code> file with the following
                  credentials:
                </p>
              </div>

              {cloudProvider === "aws" ? (
                <div className="env-variables">
                  <div className="env-var-item">
                    <code>AWS_ACCESS_KEY_ID</code>
                    <span className="env-description">
                      Your AWS access key ID
                    </span>
                  </div>
                  <div className="env-var-item">
                    <code>AWS_SECRET_ACCESS_KEY</code>
                    <span className="env-description">
                      Your AWS secret access key
                    </span>
                  </div>
                  <div className="env-var-item">
                    <code>AWS_REGION</code>
                    <span className="env-description">
                      AWS region (e.g., us-east-1)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="env-variables">
                  <div className="env-var-item">
                    <code>AZURE_CLIENT_ID</code>
                    <span className="env-description">
                      Azure Application (Client) ID
                    </span>
                  </div>
                  <div className="env-var-item">
                    <code>AZURE_CLIENT_SECRET</code>
                    <span className="env-description">Azure Client Secret</span>
                  </div>
                  <div className="env-var-item">
                    <code>AZURE_TENANT_ID</code>
                    <span className="env-description">
                      Azure Directory (Tenant) ID
                    </span>
                  </div>
                  <div className="env-var-item">
                    <code>AZURE_SUBSCRIPTION_ID</code>
                    <span className="env-description">
                      Azure Subscription ID
                    </span>
                  </div>
                </div>
              )}

              <div className="env-note">
                <strong>Note:</strong> If you already setup .env file before,
                skip this step. Or else, after updating the .env file, restart
                your backend server for changes to take effect.
              </div>
            </div>

            {/* Start Scan Button */}
            <div className="scan-button-section">
              <button
                className="start-scan-btn"
                onClick={handleStartScan}
                disabled={isScanning || !keyExists}
              >
                {isScanning ? (
                  <>
                    <span className="spinner"></span>
                    Scanning...
                  </>
                ) : (
                  "START SCAN"
                )}
              </button>
              {!keyExists && !isCheckingKey && (
                <p className="scan-disabled-note">
                  Generate an encryption key to enable scanning.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Misconfig;
