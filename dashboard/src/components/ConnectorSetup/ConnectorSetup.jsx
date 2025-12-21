import { useEffect, useState } from "react";
import "./ConnectorSetup.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function ConnectorSetup({ onSetupComplete }) {
  const [selectedConnectorType, setSelectedConnectorType] = useState("Azure");
  const [isCreating, setIsCreating] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState(null);
  const [creationError, setCreationError] = useState(null);

  // Step states
  const [showStep2, setShowStep2] = useState(false);
  const [showStep3, setShowStep3] = useState(false);
  const [showStep4, setShowStep4] = useState(false);
  const [showConnectorError, setShowConnectorError] = useState(false);
  
  // Case 6 states
  const [showExistingConnector, setShowExistingConnector] = useState(false);
  const [existingConnector, setExistingConnector] = useState(null);
  const [isTypeDisabled, setIsTypeDisabled] = useState(false);
  
  // Case 7 states
  const [showFullConfiguration, setShowFullConfiguration] = useState(false);
  const [connectorList, setConnectorList] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Configuration states
  const [isConfiguringConnector, setIsConfiguringConnector] = useState(false);
  const [configurationSuccess, setConfigurationSuccess] = useState(false);
  const [configurationError, setConfigurationError] = useState(null);
  
  // Sync states
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

  useEffect(() => {
    async function initializeSetup() {
      try {
        // 1. Parallel Data Fetching
        const [dashboardResponse, connectorResponse] = await Promise.all([
          fetch(`${BACKEND_URL}/api/dashboard/overview/data`, {
            credentials: "include",
          }),
          fetch(`${BACKEND_URL}/api/dashboard/elasticsearch/connector`, {
            credentials: "include",
          }),
        ]);

        const connectors = connectorResponse.ok
          ? (await connectorResponse.json()).data || []
          : [];

        console.log("Fetched connectors:", connectors);
        console.log("Dashboard status:", dashboardResponse.status);

        // 2. Priority Check 1: Pending Connectors (Status != 'connected')
        const pendingConnector = connectors.find(
          (conn) => conn.status !== "connected"
        );

        if (pendingConnector) {
          const connectorData = {
            id: pendingConnector.id,
            type: pendingConnector.type,
            name: pendingConnector.name,
            status: pendingConnector.status,
          };

          // Resume at specific step based on status
          switch (pendingConnector.status) {
            case "created": // Step 2 (Deploy)
              setCreationSuccess(connectorData);
              setShowStep2(true);
              break;

            case "needs_configuration": // Step 3 (Config)
              setCreationSuccess(connectorData);
              setShowStep2(true);
              setShowStep3(true);
              break;

            case "error": // Error
            case "configured":
              setCreationSuccess(connectorData);
              setShowConnectorError(true);
              break;

            default:
              console.warn("Unknown connector status:", pendingConnector.status);
              break;
          }
          return;
        }

        // 3. Priority Check 2: Dashboard Status (404 vs 200)
        if (dashboardResponse.status === 404) {
          // Dashboard Data Not Found
          if (connectors.length === 0) {
            // Brand New - Step 1
            return;
          } else {
            // Connectors exist and are 'connected' - Step 4 (Initial Sync)
            const connector = connectors[0];
            setCreationSuccess({
              id: connector.id,
              type: connector.type,
              name: connector.name,
              status: connector.status,
            });
            setConfigurationSuccess(true);
            setShowStep4(true);
            return;
          }
        }

        // 4. Priority Check 3: Expansion & Full (Dashboard Data is 200 OK)
        if (dashboardResponse.ok) {
          // All connectors are 'connected' (passed Check 1)
          if (connectors.length === 1) {
            // Case 6: Expansion
            const connector = connectors[0];
            setExistingConnector({
              id: connector.id,
              type: connector.type,
              name: connector.name,
              status: connector.status,
            });
            setShowExistingConnector(true);
            return;
          } else if (connectors.length === 2) {
            // Case 7: Full
            setConnectorList(connectors.map(conn => ({
              id: conn.id,
              type: conn.type,
              name: conn.name,
              status: conn.status,
            })));
            setShowFullConfiguration(true);
            return;
          }
        }
      } catch (err) {
        console.error("Error initializing setup:", err);
      }
    }

    initializeSetup();
  }, []);

  const handleCreateConnector = async () => {
    setIsCreating(true);
    setCreationError(null);
    setCreationSuccess(null);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/dashboard/elasticsearch/createconnector`,
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

  const handleSetupMissingType = () => {
    // Determine the missing type based on existing connector
    const missingType = existingConnector.type === "s3" ? "Azure" : "AWS";
    setSelectedConnectorType(missingType);
    setIsTypeDisabled(true);
    setShowExistingConnector(false);
  };

  const handleGoToDashboard = () => {
    if (onSetupComplete) {
      onSetupComplete();
    }
  };

  const handleEditConnector = (connector) => {
    // Set editing mode to true
    setIsEditing(true);
    
    // Set the connector as if it was just created
    setCreationSuccess({
      id: connector.id,
      type: connector.type,
      name: connector.name,
      status: connector.status,
    });
    
    // Hide Case 7 view and show Step 3 (Configuration)
    setShowFullConfiguration(false);
    setShowStep2(true);
    setShowStep3(true);
  };

  const handleCancelEdit = () => {
    // Reset editing mode
    setIsEditing(false);
    
    // Reset temporary form data
    setCreationSuccess(null);
    setConfigurationError(null);
    setConfigFormData({
      buckets: "",
      aws_access_key_id: "",
      aws_secret_access_key: "",
      account_name: "",
      account_key: "",
      blob_endpoint: "",
      containers: "",
    });
    
    // Navigate back to Step 7 (System Fully Configured)
    setShowStep2(false);
    setShowStep3(false);
    setShowFullConfiguration(true);
  };

  const handleDeleteConnector = async (connectorId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this connector? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/dashboard/elasticsearch/delete_connector?connector_id=${encodeURIComponent(connectorId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (response.status === 200 && result.acknowledged === true) {
        alert("Connector deleted successfully!");
        
        // Refresh by resetting all states and re-fetching data
        setShowFullConfiguration(false);
        setConnectorList([]);
        setCreationSuccess(null);
        setShowStep2(false);
        setShowStep3(false);
        setShowStep4(false);
        setIsEditing(false);
        
        // Re-fetch and reinitialize
        const connectorResponse = await fetch(
          `${BACKEND_URL}/api/dashboard/elasticsearch/connector`,
          { credentials: "include" }
        );
        const dashboardResponse = await fetch(
          `${BACKEND_URL}/api/dashboard/overview/data`,
          { credentials: "include" }
        );
        
        const connectors = connectorResponse.ok
          ? (await connectorResponse.json()).data || []
          : [];
        
        if (dashboardResponse.ok && connectors.length === 2) {
          setConnectorList(connectors.map(conn => ({
            id: conn.id,
            type: conn.type,
            name: conn.name,
            status: conn.status,
          })));
          setShowFullConfiguration(true);
        } else if (connectors.length === 1) {
          const connector = connectors[0];
          setExistingConnector({
            id: connector.id,
            type: connector.type,
            name: connector.name,
            status: connector.status,
          });
          setShowExistingConnector(true);
        }
      } else {
        alert(result.message || "Failed to delete connector.");
      }
    } catch (err) {
      console.error("Error deleting connector:", err);
      alert("Failed to delete connector. Please try again.");
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
        `${BACKEND_URL}/api/dashboard/elasticsearch/connector_configuration?connector_id=${encodeURIComponent(creationSuccess.id)}`,
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
        setIsEditing(false);
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

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/dashboard/elasticsearch/connector/sync?connector_id=${encodeURIComponent(creationSuccess.id)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (response.ok && result.syncstatus === "completed") {
        // Notify parent component that setup is complete
        if (onSetupComplete) {
          onSetupComplete();
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

  return (
    <div className="config-guide-container">
      <div className="config-guide-header">
        <h1>Welcome to Data Security Platform</h1>
        <p>Let's get you started with the initial setup</p>
      </div>

      {/* Case 6: Show existing connector with option to setup missing type */}
      {showExistingConnector && existingConnector && (
        <div className="config-step-card">
          <div className="step-header">
            <h2>Existing Connector</h2>
          </div>

          <div className="step-content">
            <div className="notification success-notification" style={{  }}>
              <span className="notification-icon">✅</span>
              <span>You have an active connector configured!</span>
            </div>

            <div className="connector-details">
              <h3>Current Connector Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">ID:</span>
                  <span className="detail-value">{existingConnector.id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{existingConnector.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">{existingConnector.type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">{existingConnector.status}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "24px", padding: "20px", backgroundColor: "#fcfaff", borderRadius: "6px" }}>
              <p className="step-description" style={{ marginBottom: "16px" }}>
                You currently have a <strong>{existingConnector.type === "s3" ? "AWS S3" : "Azure Blob Storage"}</strong> connector. 
                Would you like to set up a <strong>{existingConnector.type === "s3" ? "Azure Blob Storage" : "AWS S3"}</strong> connector?
              </p>
              <button
                className="create-connector-button"
                onClick={handleSetupMissingType}
              >
                Setup {existingConnector.type === "s3" ? "Azure" : "AWS"} Connector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case 4: Show error view for "error" or "configured" status */}
      {showConnectorError && (
        <div className="config-step-card">
          <div className="notification error-notification">
            <span className="notification-icon">❌</span>
            <span>
              Connector is not configured correctly, please review instructions.
            </span>
          </div>
        </div>
      )}

      {/* Case 7: Full Configuration - All Connectors Active */}
      {showFullConfiguration && (
        <div className="config-step-card">
          <div className="full-config-header">
            <h2>System Fully Configured</h2>
            <p className="step-description">
              All supported connectors are active.
            </p>
          </div>

          <div className="connector-list">
            {connectorList.map((connector) => (
              <div key={connector.id} className="connector-card readonly">
                <div className="connector-card-header">
                  <h3 className="connector-name">{connector.name}</h3>
                  <span className="status-badge connected">Connected</span>
                </div>
                <div className="connector-details">
                  <div className="detail-item">
                    <span className="detail-label">Type:</span>
                    <span className="detail-value">
                      {connector.type === "s3" ? "AWS S3" : "Azure Blob Storage"}
                    </span>
                  </div>
                </div>
                <div className="connector-actions">
                  <button
                    className="btn-edit"
                    onClick={() => handleEditConnector(connector)}
                  >
                    Edit Config
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleDeleteConnector(connector.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="action-buttons" style={{ marginTop: "24px" }}>
            <button
              className="create-connector-button"
              onClick={handleGoToDashboard}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      { }
      {!showStep2 && !showConnectorError && !showExistingConnector && !showFullConfiguration && (
        <div className="config-step-card">
          <div className="step-header">
            <div className="step-number">Step 1</div>
            <h2>Run API Connector</h2>
          </div>

          <div className="step-content">
            <p className="step-description">
              Select your cloud platform and create a connector to start syncing
              your data sources.
            </p>

            <div className="connector-form">
              <div className="form-group">
                <label htmlFor="connector-type">Connector Type</label>
                <select
                  id="connector-type"
                  className="connector-select"
                  value={selectedConnectorType}
                  onChange={(e) => setSelectedConnectorType(e.target.value)}
                  disabled={isCreating || isTypeDisabled}
                >
                  <option value="Azure">Azure</option>
                  <option value="AWS">AWS</option>
                </select>
                {isTypeDisabled && (
                  <p style={{ fontSize: "12px", color: "#7b7b7b", marginTop: "8px" }}>
                    Type pre-selected to avoid duplicate connector types.
                  </p>
                )}
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
      {showStep2 && !showStep3 && !configurationSuccess && !showConnectorError && (
        <div className="config-step-card" style={{ marginTop: "24px" }}>
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
                  📋 Copy
                </button>
              </div>
            </div>

            <div className="instructions-section">
              <h3>Instructions:</h3>
              <ol className="instruction-list">
                <li>
                  Open <code>.env</code> in the <code>local/</code> folder for
                  elastic docker-compose.
                </li>
                <li>
                  Find variable <code>{creationSuccess?.name}_CONNECTOR_ID</code>{" "}
                  and paste the connector ID.
                </li>
                <li>
                  Rerun docker-compose or recreate the corresponding connector
                  container.
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
              {creationSuccess.type === "s3" ? "AWS S3" : "Azure Blob Storage"}{" "}
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
                    <label htmlFor="aws_access_key_id">AWS Access Key ID</label>
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
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
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
                        handleConfigFormChange("account_name", e.target.value)
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
                        handleConfigFormChange("blob_endpoint", e.target.value)
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
                        handleConfigFormChange("account_key", e.target.value)
                      }
                      disabled={isConfiguringConnector}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="form-actions">
              <button
                className="create-connector-button"
                onClick={handleConfigureConnector}
                disabled={isConfiguringConnector}
              >
                {isConfiguringConnector ? "Configuring..." : "Configure Connector"}
              </button>
              {isEditing && (
                <button
                  className="cancel-button"
                  onClick={handleCancelEdit}
                  disabled={isConfiguringConnector}
                >
                  Cancel
                </button>
              )}
            </div>
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
              Start the initial data synchronization to import your files and data
              sources into the platform.
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
  );
}

export default ConnectorSetup;
