import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
// import 'bootstrap/dist/css/bootstrap.min.css';

// Internal Component for the Cool Card Selector
const BackendSelector = () => {
  const [selected, setSelected] = useState(
    localStorage.getItem("selectedBackend") || "fastapi"
  );

  const backends = [
    { id: "round-robin", name: "Round Robin", desc: "Load Balanced", icon: "" },
    { id: "fastapi", name: "FastAPI", desc: "Python Fast", icon: "" },
    { id: "nodejs", name: "Node.js", desc: "V8 Runtime", icon: "" },
    { id: "django", name: "Django", desc: "Secure Py", icon: "" },
    { id: "dotnet", name: ".NET Core", desc: "C# WebAPI", icon: "" },
  ];

  const handleSelect = (id) => {
    localStorage.setItem("selectedBackend", id);
    setSelected(id);
    window.location.reload();
  };

  return (
    <div className="backend-header">
      <div className="container d-flex align-items-center justify-content-between">
        <div className="brand-logo">
          NETWORK<span className="text-blue-glow">ROUTING</span>
        </div>
        
        <div className="d-flex gap-3">
          {backends.map((b) => (
            <div 
              key={b.id} 
              className={`backend-card ${selected === b.id ? 'active' : ''}`}
              onClick={() => handleSelect(b.id)}
            >
              <div className="card-icon">{b.icon}</div>
              <div className="card-info">
                <div className="card-name">{b.name}</div>
                <div className="card-subtitle">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      {/* Permanent Header */}
      <BackendSelector />

      {/* Main Content with padding to prevent overlap */}
      <div className="main-content-wrapper">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}