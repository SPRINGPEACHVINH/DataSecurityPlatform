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
  const [isConfiguringConnector, setIsConfiguringConnector] = useState(false);
  const [configurationSuccess, setConfigurationSuccess] = useState(false);
  const [configurationError, setConfigurationError] = useState(null);
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

  useEffect(() => {
    async function initializeOverview() {
      try {
        // Step 1: Check connector status first
        const connectorResponse = await fetch(
          "http://localhost:4000/api/dashboard/elasticsearch/connector",
          { credentials: "include" }
        );

        if (connectorResponse.ok) {
          const connectorResult = await connectorResponse.json();
          const connectors = connectorResult.data || [];

          // Case 1: No connector exists - show Step 1
          if (connectors.length === 0) {
            setShowConfigGuide(true);
            setLoading(false);
            return;
          }

          // Case 2: Connector exists but needs configuration - show Step 2
          const incompleteConnector = connectors.find(
            conn => conn.status === "created" || conn.status === "needs_configuration"
          );

          if (incompleteConnector) {
            setShowConfigGuide(true);
            setCreationSuccess({
              id: incompleteConnector.id,
              type: incompleteConnector.type,
              name: incompleteConnector.name,
              status: incompleteConnector.status,
            });
            // Start at Step 2 (Deploy Container)
            setShowStep2(true);
            setLoading(false);
            return;
          }
        }

        // Step 2: If connectors are configured, fetch overview data
        const response = await fetch(
          "http://localhost:4000/api/dashboard/overview/data",
          { credentials: "include" }
        );
        
        if (response.status === 404) {
          setShowConfigGuide(true);
          setLoading(false);
          return;
        }

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
    setConfigFormData(prev => ({
      ...prev,
      [field]: value
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
        use_text_extraction_service: true
      };

      if (connectorType === "s3") {
        configBody = {
          ...configBody,
          connectorType: "s3",
          buckets: encodeURI(configFormData.buckets),
          aws_access_key_id: encodeURI(configFormData.aws_access_key_id),
          aws_secret_access_key: encodeURI(configFormData.aws_secret_access_key),
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

      if (response.ok) {
        setConfigurationSuccess(true);
      } else {
        setConfigurationError(result.message || "Failed to configure connector");
      }
    } catch (err) {
      console.error("Error configuring connector:", err);
      setConfigurationError(err.message || "Failed to configure connector");
    } finally {
      setIsConfiguringConnector(false);
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

          {/* Step 1: Create Connector - only show if Step 2 is not active */}
          {!showStep2 && (
            <div className="config-step-card">
              <div className="step-header">
                <div className="step-number">Step 1</div>
                <h2>Run API Connector</h2>
              </div>
              
              <div className="step-content">
                <p className="step-description">
                  Select your cloud platform and create a connector to start syncing your data sources.
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
                          <span className="detail-value">{creationSuccess.id}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Name:</span>
                          <span className="detail-value">{creationSuccess.name}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Type:</span>
                          <span className="detail-value">{creationSuccess.type}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Index Name:</span>
                          <span className="detail-value">{creationSuccess.index_name}</span>
                        </div>
                        <div className="detail-item full-width">
                          <span className="detail-label">Result:</span>
                          <span className="detail-value">{creationSuccess.result}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Deploy Container */}
          {showStep2 && !showStep3 && !configurationSuccess && (
            <div className="config-step-card" style={{ marginTop: '24px' }}>
              <div className="step-header">
                <div className="step-number">Step 2</div>
                <h2>Deploy Container</h2>
              </div>
              
              <div className="step-content">
                <p className="step-description">
                  Configure the Docker environment and start the connector container.
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
                    <li>Open <code>.env</code> in the <code>local/</code> folder for elastic docker-compose.</li>
                    <li>Find variable <code>{creationSuccess?.name}_CONNECTOR_ID</code> and paste the connector ID.</li>
                    <li>Rerun docker-compose or recreate the corresponding connector container.</li>
                  </ol>
                </div>

                <button
                  className="create-connector-button"
                  onClick={handleContainerStarted}
                  style={{ marginTop: '20px' }}
                >
                  I have updated .env & started container
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Update Connector Configuration */}
          {showStep3 && !configurationSuccess && (
            <div className="config-step-card" style={{ marginTop: '24px' }}>
              <div className="step-header">
                <div className="step-number">Step 3</div>
                <h2>Update Connector Configuration</h2>
              </div>
              
              <div className="step-content">
                <p className="step-description">
                  Configure your {creationSuccess.type === "s3" ? "AWS S3" : "Azure Blob Storage"} connector with the required credentials and settings.
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
                          onChange={(e) => handleConfigFormChange('buckets', e.target.value)}
                          disabled={isConfiguringConnector}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="aws_access_key_id">AWS Access Key ID</label>
                        <input
                          id="aws_access_key_id"
                          type="text"
                          className="form-input"
                          placeholder="Enter AWS Access Key ID"
                          value={configFormData.aws_access_key_id}
                          onChange={(e) => handleConfigFormChange('aws_access_key_id', e.target.value)}
                          disabled={isConfiguringConnector}
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="aws_secret_access_key">AWS Secret Access Key</label>
                        <input
                          id="aws_secret_access_key"
                          type="password"
                          className="form-input"
                          placeholder="Enter AWS Secret Access Key"
                          value={configFormData.aws_secret_access_key}
                          onChange={(e) => handleConfigFormChange('aws_secret_access_key', e.target.value)}
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
                          onChange={(e) => handleConfigFormChange('account_name', e.target.value)}
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
                          onChange={(e) => handleConfigFormChange('containers', e.target.value)}
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
                          onChange={(e) => handleConfigFormChange('blob_endpoint', e.target.value)}
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
                          onChange={(e) => handleConfigFormChange('account_key', e.target.value)}
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
                  {isConfiguringConnector ? "Configuring..." : "Configure Connector"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 Success Message */}
          {configurationSuccess && (
            <div className="config-step-card" style={{ marginTop: '24px' }}>
              <div className="notification success-notification">
                <span className="notification-icon">✅</span>
                <span>Connector configured successfully! Your setup is complete.</span>
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
