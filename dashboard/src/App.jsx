import { useState, useEffect } from "react";
import Login from "./components/Login";
import DataSources from "./components/DataSources";
import Search from "./components/Search";
import { useSessionCheck } from "./hooks/useSessionCheck";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState("login");
  const [user, setUser] = useState(null);

  const checkSession = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/auth/session", {
        credentials: "include",
      });
      const data = await response.json();

      if (data.isAuthenticated) {
        setUser(data.user);
        return true;
      } else {
        // Session không hợp lệ, đăng xuất
        handleSessionExpired();
        return false;
      }
    } catch (error) {
      console.error("Session check failed:", error);
      handleSessionExpired();
      return false;
    }
  };

  // Sử dụng hook kiểm tra session tự động
  useSessionCheck(checkSession);

  // Xử lý khi session hết hạn
  const handleSessionExpired = () => {
    setUser(null);
    setCurrentView("login");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("sessionId");
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogin = ({ user, sessionId }) => {
    setUser(user);
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("sessionId", sessionId);
    setCurrentView("DataSources");
  };

  const handleLogout = () => {
    fetch("http://localhost:4000/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).then(() => window.location.reload());
  };

  // Các hàm navigate với kiểm tra session
  const handleNavigateToSearch = async () => {
    const isValid = await checkSession();
    if (isValid) {
      setCurrentView("Search");
    }
  };

  const handleNavigateToDataSources = async () => {
    const isValid = await checkSession();
    if (isValid) {
      setCurrentView("DataSources");
    }
  };

  const handleNavigateToOverview = async () => {
    const isValid = await checkSession();
    if (isValid) {
      setCurrentView("Overview");
    }
  };

  const handleNavigateToLogManager = async () => {
    const isValid = await checkSession();
    if (isValid) {
      setCurrentView("LogManager");
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
            onNavigateToSearch={handleNavigateToSearch}
            initialPage="data-sources"
            checkSession={checkSession}
          />
        );
      case "Overview":
        return (
          <DataSources
            onLogout={handleLogout}
            onNavigateToSearch={handleNavigateToSearch}
            initialPage="overview"
            checkSession={checkSession}
          />
        );
      case "LogManager":
        return (
          <DataSources
            onLogout={handleLogout}
            onNavigateToSearch={handleNavigateToSearch}
            initialPage="log-manager"
            checkSession={checkSession}
          />
        );
      case "Search":
        return (
          <Search
            onLogout={handleLogout}
            onNavigateToDataSources={handleNavigateToDataSources}
            onNavigateToOverview={handleNavigateToOverview}
            onNavigateToLogManager={handleNavigateToLogManager}
            checkSession={checkSession}
          />
        );
      default:
        return <Login onLogin={handleLogin} />;
    }
  };

  return <div className="App">{renderCurrentView()}</div>;
}

export default App;
