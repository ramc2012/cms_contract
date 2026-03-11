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

/* ─── icon components ────────────────────────────────── */
const IconDashboard = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
);
const IconRequests = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);
const IconAssignments = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
);
const IconAttendance = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
);
const IconSettings = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
);
const IconReports = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);
const IconEquipmentHealth = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
    </svg>
);

const ICON_MAP = {
    "/dashboard": <IconDashboard />,
    "/requests": <IconRequests />,
    "/assignments": <IconAssignments />,
    "/attendance": <IconAttendance />,
    "/reports": <IconReports />,
    "/equipment-health": <IconEquipmentHealth />,
    "/settings": <IconSettings />,
};

export function roleTabs(role) {
    switch (role) {
        case "ONGC_ADMIN":
            return [
                { id: "/dashboard", label: "Dashboard" },
                { id: "/equipment-health", label: "Equip. Health" },
                { id: "/requests", label: "Request Desk" },
                { id: "/assignments", label: "Assignment Desk" },
                { id: "/attendance", label: "Attendance" },
                { id: "/reports", label: "Reports" },
                { id: "/settings", label: "Settings" },
            ];
        case "ONGC_ENGINEER":
            return [
                { id: "/dashboard", label: "Dashboard" },
                { id: "/equipment-health", label: "Equip. Health" },
                { id: "/requests", label: "Request Desk" },
                { id: "/assignments", label: "Assignment Desk" },
                { id: "/attendance", label: "Attendance" },
                { id: "/reports", label: "Reports" },
            ];
        case "CMS_COORDINATOR":
            return [
                { id: "/dashboard", label: "Dashboard" },
                { id: "/equipment-health", label: "Equip. Health" },
                { id: "/assignments", label: "Assignment Desk" },
                { id: "/attendance", label: "Attendance" },
                { id: "/reports", label: "Reports" },
            ];
        case "CMS_TECHNICIAN":
            return [
                { id: "/dashboard", label: "Dashboard" },
                { id: "/assignments", label: "My Assignments" },
            ];
        case "INSTALLATION_MANAGER":
            return [
                { id: "/dashboard", label: "Dashboard" },
                { id: "/equipment-health", label: "Equip. Health" },
                { id: "/requests", label: "My Requests" },
                { id: "/reports", label: "Reports" },
            ];
        case "READ_ONLY":
            return [
                { id: "/dashboard", label: "Dashboard" },
                { id: "/requests", label: "Requests" },
                { id: "/assignments", label: "Assignments" },
                { id: "/attendance", label: "Attendance" },
                { id: "/reports", label: "Reports" },
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
    const currentTab = "/" + location.pathname.split("/")[1] || "/dashboard";

    return (
        <div className="min-h-screen flex flex-col bg-[#0b1120] text-gray-200 font-sans selection:bg-blue-500/30">
            {/* Navbar */}
            <header className="sticky top-0 z-50 bg-[#0f172a]/90 backdrop-blur border-b border-gray-800 flex items-center justify-between px-6 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-24 bg-white/95 rounded flex items-center justify-center shadow-inner overflow-hidden flex-shrink-0 px-2">
                        <img src="/logo.png" alt="ONGC Logo" className="h-[120%] object-contain scale-110 object-center" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold tracking-tight text-white leading-tight">
                            FMS Track
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
                <nav className="w-56 bg-[#0f172a] border-r border-gray-800 flex-shrink-0 flex flex-col py-5 px-3 shadow-xl z-40">
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 px-3">
                        Navigation
                    </div>
                    <div className="flex flex-col gap-0.5">
                        {tabs.map((t) => {
                            const isActive = currentTab === t.id || (t.id === "/dashboard" && currentTab === "/");
                            return (
                                <Link
                                    key={t.id}
                                    to={t.id}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                                        : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                                        }`}
                                >
                                    {ICON_MAP[t.id] || <IconDashboard />}
                                    <span className="truncate">{t.label}</span>
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
