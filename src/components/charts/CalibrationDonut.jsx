import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = {
    VALID: "#10b981",
    DUE_SOON: "#f59e0b",
    OVERDUE: "#ef4444",
    EXEMPT: "#6b7280",
};

const LABELS = {
    VALID: "Valid",
    DUE_SOON: "Due Soon",
    OVERDUE: "Overdue",
    EXEMPT: "Exempt",
};

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
        <div className="bg-[#1e293b] border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
            <span className="font-medium text-white">{LABELS[d.name] || d.name}</span>
            <span className="ml-2 text-gray-400">{d.value} instruments</span>
        </div>
    );
};

export default function CalibrationDonut({ data = [] }) {
    const chartData = data.map((d) => ({
        name: d.calStatus,
        value: d._count._all,
    }));

    const total = chartData.reduce((s, d) => s + d.value, 0);
    const valid = chartData.find((d) => d.name === "VALID")?.value ?? 0;
    const healthPct = total > 0 ? Math.round((valid / total) * 100) : 100;

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
                No instrument data
            </div>
        );
    }

    return (
        <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                    >
                        {chartData.map((entry) => (
                            <Cell
                                key={entry.name}
                                fill={COLORS[entry.name] || "#6b7280"}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>

            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={`text-2xl font-bold ${healthPct >= 90 ? "text-emerald-400" : healthPct >= 70 ? "text-amber-400" : "text-red-400"}`}>
                    {healthPct}%
                </span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Health</span>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
                {chartData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ background: COLORS[d.name] || "#6b7280" }}
                        />
                        {LABELS[d.name] || d.name}
                        <span className="text-gray-600">({d.value})</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
