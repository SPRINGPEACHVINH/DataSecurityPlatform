import React from "react";
import "./Sidebar.css";

function Sidebar({
  currentPage,
  onNavigateToOverview,
  onNavigateToLogManager,
  onNavigateToDataSources,
  onNavigateToSearch,
}) {
  return (
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
            onClick={onNavigateToOverview}
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
            onClick={onNavigateToLogManager}
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
            onClick={onNavigateToDataSources}
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

          <div
            className={
              currentPage === "search" ? "nav-item-active" : "nav-item"
            }
            onClick={onNavigateToSearch}
          >
            {currentPage === "search" && (
              <div className="nav-active-indicator" />
            )}
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/b8d5045840a701da208dd57ad7d80615fc2c7fec?placeholderIfAbsent=true"
              className="nav-icon"
              alt="Search"
            />
            <div>Search</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
