import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const STATUS_COLORS = {
    DRAFT: "#64748b",
    SUBMITTED: "#3b82f6",
    REVIEWED: "#8b5cf6",
    REJECTED: "#ef4444",
    CONVERTED: "#10b981",
};

const STATUS_LABELS = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    REVIEWED: "Reviewed",
    REJECTED: "Rejected",
    CONVERTED: "Converted",
};

const STATUS_ORDER = ["DRAFT", "SUBMITTED", "REVIEWED", "CONVERTED", "REJECTED"];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#1e293b] border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
            <span className="font-medium text-white">{STATUS_LABELS[label] || label}</span>
            <span className="ml-2 text-gray-400">{payload[0].value} requests</span>
        </div>
    );
};

export default function WorkRequestPipeline({ data = [] }) {
    const chartData = STATUS_ORDER.map((status) => {
        const found = data.find((d) => d.status === status);
        return {
            status,
            label: STATUS_LABELS[status],
            count: found ? found._count._all : 0,
        };
    }).filter((d) => d.count > 0 || d.status === "DRAFT");

    if (!data.length) {
        return (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                No request data
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
