import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const STATUS_COLORS = {
    SCHEDULED: "#3b82f6",
    IN_PROGRESS: "#f59e0b",
    ON_HOLD: "#6b7280",
    PENDING_REPORT: "#8b5cf6",
    COMPLETED: "#10b981",
    CANCELLED: "#ef4444",
};

const STATUS_LABELS = {
    SCHEDULED: "Scheduled",
    IN_PROGRESS: "In Progress",
    ON_HOLD: "On Hold",
    PENDING_REPORT: "Pending Rpt",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

const ORDER = ["SCHEDULED", "IN_PROGRESS", "PENDING_REPORT", "COMPLETED", "ON_HOLD", "CANCELLED"];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#1e293b] border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
            <span className="font-medium text-white">{label}</span>
            <span className="ml-2 text-gray-400">{payload[0].value} orders</span>
        </div>
    );
};

export default function WorkOrderStatus({ data = [] }) {
    const chartData = ORDER.map((status) => {
        const found = data.find((d) => d.status === status);
        return {
            status,
            label: STATUS_LABELS[status] || status,
            count: found ? found._count._all : 0,
        };
    }).filter((d) => d.count > 0);

    if (!chartData.length) {
        return (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                No work order data
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barCategoryGap="30%" margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#6b7280"} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
