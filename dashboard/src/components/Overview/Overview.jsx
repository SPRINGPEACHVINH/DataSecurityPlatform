/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import "./Overview.css";

function Overview({ headerComponent }) {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metricsRaw, setMetricsRaw] = useState({});
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [selectedConnectorType, setSelectedConnectorType] = useState("Azure");
  const [isCreating, setIsCreating] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState(null);
  const [creationError, setCreationError] = useState(null);

  // Step 2 states
  const [showStep2, setShowStep2] = useState(false);
  const [showStep3, setShowStep3] = useState(false);
  const [showConnectorError, setShowConnectorError] = useState(false);
  const [isConfiguringConnector, setIsConfiguringConnector] = useState(false);
  const [configurationSuccess, setConfigurationSuccess] = useState(false);
  const [configurationError, setConfigurationError] = useState(null);

  // Step 4 states
  const [showStep4, setShowStep4] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [configFormData, setConfigFormData] = useState({
    // AWS fields
    buckets: "",
    aws_access_key_id: "",
    aws_secret_access_key: "",
    // Azure fields
    account_name: "",
    account_key: "",
    blob_endpoint: "",
    containers: "",
  });

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

  useEffect(() => {
    async function initializeOverview() {
      try {
        setLoading(true);

        // PHASE 1: Thử lấy dữ liệu Dashboard trước (Trigger Condition)
        const dashboardResponse = await fetch(
          "http://localhost:4000/api/dashboard/overview/data",
          { credentials: "include" }
        );

        // ==> TRƯỜNG HỢP A: Đã có dữ liệu (Setup & Sync đã xong)
        if (dashboardResponse.ok) {
          const result = await dashboardResponse.json();

          // Xử lý hiển thị Dashboard
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

          // Đảm bảo tắt hết các mode Setup
          setShowConfigGuide(false);
          setLoading(false);
          return; // KẾT THÚC HÀM TẠI ĐÂY
        }

        // PHASE 2: Nếu 404 -> Kiểm tra trạng thái Connector (State Machine)
        if (dashboardResponse.status === 404) {
          console.log(
            "Dashboard data not found (404). Checking connector status..."
          );

          const connectorResponse = await fetch(
            "http://localhost:4000/api/dashboard/elasticsearch/connector",
            { credentials: "include" }
          );

          if (connectorResponse.ok) {
            const connectorResult = await connectorResponse.json();
            const connectors = connectorResult.data || [];

            // Case 1: Empty -> Step 1 (Create)
            if (connectors.length === 0) {
              setShowConfigGuide(true);
              // Reset các step khác để đảm bảo chỉ hiện Step 1
              setShowStep2(false);
              setShowStep3(false);
              setShowStep4(false);
              setLoading(false);
              return;
            }

            // Lấy connector đầu tiên (Singleton logic)
            const connector = connectors[0];
            const connectorData = {
              id: connector.id,
              type: connector.type,
              name: connector.name,
              status: connector.status,
            };

            // Bật chế độ Config Guide
            setShowConfigGuide(true);

            // Switch Case theo Status
            switch (connector.status) {
              case "created": // Case 2 -> Step 2 (Deploy)
                setCreationSuccess(connectorData);
                setShowStep2(true);
                break;

              case "needs_configuration": // Case 3 -> Step 3 (Config)
                setCreationSuccess(connectorData);
                setShowStep2(true); // Giữ step 2 đã xong
                setShowStep3(true); // Hiện step 3
                break;

              case "connected": // Case 4 -> Step 4 (Sync)
                // Dashboard trả về 404 + Status là Connected => Cần Sync lần đầu
                setCreationSuccess(connectorData);
                setConfigurationSuccess(true);
                setShowStep4(true);
                break;

              case "error": // Case 5 -> Error
              case "configured":
                setCreationSuccess(connectorData);
                setShowConnectorError(true);
                break;

              default:
                console.warn("Unknown connector status:", connector.status);
                break;
            }

            setLoading(false);
            return;
          }
        }

        // Nếu lỗi khác (không phải 404 và cũng không OK)
        throw new Error("Failed to initialize dashboard. Unexpected error.");
      } catch (err) {
        console.error("Error initializing overview:", err);
        setError(err.message || "Unknown error");
        setLoading(false);
      }
    }

    initializeOverview();
  }, []);

  const handleCreateConnector = async () => {
    setIsCreating(true);
    setCreationError(null);
    setCreationSuccess(null);

    try {
      const response = await fetch(
        "http://localhost:4000/api/dashboard/elasticsearch/createconnector",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ name: selectedConnectorType }),
        }
      );

      const result = await response.json();

      if (response.status === 201) {
        setCreationSuccess(result.data);
        setShowStep2(true);
      } else {
        setCreationError(result.message || "Failed to create connector");
      }
    } catch (err) {
      console.error("Error creating connector:", err);
      setCreationError(err.message || "Failed to create connector");
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfigFormChange = (field, value) => {
    setConfigFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCopyConnectorId = () => {
    if (creationSuccess?.id) {
      navigator.clipboard.writeText(creationSuccess.id);
    }
  };

  const handleContainerStarted = () => {
    setShowStep3(true);
  };

  const handleConfigureConnector = async () => {
    setIsConfiguringConnector(true);
    setConfigurationError(null);

    try {
      const connectorType = creationSuccess.type;
      let configBody = {
        use_text_extraction_service: true,
      };

      if (connectorType === "s3") {
        configBody = {
          ...configBody,
          connectorType: "s3",
          buckets: encodeURI(configFormData.buckets),
          aws_access_key_id: encodeURI(configFormData.aws_access_key_id),
          aws_secret_access_key: encodeURI(
            configFormData.aws_secret_access_key
          ),
        };
      } else if (connectorType === "azure_blob_storage") {
        configBody = {
          ...configBody,
          connectorType: "azure_blob_storage",
          account_name: encodeURI(configFormData.account_name),
          account_key: encodeURI(configFormData.account_key),
          blob_endpoint: encodeURI(configFormData.blob_endpoint),
          containers: encodeURI(configFormData.containers),
        };
      }

      const response = await fetch(
        `http://localhost:4000/api/dashboard/elasticsearch/connector_configuration?connector_id=${creationSuccess.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(configBody),
        }
      );

      const result = await response.json();

      if (response.ok && result.data.result === "updated") {
        setConfigurationSuccess(true);
        setShowStep4(true);
      } else {
        setConfigurationError(
          result.message || "Failed to configure connector"
        );
      }
    } catch (err) {
      console.error("Error configuring connector:", err);
      setConfigurationError(err.message || "Failed to configure connector");
    } finally {
      setIsConfiguringConnector(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const response = await fetch(
        `http://localhost:4000/api/dashboard/elasticsearch/connector/sync?connector_id=${creationSuccess.id}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (response.ok && result.syncstatus === "completed") {
        // Reset all setup wizard states
        setShowStep2(false);
        setShowStep3(false);
        setShowStep4(false);
        setConfigurationSuccess(false);
        setCreationSuccess(null);
        
        // Hide setup wizard
        setShowConfigGuide(false);
        
        // Show loading state
        setLoading(true);
        
        // Fetch dashboard data
        const success = await fetchDashboardData();
        
        if (success) {
          setLoading(false);
        } else {
          setSyncError("Sync completed but failed to load dashboard data. Please refresh the page.");
          setLoading(false);
        }
      } else {
        setSyncError(result.message || "Sync failed. Please try again.");
      }
    } catch (err) {
      console.error("Error syncing connector:", err);
      setSyncError(err.message || "Failed to sync connector");
    } finally {
      setIsSyncing(false);
    }
  };

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

  // Show Configuration Guide for first-time setup
  if (showConfigGuide) {
    return (
      <div className="main-content">
        {headerComponent}

        <div className="config-guide-container">
          <div className="config-guide-header">
            <h1>Welcome to Data Security Platform</h1>
            <p>Let's get you started with the initial setup</p>
          </div>

          {/* Case 4: Show error view for "error" or "configured" status */}
          {showConnectorError && (
            <div className="config-step-card">
              <div className="notification error-notification">
                <span className="notification-icon">❌</span>
                <span>
                  Connector is not configured correctly, please review
                  instructions.
                </span>
              </div>
            </div>
          )}

          {/* Step 1: Create Connector - only show if Step 2 is not active and no error */}
          {!showStep2 && !showConnectorError && (
            <div className="config-step-card">
              <div className="step-header">
                <div className="step-number">Step 1</div>
                <h2>Run API Connector</h2>
              </div>

              <div className="step-content">
                <p className="step-description">
                  Select your cloud platform and create a connector to start
                  syncing your data sources.
                </p>

                <div className="connector-form">
                  <div className="form-group">
                    <label htmlFor="connector-type">Connector Type</label>
                    <select
                      id="connector-type"
                      className="connector-select"
                      value={selectedConnectorType}
                      onChange={(e) => setSelectedConnectorType(e.target.value)}
                      disabled={isCreating}
                    >
                      <option value="Azure">Azure</option>
                      <option value="AWS">AWS</option>
                    </select>
                  </div>

                  <button
                    className="create-connector-button"
                    onClick={handleCreateConnector}
                    disabled={isCreating}
                  >
                    {isCreating ? "Creating Connector..." : "Create Connector"}
                  </button>
                </div>

                {creationError && (
                  <div className="notification error-notification">
                    <span className="notification-icon">❌</span>
                    <span>{creationError}</span>
                  </div>
                )}

                {creationSuccess && (
                  <div className="success-section">
                    <div className="notification success-notification">
                      <span className="notification-icon">✅</span>
                      <span>Connector created successfully!</span>
                    </div>

                    <div className="connector-details">
                      <h3>Connector Information</h3>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="detail-label">ID:</span>
                          <span className="detail-value">
                            {creationSuccess.id}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Name:</span>
                          <span className="detail-value">
                            {creationSuccess.name}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Type:</span>
                          <span className="detail-value">
                            {creationSuccess.type}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Index Name:</span>
                          <span className="detail-value">
                            {creationSuccess.index_name}
                          </span>
                        </div>
                        <div className="detail-item full-width">
                          <span className="detail-label">Result:</span>
                          <span className="detail-value">
                            {creationSuccess.result}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Deploy Container */}
          {showStep2 &&
            !showStep3 &&
            !configurationSuccess &&
            !showConnectorError && (
              <div className="config-step-card" style={{ marginTop: "24px" }}>
                <div className="step-header">
                  <div className="step-number">Step 2</div>
                  <h2>Deploy Container</h2>
                </div>

                <div className="step-content">
                  <p className="step-description">
                    Configure the Docker environment and start the connector
                    container.
                  </p>

                  <div className="connector-id-section">
                    <div className="form-group">
                      <label>Connector ID</label>
                      <input
                        type="text"
                        className="form-input"
                        value={creationSuccess?.id || ""}
                        readOnly
                      />
                      <button
                        className="copy-button"
                        onClick={handleCopyConnectorId}
                        title="Copy to clipboard"
                      >
                        Copy Connector ID
                      </button>
                    </div>
                  </div>

                  <div className="instructions-section">
                    <h3>Instructions:</h3>
                    <ol className="instruction-list">
                      <li>
                        Open <code>.env</code> in the <code>local/</code> folder
                        for elastic docker-compose.
                      </li>
                      <li>
                        Find variable{" "}
                        <code>{creationSuccess?.name}_CONNECTOR_ID</code> and
                        paste the connector ID.
                      </li>
                      <li>
                        Rerun docker-compose or recreate the corresponding
                        connector container.
                      </li>
                    </ol>
                  </div>

                  <button
                    className="create-connector-button"
                    onClick={handleContainerStarted}
                    style={{ marginTop: "20px" }}
                  >
                    I have updated .env & started container
                  </button>
                </div>
              </div>
            )}

          {/* Step 3: Update Connector Configuration */}
          {showStep3 && !configurationSuccess && !showConnectorError && (
            <div className="config-step-card" style={{ marginTop: "24px" }}>
              <div className="step-header">
                <div className="step-number">Step 3</div>
                <h2>Update Connector Configuration</h2>
              </div>

              <div className="step-content">
                <p className="step-description">
                  Configure your{" "}
                  {creationSuccess.type === "s3"
                    ? "AWS S3"
                    : "Azure Blob Storage"}{" "}
                  connector with the required credentials and settings.
                </p>

                {configurationError && (
                  <div className="notification error-notification">
                    <span className="notification-icon">❌</span>
                    <span>{configurationError}</span>
                  </div>
                )}

                <div className="credentials-form">
                  {creationSuccess.type === "s3" ? (
                    <>
                      <div className="form-group">
                        <label htmlFor="buckets">S3 Buckets</label>
                        <input
                          id="buckets"
                          type="text"
                          className="form-input"
                          placeholder="e.g., my-bucket-1, my-bucket-2"
                          value={configFormData.buckets}
                          onChange={(e) =>
                            handleConfigFormChange("buckets", e.target.value)
                          }
                          disabled={isConfiguringConnector}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="aws_access_key_id">
                          AWS Access Key ID
                        </label>
                        <input
                          id="aws_access_key_id"
                          type="text"
                          className="form-input"
                          placeholder="Enter AWS Access Key ID"
                          value={configFormData.aws_access_key_id}
                          onChange={(e) =>
                            handleConfigFormChange(
                              "aws_access_key_id",
                              e.target.value
                            )
                          }
                          disabled={isConfiguringConnector}
                        />
                      </div>
                      <div
                        className="form-group"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        <label htmlFor="aws_secret_access_key">
                          AWS Secret Access Key
                        </label>
                        <input
                          id="aws_secret_access_key"
                          type="password"
                          className="form-input"
                          placeholder="Enter AWS Secret Access Key"
                          value={configFormData.aws_secret_access_key}
                          onChange={(e) =>
                            handleConfigFormChange(
                              "aws_secret_access_key",
                              e.target.value
                            )
                          }
                          disabled={isConfiguringConnector}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-group">
                        <label htmlFor="account_name">Account Name</label>
                        <input
                          id="account_name"
                          type="text"
                          className="form-input"
                          placeholder="Enter Azure Account Name"
                          value={configFormData.account_name}
                          onChange={(e) =>
                            handleConfigFormChange(
                              "account_name",
                              e.target.value
                            )
                          }
                          disabled={isConfiguringConnector}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="containers">Containers</label>
                        <input
                          id="containers"
                          type="text"
                          className="form-input"
                          placeholder="e.g., container-1, container-2"
                          value={configFormData.containers}
                          onChange={(e) =>
                            handleConfigFormChange("containers", e.target.value)
                          }
                          disabled={isConfiguringConnector}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="blob_endpoint">Blob Endpoint</label>
                        <input
                          id="blob_endpoint"
                          type="text"
                          className="form-input"
                          placeholder="https://myaccount.blob.core.windows.net"
                          value={configFormData.blob_endpoint}
                          onChange={(e) =>
                            handleConfigFormChange(
                              "blob_endpoint",
                              e.target.value
                            )
                          }
                          disabled={isConfiguringConnector}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="account_key">Account Key</label>
                        <input
                          id="account_key"
                          type="password"
                          className="form-input"
                          placeholder="Enter Azure Account Key"
                          value={configFormData.account_key}
                          onChange={(e) =>
                            handleConfigFormChange(
                              "account_key",
                              e.target.value
                            )
                          }
                          disabled={isConfiguringConnector}
                        />
                      </div>
                    </>
                  )}
                </div>

                <button
                  className="create-connector-button"
                  onClick={handleConfigureConnector}
                  disabled={isConfiguringConnector}
                >
                  {isConfiguringConnector
                    ? "Configuring..."
                    : "Configure Connector"}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Initial Sync */}
          {showStep4 && !showConnectorError && (
            <div className="config-step-card" style={{ marginTop: "24px" }}>
              <div className="step-header">
                <div className="step-number">Step 4</div>
                <h2>Initial Sync</h2>
              </div>

              <div className="step-content">
                {configurationSuccess && !syncError && (
                  <div
                    className="notification success-notification"
                    style={{ marginBottom: "20px" }}
                  >
                    <span className="notification-icon">✅</span>
                    <span>Connector configured successfully!</span>
                  </div>
                )}

                <p className="step-description">
                  Start the initial data synchronization to import your files
                  and data sources into the platform.
                </p>

                {syncError && (
                  <div className="notification error-notification">
                    <span className="notification-icon">❌</span>
                    <span>{syncError}</span>
                  </div>
                )}

                <button
                  className="create-connector-button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                >
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
              </div>
            </div>
          )}
        </div>
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
    </div>
  );
}

export default Overview;
