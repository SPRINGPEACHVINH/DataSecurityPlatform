import { useState, useEffect } from "react";
import Login from "./components/Login/Login";
import DataSources from "./components/DataSources/DataSources";
import Search from "./components/Search/Search";
import Misconfig from "./components/Misconfig/Misconfig";
import Header from "./components/Header/Header";
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
      const data = await response.json();

      if (data.isAuthenticated) {
        setUser({
          ...data.user,
          username: data.user.username
        });
        const savedView = localStorage.getItem("currentView");
        if (savedView && savedView !== "login") {
          setCurrentView(savedView);
        } else {
          setCurrentView("Overview");
        }
        return true;
      } else {
        handleSessionExpired();
        return false;
      }
    } catch (error) {
      console.error("Session check failed:", error);
      handleSessionExpired();
      return false;
    }
    finally {
      setIsLoading(false);
    }
  };

  useSessionCheck(checkSession);

  const handleSessionExpired = (showAlert = true) => {
    if (showAlert && localStorage.getItem("isLoggedIn")) {
      alert("Your session has expired. Please log in again.");
    }
    setUser(null);
    setCurrentView("login");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("sessionId");
    localStorage.removeItem("currentView");
    localStorage.removeItem("username");

    clearSearchSession();
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogin = ({ user, sessionId }) => {
    console.log("Login received:", { user, sessionId });

    const userData = {
      ...user,
      username: user.username
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
      <div className="App" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e0e0e0',
            borderTop: '4px solid #774aa4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{ color: '#666', fontSize: '16px' }}>Loading...</div>
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
          />
        );
      case "Header":
        return (
          <Header
            pageTitle="Data Security Platform"
            searchTerm=""
            onSearchChange={() => { }}
            onLogout={handleLogout}
            showSearch={true}
          />
        );
      default:
        return <Login onLogin={handleLogin} />;
    }
  };

  return <div className="App">{renderCurrentView()}</div>;
}

export default App;