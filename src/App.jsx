import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import "./App.css";

// Layout & Common
import Layout, { defaultTabForRole } from "./components/Layout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RequestDesk from "./pages/RequestDesk";
import AssignmentDesk from "./pages/AssignmentDesk";
import Attendance from "./pages/Attendance";
import Reports from "./pages/Reports";

// Settings Pages
import Services from "./pages/Settings/Services";
import Installations from "./pages/Settings/Installations";
import Instruments from "./pages/Settings/Instruments";
import Personnel from "./pages/Settings/Personnel";

// A private route wrapper
function PrivateRoute({ children }) {
  const { user, isInitializing } = useAuth();

  if (isInitializing) {
    return <div className="h-screen bg-[#0b1120] flex items-center justify-center text-gray-400">Loading FMS Track...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function SettingsLayout() {
  const { role } = useAuth();

  if (role !== "ONGC_ADMIN" && role !== "ONGC_ENGINEER") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light tracking-tight text-white border-b border-gray-800 pb-4">
        System Settings
      </h1>

      {/* Sub-navigation for settings */}
      <div className="flex bg-gray-900 border border-gray-800 p-1.5 rounded-lg w-max">
        {[
          { path: "/settings/services", label: "Services" },
          { path: "/settings/installations", label: "Installations" },
          { path: "/settings/instruments", label: "Instruments" },
          { path: "/settings/personnel", label: "Personnel Directory" },
        ].map(item => (
          <a
            key={item.path}
            href={item.path}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === item.path
              ? "bg-gray-800 text-white shadow-sm"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="pt-2">
        <Routes>
          <Route path="/" element={<Navigate to="installations" replace />} />
          <Route path="services" element={<Services />} />
          <Route path="installations" element={<Installations />} />
          <Route path="instruments" element={<Instruments />} />
          <Route path="personnel" element={<Personnel />} />
        </Routes>
      </div>
    </div>
  );
}

function HomeRedirect() {
  const { role } = useAuth();
  return <Navigate to={defaultTabForRole(role)} replace />;
}

export default function App() {
  const { user, isInitializing } = useAuth();

  if (isInitializing) {
    return <div className="h-screen bg-[#0b1120] flex items-center justify-center text-gray-400">Loading FMS Track...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <HomeRedirect /> : <Login />} />

      {/* Protected Routes inside Layout */}
      <Route path="/" element={<PrivateRoute><HomeRedirect /></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/requests" element={<PrivateRoute><RequestDesk /></PrivateRoute>} />
      <Route path="/assignments" element={<PrivateRoute><AssignmentDesk /></PrivateRoute>} />
      <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />

      <Route path="/settings/*" element={<PrivateRoute><SettingsLayout /></PrivateRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
