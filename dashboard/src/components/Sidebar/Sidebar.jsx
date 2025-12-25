import "./Sidebar.css";

function Sidebar({
  currentPage,
  onNavigateToOverview,
  onNavigateToDataSources,
  onNavigateToSearch,
  onNavigateToMisconfig,
  onNavigateToConnectorSetup,
}) {
  return (
    <div className="sidebar-container">
      <div className="sidebar-content">
        <div className="sidebar-nav-content">
          <img
            src="https://res.cloudinary.com/dxcbyypga/image/upload/v1766676849/logo_e84qvl.png"
            className="logo-image"
            alt="Logo"
            style={{ width: "350px", height: "auto" }}
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

          <div
            className={
              currentPage === "misconfig" ? "nav-item-active" : "nav-item"
            }
            onClick={onNavigateToMisconfig}
          >
            {currentPage === "misconfig" && (
              <div className="nav-active-indicator" />
            )}
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/b8d5045840a701da208dd57ad7d80615fc2c7fec?placeholderIfAbsent=true"
              className="nav-icon"
              alt="Misconfig"
            />
            <div>Misconfig</div>
          </div>

          <div
            className={
              currentPage === "connector-setup" ? "nav-item-active" : "nav-item"
            }
            onClick={onNavigateToConnectorSetup}
          >
            {currentPage === "connector-setup" && (
              <div className="nav-active-indicator" />
            )}
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/b8d5045840a701da208dd57ad7d80615fc2c7fec?placeholderIfAbsent=true"
              className="nav-icon"
              alt="Connector Setup"
            />
            <div>Connector Setup</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
