import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RoleBadge from "./RoleBadge";

export function defaultTabForRole(role) {
    if (["ONGC_ADMIN", "CMS_COORDINATOR", "ONGC_VIEWER"].includes(role)) {
        return "/dashboard";
    }
    if (role === "ONGC_ENGINEER") return "/assignments";
    if (role === "CMS_TECHNICIAN") return "/assignments";
    if (role === "INSTALLATION_MANAGER") return "/requests";
    return "/dashboard";
}

export function roleTabs(role) {
    switch (role) {
        case "ONGC_ADMIN":
            return [
                { id: "/dashboard", label: "Dashboard" },
                { id: "/requests", label: "Request Desk" },
                { id: "/assignments", label: "Assignment Desk" },
                { id: "/attendance", label: "Attendance" },
                { id: "/settings", label: "Settings" },
            ];
        case "ONGC_ENGINEER":
            return [
                { id: "/dashboard", label: "Dashboard" },
                { id: "/requests", label: "Request Desk" },
                { id: "/assignments", label: "Assignment Desk" },
                { id: "/attendance", label: "Attendance" },
                { id: "/settings", label: "Settings" },
            ];
        case "CMS_COORDINATOR":
            return [
                { id: "/dashboard", label: "Dashboard" },
                { id: "/requests", label: "Request Desk" },
                { id: "/assignments", label: "Assignment Desk" },
                { id: "/attendance", label: "Attendance" },
            ];
        case "CMS_TECHNICIAN":
            return [
                { id: "/dashboard", label: "Dashboard" },
                { id: "/assignments", label: "Assignment Desk" },
                { id: "/attendance", label: "Log Attendance" },
            ];
        case "INSTALLATION_MANAGER":
            return [
                { id: "/dashboard", label: "Dashboard" },
                { id: "/requests", label: "My Requests" },
            ];
        case "ONGC_VIEWER":
            return [
                { id: "/dashboard", label: "Dashboard" },
                { id: "/requests", label: "Requests View" },
                { id: "/assignments", label: "Assignments View" },
                { id: "/attendance", label: "Attendance View" },
            ];
        default:
            return [];
    }
}

export default function Layout({ children }) {
    const { user, role, logout } = useAuth();
    const location = useLocation();

    if (!user) {
        return <div className="text-white p-8">Checking authentication...</div>;
    }

    const tabs = roleTabs(role);

    // Highlighting main tab matching root segments (e.g. /settings/services -> /settings)
    const currentTab = "/" + location.pathname.split("/")[1] || "/dashboard";

    return (
        <div className="min-h-screen flex flex-col bg-[#0b1120] text-gray-200 font-sans selection:bg-blue-500/30">
            {/* Navbar */}
            <header className="sticky top-0 z-50 bg-[#0f172a]/90 backdrop-blur border-b border-gray-800 flex items-center justify-between px-6 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-inner">
                        FMS
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold tracking-tight text-white leading-tight">
                            ONGC FMS Track
                        </h1>
                        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                            Production-Parity Calibration Contract
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end mr-2">
                        <span className="text-sm font-medium text-gray-200">
                            {user.displayName}
                        </span>
                        <RoleBadge role={role} />
                    </div>
                    <button
                        onClick={logout}
                        className="text-sm px-3 py-1.5 rounded-md bg-gray-800 hover:bg-red-900/50 hover:text-red-200 border border-gray-700 transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <nav className="w-64 bg-[#0f172a] border-r border-gray-800 flex-shrink-0 flex flex-col p-4 shadow-xl z-40">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 px-3">
                        Navigation
                    </div>
                    <div className="space-y-1">
                        {tabs.map((t) => {
                            const isActive = currentTab === t.id || (t.id === "/dashboard" && currentTab === "/");
                            return (
                                <Link
                                    key={t.id}
                                    to={t.id}
                                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                                            ? "bg-blue-600 cursor-default text-white shadow-md shadow-blue-900/20"
                                            : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                                        }`}
                                >
                                    {t.label}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-8 relative">
                    <div className="max-w-7xl mx-auto">{children}</div>
                </main>
            </div>
        </div>
    );
}
