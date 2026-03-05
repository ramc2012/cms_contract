import React from "react";

const ROLE_COLORS = {
    ONGC_ADMIN: "bg-red-900 text-red-100 border-red-700",
    ONGC_ENGINEER: "bg-orange-900 text-orange-100 border-orange-700",
    CMS_COORDINATOR: "bg-blue-900 text-blue-100 border-blue-700",
    CMS_TECHNICIAN: "bg-cyan-900 text-cyan-100 border-cyan-700",
    INSTALLATION_MANAGER: "bg-purple-900 text-purple-100 border-purple-700",
    ONGC_VIEWER: "bg-gray-800 text-gray-300 border-gray-600",
};

export default function RoleBadge({ role }) {
    const cn =
        ROLE_COLORS[role] || "bg-gray-800 text-gray-300 border-gray-600";
    return (
        <span className={`text-[10px] px-2 py-0.5 rounded border ${cn}`}>
            {role.replace("_", " ")}
        </span>
    );
}
