import { useState, useEffect } from "react";
import Login from "./components/Login";
import DataSources from "./components/DataSources";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState("login");

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn === "true") {
      setCurrentView("DataSources");
    }
  }, []);

  const handleLogin = () => {
    localStorage.setItem("isLoggedIn", "true");
    setCurrentView("DataSources");
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "login":
        return <Login onLogin={handleLogin} />;
      case "DataSources":
        return <DataSources/>;
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
