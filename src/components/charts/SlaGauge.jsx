import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

function fmtMonth(m) {
    if (!m) return "";
    const [y, mo] = m.split("-");
    const d = new Date(Number(y), Number(mo) - 1, 1);
    return d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const val = payload[0].value;
    return (
        <div className="bg-[#1e293b] border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
            <span className="font-medium text-white">{label}</span>
            {val !== null ? (
                <span className={`ml-2 font-semibold ${val >= 99.5 ? "text-emerald-400" : "text-red-400"}`}>
                    {val}%
                </span>
            ) : (
                <span className="ml-2 text-gray-500">—</span>
            )}
        </div>
    );
};

export default function SlaGauge({ currentAvailability = 99.5, threshold = 99.5, trend = [], month }) {
    const isCompliant = currentAvailability >= threshold;
    const pct = Math.min(100, Math.max(0, currentAvailability));
    const trendData = trend.map((d) => ({ ...d, label: fmtMonth(d.month) }));

    return (
        <div className="space-y-4">
            {/* Current month indicator */}
            <div className="flex items-end justify-between">
                <div>
                    <div className={`text-4xl font-light tabular-nums ${isCompliant ? "text-emerald-400" : "text-red-400"}`}>
                        {currentAvailability.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {month || "Current month"} availability
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${isCompliant
                        ? "bg-emerald-900/30 text-emerald-400 border-emerald-800"
                        : "bg-red-900/30 text-red-400 border-red-800"
                        }`}>
                        {isCompliant ? "COMPLIANT" : "BREACH"}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1">SLA threshold: {threshold}%</div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${isCompliant ? "bg-emerald-500" : "bg-red-500"}`}
                    style={{ width: `${pct}%` }}
                />
                {/* Threshold marker */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/60"
                    style={{ left: `${threshold}%` }}
                >
                    <div className="absolute -top-4 left-1 text-[8px] text-yellow-500/80 whitespace-nowrap">
                        {threshold}% SLA
                    </div>
                </div>
            </div>

            {/* 6-month trend */}
            {trendData.some((d) => d.availability !== null) && (
                <div>
                    <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">6-Month Trend</div>
                    <ResponsiveContainer width="100%" height={80}>
                        <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                            <defs>
                                <linearGradient id="slaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                            <YAxis hide domain={[Math.min(...trendData.filter(d => d.availability).map(d => d.availability), threshold) - 0.5, 100.5]} />
                            <ReferenceLine y={threshold} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#3b82f6", strokeWidth: 1 }} />
                            <Area
                                type="monotone"
                                dataKey="availability"
                                stroke="#3b82f6"
                                strokeWidth={1.5}
                                fill="url(#slaGrad)"
                                connectNulls={false}
                                dot={{ r: 2.5, fill: "#3b82f6", strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
