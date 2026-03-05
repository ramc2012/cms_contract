import React from "react";

function HealthBadge({ score }) {
    if (score >= 90) return <span className="text-emerald-400 text-xs font-semibold">{score}%</span>;
    if (score >= 70) return <span className="text-amber-400 text-xs font-semibold">{score}%</span>;
    return <span className="text-red-400 text-xs font-semibold">{score}%</span>;
}

function MiniBar({ value, max, color }) {
    const w = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="h-1 rounded-full bg-gray-800 overflow-hidden w-full">
            <div className="h-full rounded-full" style={{ width: `${w}%`, background: color }} />
        </div>
    );
}

export default function InstallationHealthGrid({ data = [] }) {
    if (!data.length) {
        return (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                No installation data
            </div>
        );
    }

    const sorted = [...data].sort((a, b) => a.healthScore - b.healthScore);

    return (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {sorted.map((inst) => (
                <div
                    key={inst.id}
                    className="flex items-center gap-3 p-2 bg-gray-900/40 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                >
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-300 truncate max-w-[160px]" title={inst.name}>
                                {inst.name}
                            </span>
                            <HealthBadge score={inst.healthScore} />
                        </div>
                        <div className="flex gap-1">
                            <MiniBar value={inst.valid} max={inst.total} color="#10b981" />
                            <MiniBar value={inst.dueSoon} max={inst.total} color="#f59e0b" />
                            <MiniBar value={inst.overdue} max={inst.total} color="#ef4444" />
                        </div>
                        <div className="flex gap-3 mt-1 text-[9px] text-gray-600">
                            <span className="text-emerald-600">{inst.valid} valid</span>
                            <span className="text-amber-600">{inst.dueSoon} due soon</span>
                            {inst.overdue > 0 && <span className="text-red-500">{inst.overdue} overdue</span>}
                            <span className="ml-auto">{inst.total} total</span>
                        </div>
                    </div>
                    <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${inst.healthScore >= 90 ? "bg-emerald-500" : inst.healthScore >= 70 ? "bg-amber-500" : "bg-red-500"}`} />
                </div>
            ))}
        </div>
    );
}
