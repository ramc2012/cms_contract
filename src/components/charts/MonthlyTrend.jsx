import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#1e293b] border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
            <span className="font-medium text-white">{label}</span>
            <span className="ml-2 text-emerald-400">{payload[0].value} completed</span>
        </div>
    );
};

function fmtMonth(m) {
    if (!m) return "";
    const [y, mo] = m.split("-");
    const d = new Date(Number(y), Number(mo) - 1, 1);
    return d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
}

export default function MonthlyTrend({ data = [] }) {
    const chartData = data.map((d) => ({ ...d, label: fmtMonth(d.month) }));
    const max = Math.max(...chartData.map((d) => d.completed), 4);

    return (
        <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                    <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
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
                    domain={[0, Math.max(max + 1, 5)]}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: "4 2" }} />
                <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#completedGradient)"
                    dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#10b981", strokeWidth: 0 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
