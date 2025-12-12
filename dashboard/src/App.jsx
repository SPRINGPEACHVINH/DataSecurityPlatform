import { useState, useEffect } from "react";
import Login from "./components/Login/Login";
import DataSources from "./components/DataSources/DataSources";
import Search from "./components/Search/Search";
import Misconfig from "./components/Misconfig/Misconfig";
import Header from "./components/Header/Header";
import Sidebar from "./components/Sidebar/Sidebar";
import ConnectorSetup from "./components/ConnectorSetup/ConnectorSetup";
import { useSessionCheck } from "./hooks/useSessionCheck";
import { clearSearchSession } from "./hooks/clearSearchSession";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState("login");
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/auth/session", {
        credentials: "include",
      });

      // Check for 401 Unauthorized or other error status codes
      if (response.status === 401 || !response.ok) {
        console.log("Session expired or unauthorized, logging out...");
        handleLogout();
        return false;
      }

      const data = await response.json();

      if (data.isAuthenticated) {
        setUser({
          ...data.user,
          username: data.user.username,
        });
        const savedView = localStorage.getItem("currentView");
        if (savedView && savedView !== "login") {
          setCurrentView(savedView);
        } else {
          setCurrentView("Overview");
        }
        return true;
      } else {
        console.log("User not authenticated, logging out...");
        handleLogout();
        return false;
      }
    } catch (error) {
      console.error("Session check failed:", error);
      handleLogout();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useSessionCheck(checkSession);

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = ({ user, sessionId }) => {
    console.log("Login received:", { user, sessionId });

    const userData = {
      ...user,
      username: user.username,
    };

    setUser(userData);
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("sessionId", sessionId);
    localStorage.setItem("username", user.username);
    localStorage.setItem("currentView", "Overview");
    setCurrentView("Overview");
  };

  const handleLogout = () => {
    clearSearchSession();

    fetch("http://localhost:4000/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).then(() => {
      setUser(null);
    });
    localStorage.removeItem("currentView");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    setCurrentView("login");
  };

  if (isLoading) {
    return (
      <div
        className="App"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f5f5f5",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #e0e0e0",
              borderTop: "4px solid #774aa4",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          ></div>
          <div style={{ color: "#666", fontSize: "16px" }}>Loading...</div>
        </div>
      </div>
    );
  }

  const handleNavigateToSearch = async () => {
    const isValid = await checkSession();
    if (isValid) {
      setCurrentView("Search");
      localStorage.setItem("currentView", "Search");
    }
  };

  const handleNavigateToConnectorSetup = async () => {
    const isValid = await checkSession();
    if (isValid) {
      setCurrentView("ConnectorSetup");
      localStorage.setItem("currentView", "ConnectorSetup");
    }
  };

  const handleNavigateToMisconfig = async () => {
    const isValid = await checkSession();
    if (isValid) {
      setCurrentView("Misconfig");
      localStorage.setItem("currentView", "Misconfig");
    }
  };

  const handleNavigateToDataSources = async () => {
    const isValid = await checkSession();
    if (isValid) {
      setCurrentView("DataSources");
      localStorage.setItem("currentView", "DataSources");
    }
  };

  const handleNavigateToOverview = async () => {
    const isValid = await checkSession();
    if (isValid) {
      setCurrentView("Overview");
      localStorage.setItem("currentView", "Overview");
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "login":
        return <Login onLogin={handleLogin} />;
      case "DataSources":
        return (
          <DataSources
            onLogout={handleLogout}
            onNavigateToOverview={handleNavigateToOverview}
            onNavigateToSearch={handleNavigateToSearch}
            onNavigateToMisconfig={handleNavigateToMisconfig}
            onNavigateToConnectorSetup={handleNavigateToConnectorSetup}
            initialPage="data-sources"
            checkSession={checkSession}
            user={user}
          />
        );
      case "Overview":
        return (
          <DataSources
            onLogout={handleLogout}
            onNavigateToOverview={handleNavigateToOverview}
            onNavigateToSearch={handleNavigateToSearch}
            onNavigateToMisconfig={handleNavigateToMisconfig}
            onNavigateToConnectorSetup={handleNavigateToConnectorSetup}
            initialPage="overview"
            checkSession={checkSession}
            user={user}
          />
        );
      case "Search":
        return (
          <Search
            onLogout={handleLogout}
            onNavigateToDataSources={handleNavigateToDataSources}
            onNavigateToOverview={handleNavigateToOverview}
            onNavigateToMisconfig={handleNavigateToMisconfig}
            onNavigateToConnectorSetup={handleNavigateToConnectorSetup}
            checkSession={checkSession}
          />
        );
      case "Misconfig":
        return (
          <Misconfig
            onLogout={handleLogout}
            onNavigateToDataSources={handleNavigateToDataSources}
            onNavigateToOverview={handleNavigateToOverview}
            onNavigateToSearch={handleNavigateToSearch}
            onNavigateToConnectorSetup={handleNavigateToConnectorSetup}
            checkSession={checkSession}
          />
        );
      case "Header":
        return (
          <Header
            pageTitle="Data Security Platform"
            searchTerm=""
            onSearchChange={() => {}}
            onLogout={handleLogout}
            showSearch={true}
          />
        );
      case "ConnectorSetup":
        return (
          <div className="data-sources-container">
            <Sidebar
              currentPage="connector-setup"
              onNavigateToOverview={handleNavigateToOverview}
              onNavigateToDataSources={handleNavigateToDataSources}
              onNavigateToSearch={handleNavigateToSearch}
              onNavigateToMisconfig={handleNavigateToMisconfig}
              onNavigateToConnectorSetup={() => console.log("Already on connector setup")}
            />
            <div className="main-content">
              <Header
                pageTitle="Connector Setup"
                searchTerm=""
                onSearchChange={() => {}}
                onLogout={handleLogout}
                showSearch={false}
              />
              <ConnectorSetup
                onSetupComplete={handleNavigateToOverview}
              />
            </div>
          </div>
        );
      default:
        return <Login onLogin={handleLogin} />;
    }
  };

  return <div className="App">{renderCurrentView()}</div>;
}

export default App;
