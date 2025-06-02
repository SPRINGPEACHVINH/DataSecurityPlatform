import React, { useState } from "react";
import "./DataSources.css";
import Overview from "./Overview";
import LogManager from "./LogManager";

function DataSources() {
  const [currentPage, setCurrentPage] = useState("data-sources");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBarTerm, setSearchBarTerm] = useState("");
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleNavigation = (section) => {
    console.log(`Navigating to: ${section}`);
    setCurrentPage(section);
    // Reset states when changing pages
    setSelectedContainer(null);
    setSearchBarTerm("");
    setSelectedFile(null);
    setIsModalOpen(false);
  };

  const handleViewClick = (type, item) => {
    console.log(`Viewing ${type}:`, item);
    if (type === "connection") {
      setSelectedContainer(item.name);
      setSearchBarTerm(""); // Clear search when selecting a container
    } else if (type === "file") {
      setSelectedFile(item);
      setIsModalOpen(true);
    }
  };

  const handleSearch = () => {
    console.log("Searching for:", searchBarTerm);
    // Search functionality is handled in real-time through searchBarTerm state
  };

  const handleUserProfileClick = () => {
    console.log("User profile clicked");
    // Add user profile dropdown logic here
  };

  const handleHelpClick = () => {
    console.log("Help clicked");
    // Add help logic here
  };

  const handleClearSearch = () => {
    setSearchBarTerm("");
  };

  const handleClearContainer = () => {
    setSelectedContainer(null);
  };

  const handleShowAllFiles = () => {
    setSelectedContainer(null);
    setSearchBarTerm("");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
  };

  const handleModalOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape" && isModalOpen) {
        handleCloseModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener("keydown", handleEscKey);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  const connectionData = [
    {
      name: "container-a",
      type: "Azure Blob",
      status: "Connected",
      fileCount: 12,
      records: "4 records fond",
    },
    {
      name: "bucket-a",
      type: "AWS S3",
      status: "Disconnected",
      fileCount: 4,
      records: null,
    },
    {
      name: "bucket-b",
      type: "AWS S3",
      status: "Connected",
      fileCount: 0,
      records: null,
    },
    {
      name: "container-b",
      type: "Azure Blob",
      status: "Connected",
      fileCount: 1,
      records: null,
    },
  ];

  const filesData = [
    {
      name: "train.csv",
      path: "bucket-a/archive_2/DeSSI_v2/test/",
      container: "bucket-a",
      severity: "Low",
      updatedAt: "1 day ago",
    },
    {
      name: "bank.csv",
      path: "bucket-a/archive_2/DeSSI_v2/standard_data/",
      container: "bucket-a",
      severity: "Critical",
      updatedAt: "1 day ago",
    },
    {
      name: "dev.txt",
      path: "bucket-a/archive_2/dessi/",
      container: "bucket-a",
      severity: "Medium",
      updatedAt: "1 day ago",
    },
    {
      name: "archive.csv",
      path: "bucket-a/data/credentials",
      container: "bucket-a",
      severity: "High",
      updatedAt: "1 day ago",
    },
    {
      name: "config.json",
      path: "container-a/settings/",
      container: "container-a",
      severity: "Low",
      updatedAt: "2 days ago",
    },
    {
      name: "users.csv",
      path: "container-a/data/users/",
      container: "container-a",
      severity: "High",
      updatedAt: "1 day ago",
    },
    {
      name: "logs.txt",
      path: "container-a/logs/",
      container: "container-a",
      severity: "Medium",
      updatedAt: "3 hours ago",
    },
    {
      name: "backup.zip",
      path: "bucket-b/backups/",
      container: "bucket-b",
      severity: "Low",
      updatedAt: "1 week ago",
    },
    {
      name: "temp.csv",
      path: "container-b/temp/",
      container: "container-b",
      severity: "Low",
      updatedAt: "5 days ago",
    },
  ];

  // Filter files based on search term and selected container
  const filteredFiles = filesData.filter((file) => {
    // Filter by selected container first
    if (selectedContainer && file.container !== selectedContainer) {
      return false;
    }

    // Then filter by search term
    if (!searchBarTerm.trim()) return true;

    const searchLower = searchBarTerm.toLowerCase();
    const nameMatch = file.name.toLowerCase().includes(searchLower);
    const pathMatch = file.path.toLowerCase().includes(searchLower);
    const severityMatch = file.severity.toLowerCase().includes(searchLower);

    return nameMatch || pathMatch || severityMatch;
  });

  // Get total files for the selected container or all files
  const totalFilesCount = selectedContainer
    ? filesData.filter((file) => file.container === selectedContainer).length
    : filesData.length;

  // Shared user profile section
  const userProfileSection = (
    <div className="header-controls">
      <input
        type="text"
        className="search-input"
        placeholder="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="user-profile" onClick={handleUserProfileClick}>
        <div className="user-info">
          <img
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/26f0a624d150c8c02938247753a1054d42060a0b?placeholderIfAbsent=true"
            className="user-avatar"
            alt="User Avatar"
          />
          <div className="user-name">Xuan Tung</div>
        </div>
        <img
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/2b743dbcd0157a48cdbb66a0049f7867f7fa50ed?placeholderIfAbsent=true"
          className="user-dropdown-arrow"
          alt="Dropdown"
        />
      </div>
    </div>
  );

  // Shared sidebar component
  const sidebarComponent = (
    <div className="sidebar-container">
      <div className="sidebar-content">
        <div className="sidebar-nav-content">
          <img
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/d4849b383616c2f4103824996486230e4a3ef64d?placeholderIfAbsent=true"
            className="logo-image"
            alt="Logo"
          />
          <div
            className={
              currentPage === "overview" ? "nav-item-active" : "nav-item"
            }
            onClick={() => handleNavigation("overview")}
          >
            {currentPage === "overview" && (
              <div className="nav-active-indicator" />
            )}
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/1127b15854d1838ed0017736f5cd062dd981ba45?placeholderIfAbsent=true"
              className="nav-icon overview"
              alt="Overview"
            />
            <div>Overview</div>
          </div>
          <div
            className={
              currentPage === "log-manager" ? "nav-item-active" : "nav-item"
            }
            onClick={() => handleNavigation("log-manager")}
          >
            {currentPage === "log-manager" && (
              <div className="nav-active-indicator" />
            )}
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/b73512fb2c8a58aa1d81d2fd47f78e1ae24073f0?placeholderIfAbsent=true"
              className="nav-icon log-manager"
              alt="Log Manager"
            />
            <div>Log Manager</div>
          </div>
          <div
            className={
              currentPage === "data-sources" ? "nav-item-active" : "nav-item"
            }
            onClick={() => handleNavigation("data-sources")}
          >
            {currentPage === "data-sources" && (
              <div className="nav-active-indicator" />
            )}
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/06c70f9049b0d084cfba941fd3b972b8a1eadf3b?placeholderIfAbsent=true"
              className="nav-icon data-sources"
              alt="Data Sources"
            />
            <div>Data Sources</div>
          </div>
        </div>
      </div>
      <div className="sidebar-footer">
        <div className="help-section" onClick={handleHelpClick}>
          <img
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/2a81dbe3a52e7908136dd1559c32a29868939c49?placeholderIfAbsent=true"
            className="help-icon"
            alt="Help"
          />
          <div>Help</div>
        </div>
        <img
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/c1a352735ceb2b355673f83bb3a246f485137194?placeholderIfAbsent=true"
          className="help-arrow"
          alt="Arrow"
        />
      </div>
    </div>
  );

  // Render different pages based on currentPage state
  if (currentPage === "overview") {
    return (
      <div className="data-sources-container">
        {sidebarComponent}
        <Overview userProfileSection={userProfileSection} />
      </div>
    );
  }

  if (currentPage === "log-manager") {
    return (
      <div className="data-sources-container">
        {sidebarComponent}
        <LogManager userProfileSection={userProfileSection} />
      </div>
    );
  }

  // Default: Data Sources page
  return (
    <div className="data-sources-container">
      {sidebarComponent}

      <div className="main-content">
        <div className="header-section">
          <div className="page-title">Data Sources</div>
          {userProfileSection}
        </div>

        <div className="connection-status-card">
          <div className="card-title">Connection Status</div>
          <div className="connection-table">
            <div className="table-header">
              <div>Container Name</div>
              <div>Source Type</div>
              <div>Status</div>
              <div>File Count</div>
              <div>Actions</div>
            </div>
            {connectionData.map((item, index) => (
              <div key={index} className="table-row">
                <div>{item.name}</div>
                <div>
                  {item.type}
                  {item.records && (
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#999",
                        marginTop: "4px",
                      }}
                    >
                      {item.records}
                    </div>
                  )}
                </div>
                <div>
                  <span
                    className={`status-badge ${item.status === "Connected" ? "status-connected" : "status-disconnected"}`}
                  >
                    {item.status}
                  </span>
                </div>
                <div>{item.fileCount}</div>
                <div>
                  <button
                    className="view-button"
                    onClick={() => handleViewClick("connection", item)}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="search-bar-container">
          <div className="search-bar">
            <input
              type="text"
              className="search-bar-input"
              placeholder="Search"
              value={searchBarTerm}
              onChange={(e) => setSearchBarTerm(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <button className="search-icon-button" onClick={handleSearch}>
              <img
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/60417cb378d43d78584e8f99017e90c675f4d68f?placeholderIfAbsent=true"
                className="search-icon"
                alt="Search"
              />
            </button>
          </div>
          <div className="record-count">
            {selectedContainer
              ? searchBarTerm
                ? `${filteredFiles.length} of ${totalFilesCount} files found in ${selectedContainer}`
                : `${totalFilesCount} files in ${selectedContainer}`
              : searchBarTerm
                ? `${filteredFiles.length} of ${filesData.length} files found`
                : `${filesData.length} files total`}
          </div>
        </div>

        <div className="container-files-card">
          <div className="card-title">
            Container Files
            {selectedContainer && (
              <span
                style={{
                  fontSize: "16px",
                  color: "#774AA4",
                  marginLeft: "10px",
                }}
              >
                - {selectedContainer}
              </span>
            )}
            {selectedContainer && (
              <button
                onClick={handleShowAllFiles}
                style={{
                  marginLeft: "15px",
                  color: "#774AA4",
                  background: "none",
                  border: "1px solid #774AA4",
                  borderRadius: "3px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                Show All Files
              </button>
            )}
          </div>
          <div className="files-table">
            <div className="files-table-header">
              <div>File Name</div>
              <div>Resources</div>
              <div>Severity</div>
              <div>Updated at</div>
              <div>Actions</div>
            </div>
            {filteredFiles.length > 0 ? (
              filteredFiles.map((file, index) => (
                <div key={index} className="files-table-row">
                  <div>
                    <div>{file.name}</div>
                  </div>
                  <div>
                    <div className="file-path">{file.path}</div>
                  </div>
                  <div>
                    <span
                      className={`severity-badge severity-${file.severity.toLowerCase()}`}
                    >
                      {file.severity}
                    </span>
                  </div>
                  <div>{file.updatedAt}</div>
                  <div>
                    <button
                      className="view-button"
                      onClick={() => handleViewClick("file", file)}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div
                className="files-table-row"
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "40px",
                  color: "#999",
                }}
              >
                {selectedContainer ? (
                  searchBarTerm ? (
                    <>
                      No files found matching "{searchBarTerm}" in{" "}
                      {selectedContainer}
                      <button
                        onClick={handleClearSearch}
                        style={{
                          marginLeft: "10px",
                          color: "#774AA4",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Clear search
                      </button>
                    </>
                  ) : (
                    <>
                      No files available in {selectedContainer}
                      <button
                        onClick={handleShowAllFiles}
                        style={{
                          marginLeft: "10px",
                          color: "#774AA4",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Show all files
                      </button>
                    </>
                  )
                ) : searchBarTerm ? (
                  <>
                    No files found matching "{searchBarTerm}"
                    <button
                      onClick={handleClearSearch}
                      style={{
                        marginLeft: "10px",
                        color: "#774AA4",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  "No files available"
                )}
              </div>
            )}
          </div>
        </div>

        {/* File Details Modal */}
        {isModalOpen && selectedFile && (
          <div className="modal-overlay" onClick={handleModalOverlayClick}>
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">File Details</h2>
                <button
                  className="modal-close-button"
                  onClick={handleCloseModal}
                >
                  ×
                </button>
              </div>

              <div className="file-details">
                <div className="file-detail-row">
                  <div className="file-detail-label">File Name</div>
                  <div className="file-detail-value">{selectedFile.name}</div>
                </div>

                <div className="file-detail-row">
                  <div className="file-detail-label">Container</div>
                  <div className="file-detail-value">
                    {selectedFile.container}
                  </div>
                </div>

                <div className="file-detail-row">
                  <div className="file-detail-label">File Path</div>
                  <div className="file-detail-value path">
                    {selectedFile.path}
                  </div>
                </div>

                <div className="file-detail-row">
                  <div className="file-detail-label">Severity Level</div>
                  <div className="file-detail-value">
                    <span
                      className={`severity-badge severity-${selectedFile.severity.toLowerCase()} file-severity-display`}
                    >
                      {selectedFile.severity}
                    </span>
                  </div>
                </div>

                <div className="file-detail-row">
                  <div className="file-detail-label">Last Updated</div>
                  <div className="file-detail-value">
                    {selectedFile.updatedAt}
                  </div>
                </div>

                <div className="file-detail-row">
                  <div className="file-detail-label">File Size</div>
                  <div className="file-detail-value">
                    {selectedFile.name.endsWith(".csv")
                      ? "2.4 MB"
                      : selectedFile.name.endsWith(".zip")
                        ? "15.7 MB"
                        : selectedFile.name.endsWith(".json")
                          ? "1.2 KB"
                          : "856 KB"}
                  </div>
                </div>

                <div className="file-detail-row">
                  <div className="file-detail-label">File Type</div>
                  <div className="file-detail-value">
                    {selectedFile.name.split(".").pop().toUpperCase()} File
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="modal-button secondary"
                  onClick={handleCloseModal}
                >
                  Close
                </button>
                <button
                  className="modal-button primary"
                  onClick={() => {
                    console.log("Download file:", selectedFile.name);
                    // Add download logic here
                  }}
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataSources;
