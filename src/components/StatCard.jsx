import React from "react";

const VARIANTS = {
    default: {
        bg: "bg-gray-800/80",
        border: "border-gray-700",
        value: "text-white",
        accent: "bg-gray-600",
    },
    success: {
        bg: "bg-emerald-900/20",
        border: "border-emerald-800/60",
        value: "text-emerald-400",
        accent: "bg-emerald-500",
    },
    warning: {
        bg: "bg-amber-900/20",
        border: "border-amber-800/60",
        value: "text-amber-400",
        accent: "bg-amber-500",
    },
    danger: {
        bg: "bg-red-900/20",
        border: "border-red-800/60",
        value: "text-red-400",
        accent: "bg-red-500",
    },
    info: {
        bg: "bg-blue-900/20",
        border: "border-blue-800/60",
        value: "text-blue-400",
        accent: "bg-blue-500",
    },
};

export default function StatCard({ label, value, hint = "", variant = "default", icon = null, onClick = null }) {
    const v = VARIANTS[variant] || VARIANTS.default;

    return (
        <div
            className={`relative overflow-hidden ${v.bg} border ${v.border} p-4 rounded-xl flex flex-col justify-between h-full transition-all duration-200 ${onClick ? "cursor-pointer hover:brightness-110 active:scale-[0.98]" : ""}`}
            onClick={onClick}
        >
            {/* Accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${v.accent} rounded-r`} />

            <div className="flex items-start justify-between mb-2">
                <div className="text-gray-400 text-xs font-medium uppercase tracking-wider leading-tight pr-2">
                    {label}
                </div>
                {icon && (
                    <div className={`text-base opacity-60 ${v.value}`}>{icon}</div>
                )}
            </div>

            <div className={`text-3xl font-light tabular-nums ${v.value}`}>
                {value ?? "—"}
            </div>

            {hint && (
                <div className="text-[10px] text-gray-500 mt-2 leading-relaxed">{hint}</div>
            )}
        </div>
    );
}
