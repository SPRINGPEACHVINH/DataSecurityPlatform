import { useState, useEffect } from "react";
import Login from "./components/Login";
import DataSources from "./components/DataSources";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState("login");
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Kiểm tra session khi load lại trang
    fetch("http://localhost:4000/api/auth/session", {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => {
        if (data.isAuthenticated) {
          setUser(data.user);
          setCurrentView("DataSources");
        }
      });
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

  const renderCurrentView = () => {
    switch (currentView) {
      case "login":
        return <Login onLogin={handleLogin} />;
      case "DataSources":
        return <DataSources onLogout={handleLogout} />;
      default:
        return <Login onLogin={handleLogin} />;
    }
  };

  return (
    <div className="App">
      {renderCurrentView()}
    </div>
  );
}

export default App;
