import React, { useState, useEffect } from "react";
import "./Misconfig.css";
import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";

function Misconfig({
  onLogout,
  onNavigateToDataSources,
  onNavigateToOverview,
  onNavigateToSearch,
  onNavigateToLogManager,
}) {
  const [cloudProvider, setCloudProvider] = useState("AWS");
  const [inputMethod, setInputMethod] = useState("quick");
  const [selectedProfile, setSelectedProfile] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [savedProfiles, setSavedProfiles] = useState([]);

  // AWS Credentials
  const [awsCredentials, setAwsCredentials] = useState({
    name: "",
    accessKeyId: "",
    secretAccessKey: "",
    region: "us-east-1",
  });

  // Azure Credentials
  const [azureCredentials, setAzureCredentials] = useState({
    name: "",
    clientId: "",
    clientSecret: "",
    tenantId: "",
    subscriptionId: "",
  });

  // Load saved profiles from localStorage
  useEffect(() => {
    const profiles = JSON.parse(localStorage.getItem("cloudProfiles") || "[]");
    setSavedProfiles(profiles);
  }, []);

  const handleCloudProviderChange = (provider) => {
    setCloudProvider(provider);
    setSelectedProfile("");
  };

  const handleInputMethodChange = (method) => {
    setInputMethod(method);
    if (method === "quick") {
      setSelectedProfile("");
    }
  };

  const handleProfileSelect = (e) => {
    const profileId = e.target.value;
    setSelectedProfile(profileId);

    if (profileId) {
      const profile = savedProfiles.find((p) => p.id === profileId);
      if (profile) {
        if (profile.provider === "AWS") {
          setAwsCredentials({
            name: profile.name,
            accessKeyId: profile.accessKeyId,
            secretAccessKey: profile.secretAccessKey,
            region: profile.region,
          });
        } else {
          setAzureCredentials({
            name: profile.name,
            clientId: profile.clientId,
            clientSecret: profile.clientSecret,
            tenantId: profile.tenantId,
            subscriptionId: profile.subscriptionId,
          });
        }
      }
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newProfile = {
      id: Date.now().toString(),
      provider: cloudProvider,
      name: formData.get("name"),
      ...(cloudProvider === "AWS"
        ? {
            accessKeyId: formData.get("accessKeyId"),
            secretAccessKey: formData.get("secretAccessKey"),
            region: formData.get("region"),
          }
        : {
            clientId: formData.get("clientId"),
            clientSecret: formData.get("clientSecret"),
            tenantId: formData.get("tenantId"),
            subscriptionId: formData.get("subscriptionId"),
          }),
    };

    const updatedProfiles = [...savedProfiles, newProfile];
    setSavedProfiles(updatedProfiles);
    localStorage.setItem("cloudProfiles", JSON.stringify(updatedProfiles));
    setIsModalOpen(false);
    alert("Profile saved successfully!");
  };

  const handleStartScan = async () => {
    // Validate credentials
    if (inputMethod === "quick") {
      if (cloudProvider === "AWS") {
        if (!awsCredentials.accessKeyId || !awsCredentials.secretAccessKey) {
          alert("Please enter AWS credentials");
          return;
        }
      } else {
        if (
          !azureCredentials.clientId ||
          !azureCredentials.clientSecret ||
          !azureCredentials.tenantId ||
          !azureCredentials.subscriptionId
        ) {
          alert("Please enter all Azure credentials");
          return;
        }
      }
    } else {
      if (!selectedProfile) {
        alert("Please select a saved profile");
        return;
      }
    }

    setIsScanning(true);
    setScanResults(null);

    // Simulate API call (2-4 minutes simulation = 2-4 seconds for demo)
    setTimeout(() => {
      // Sample data based on provided JSON
      const mockResults = {
        data: {
          timestamp: new Date().toISOString(),
          failedResources: [
            {
              plugin: "networkAccessDefaultAction",
              category: "Storage Accounts",
              title: "Network Access Default Action",
              description:
                "Ensures that Storage Account access is restricted to trusted networks",
              resource:
                "/subscriptions/a7f33dd2-f621-44dc-9864-545887ea24ef/resourceGroups/ELK/providers/Microsoft.Storage/storageAccounts/forelk",
              region: "eastus",
              status: "FAIL",
              message:
                "Storage Account default network access rule set to allow from all networks",
            },
            {
              plugin: "storageAccountEncryption",
              category: "Storage Accounts",
              title: "Storage Account Encryption",
              description:
                "Ensures that Storage Accounts are encrypted with customer-managed keys",
              resource:
                "/subscriptions/a7f33dd2-f621-44dc-9864-545887ea24ef/resourceGroups/ELK/providers/Microsoft.Storage/storageAccounts/testdata",
              region: "westus2",
              status: "FAIL",
              message: "Storage Account is not using customer-managed encryption keys",
            },
            {
              plugin: "publicAccessBlocked",
              category: "S3 Buckets",
              title: "S3 Public Access Blocked",
              description: "Ensures S3 buckets have public access blocked",
              resource: "arn:aws:s3:::my-test-bucket",
              region: "us-east-1",
              status: "FAIL",
              message: "S3 bucket allows public access",
            },
          ],
        },
      };

      setScanResults(mockResults);
      setIsScanning(false);
    }, 3000); // 3 seconds for demo
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
      />

      <div className="main-content">
        <Header
          pageTitle="Misconfig"
          searchTerm=""
          onSearchChange={() => {}}
          onLogout={handleLogout}
          showSearch={false}
        />

        <div className="misconfig-content">
          <div className="misconfig-title">Cloud Security Configuration Scanner</div>

          {/* Configuration Area */}
          <div className="config-section">
            <h2 className="section-title">Configuration</h2>

            {/* Cloud Provider Selector */}
            <div className="cloud-provider-tabs">
              <button
                className={`provider-tab ${
                  cloudProvider === "AWS" ? "active" : ""
                }`}
                onClick={() => handleCloudProviderChange("AWS")}
              >
                <span className="provider-icon">☁️</span>
                AWS
              </button>
              <button
                className={`provider-tab ${
                  cloudProvider === "Azure" ? "active" : ""
                }`}
                onClick={() => handleCloudProviderChange("Azure")}
              >
                <span className="provider-icon">⚡</span>
                Azure
              </button>
            </div>

            {/* Input Method Selection */}
            <div className="input-method-section">
              <div className="input-method-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="inputMethod"
                    value="quick"
                    checked={inputMethod === "quick"}
                    onChange={(e) => handleInputMethodChange(e.target.value)}
                  />
                  <span>Quick Input (One-time Scan)</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="inputMethod"
                    value="saved"
                    checked={inputMethod === "saved"}
                    onChange={(e) => handleInputMethodChange(e.target.value)}
                  />
                  <span>Use Saved Profile</span>
                </label>
              </div>
            </div>

            {/* Credentials Form */}
            {inputMethod === "quick" ? (
              <div className="credentials-form">
                {cloudProvider === "AWS" ? (
                  <>
                    <div className="form-group">
                      <label htmlFor="aws-name">Display Name</label>
                      <input
                        id="aws-name"
                        type="text"
                        className="form-input"
                        placeholder="e.g., Production AWS Account"
                        value={awsCredentials.name}
                        onChange={(e) =>
                          setAwsCredentials({
                            ...awsCredentials,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="aws-access-key">AWS Access Key ID</label>
                      <input
                        id="aws-access-key"
                        type="text"
                        className="form-input"
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        value={awsCredentials.accessKeyId}
                        onChange={(e) =>
                          setAwsCredentials({
                            ...awsCredentials,
                            accessKeyId: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="aws-secret-key">AWS Secret Access Key</label>
                      <input
                        id="aws-secret-key"
                        type="password"
                        className="form-input"
                        placeholder="••••••••••••••••••••••••••"
                        value={awsCredentials.secretAccessKey}
                        onChange={(e) =>
                          setAwsCredentials({
                            ...awsCredentials,
                            secretAccessKey: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="aws-region">AWS Region</label>
                      <select
                        id="aws-region"
                        className="form-select"
                        value={awsCredentials.region}
                        onChange={(e) =>
                          setAwsCredentials({
                            ...awsCredentials,
                            region: e.target.value,
                          })
                        }
                      >
                        <option value="us-east-1">US East (N. Virginia)</option>
                        <option value="us-east-2">US East (Ohio)</option>
                        <option value="us-west-1">US West (N. California)</option>
                        <option value="us-west-2">US West (Oregon)</option>
                        <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                        <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                        <option value="eu-west-1">Europe (Ireland)</option>
                        <option value="eu-central-1">Europe (Frankfurt)</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label htmlFor="azure-name">Display Name</label>
                      <input
                        id="azure-name"
                        type="text"
                        className="form-input"
                        placeholder="e.g., Production Azure Account"
                        value={azureCredentials.name}
                        onChange={(e) =>
                          setAzureCredentials({
                            ...azureCredentials,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="azure-client-id">Application (Client) ID</label>
                      <input
                        id="azure-client-id"
                        type="text"
                        className="form-input"
                        placeholder="00000000-0000-0000-0000-000000000000"
                        value={azureCredentials.clientId}
                        onChange={(e) =>
                          setAzureCredentials({
                            ...azureCredentials,
                            clientId: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="azure-client-secret">Client Secret</label>
                      <input
                        id="azure-client-secret"
                        type="password"
                        className="form-input"
                        placeholder="••••••••••••••••••••••••••"
                        value={azureCredentials.clientSecret}
                        onChange={(e) =>
                          setAzureCredentials({
                            ...azureCredentials,
                            clientSecret: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="azure-tenant-id">Directory (Tenant) ID</label>
                      <input
                        id="azure-tenant-id"
                        type="text"
                        className="form-input"
                        placeholder="00000000-0000-0000-0000-000000000000"
                        value={azureCredentials.tenantId}
                        onChange={(e) =>
                          setAzureCredentials({
                            ...azureCredentials,
                            tenantId: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="azure-subscription-id">Subscription ID</label>
                      <input
                        id="azure-subscription-id"
                        type="text"
                        className="form-input"
                        placeholder="00000000-0000-0000-0000-000000000000"
                        value={azureCredentials.subscriptionId}
                        onChange={(e) =>
                          setAzureCredentials({
                            ...azureCredentials,
                            subscriptionId: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="saved-profile-section">
                <div className="profile-selector-row">
                  <div className="form-group flex-grow">
                    <label htmlFor="profile-select">Select Saved Profile</label>
                    <select
                      id="profile-select"
                      className="form-select"
                      value={selectedProfile}
                      onChange={handleProfileSelect}
                    >
                      <option value="">-- Select a Profile --</option>
                      {savedProfiles
                        .filter((p) => p.provider === cloudProvider)
                        .map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    className="add-profile-btn"
                    onClick={() => setIsModalOpen(true)}
                  >
                    + Add New Profile
                  </button>
                </div>
              </div>
            )}

            {/* Start Scan Button */}
            <div className="scan-button-section">
              <button
                className="start-scan-btn"
                onClick={handleStartScan}
                disabled={isScanning}
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
            </div>
          </div>

          {/* Scan Results Section */}
          {scanResults && (
            <div className="results-section">
              <h2 className="section-title">Scan Report</h2>
              
              <div className="results-header">
                <div className="scan-timestamp">
                  Scan completed at: {new Date(scanResults.data.timestamp).toLocaleString()}
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
                      <th>Resource ID</th>
                      <th>Region</th>
                      <th>Status</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResults.data.failedResources.map((resource, index) => (
                      <tr key={index}>
                        <td className="plugin-cell">
                          <div className="plugin-name">{resource.plugin}</div>
                          <div className="plugin-title">{resource.title}</div>
                        </td>
                        <td className="category-cell">{resource.category}</td>
                        <td className="resource-cell">
                          <div className="resource-id">{resource.resource}</div>
                        </td>
                        <td className="region-cell">{resource.region}</td>
                        <td className="status-cell">
                          <span className="status-badge fail">{resource.status}</span>
                        </td>
                        <td className="message-cell">{resource.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Profile Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New {cloudProvider} Profile</h3>
              <button
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveProfile}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="modal-name">Display Name *</label>
                  <input
                    id="modal-name"
                    name="name"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Production Account"
                    required
                  />
                </div>
                {cloudProvider === "AWS" ? (
                  <>
                    <div className="form-group">
                      <label htmlFor="modal-access-key">AWS Access Key ID *</label>
                      <input
                        id="modal-access-key"
                        name="accessKeyId"
                        type="text"
                        className="form-input"
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="modal-secret-key">AWS Secret Access Key *</label>
                      <input
                        id="modal-secret-key"
                        name="secretAccessKey"
                        type="password"
                        className="form-input"
                        placeholder="••••••••••••••••••••••••••"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="modal-region">AWS Region *</label>
                      <select
                        id="modal-region"
                        name="region"
                        className="form-select"
                        required
                      >
                        <option value="us-east-1">US East (N. Virginia)</option>
                        <option value="us-east-2">US East (Ohio)</option>
                        <option value="us-west-1">US West (N. California)</option>
                        <option value="us-west-2">US West (Oregon)</option>
                        <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                        <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                        <option value="eu-west-1">Europe (Ireland)</option>
                        <option value="eu-central-1">Europe (Frankfurt)</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label htmlFor="modal-client-id">Application (Client) ID *</label>
                      <input
                        id="modal-client-id"
                        name="clientId"
                        type="text"
                        className="form-input"
                        placeholder="00000000-0000-0000-0000-000000000000"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="modal-client-secret">Client Secret *</label>
                      <input
                        id="modal-client-secret"
                        name="clientSecret"
                        type="password"
                        className="form-input"
                        placeholder="••••••••••••••••••••••••••"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="modal-tenant-id">Directory (Tenant) ID *</label>
                      <input
                        id="modal-tenant-id"
                        name="tenantId"
                        type="text"
                        className="form-input"
                        placeholder="00000000-0000-0000-0000-000000000000"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="modal-subscription-id">Subscription ID *</label>
                      <input
                        id="modal-subscription-id"
                        name="subscriptionId"
                        type="text"
                        className="form-input"
                        placeholder="00000000-0000-0000-0000-000000000000"
                        required
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Misconfig;
