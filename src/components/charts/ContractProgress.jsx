import React from "react";

function daysBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

export default function ContractProgress({ contract }) {
    if (!contract) return null;

    const now = new Date();
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);

    const totalDays = daysBetween(start, end);
    const elapsedDays = Math.max(0, Math.min(totalDays, daysBetween(start, now)));
    const pct = Math.round((elapsedDays / totalDays) * 100);
    const daysRemaining = Math.max(0, daysBetween(now, end));
    const monthsRemaining = (daysRemaining / 30.44).toFixed(1);

    const isEarly = pct < 33;
    const isMid = pct >= 33 && pct < 66;
    const isLate = pct >= 66;

    const barColor = isEarly ? "bg-emerald-500" : isMid ? "bg-blue-500" : "bg-amber-500";
    const textColor = isEarly ? "text-emerald-400" : isMid ? "text-blue-400" : "text-amber-400";

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(contract.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                <span className={`font-semibold text-sm ${textColor}`}>{pct}% elapsed</span>
                <span>{new Date(contract.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>

            <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${pct}%` }}
                />
                {/* Now marker */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/30"
                    style={{ left: `${pct}%` }}
                />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-900/60 rounded-lg p-2.5 border border-gray-800">
                    <div className="text-lg font-light text-white">{elapsedDays}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">Days Elapsed</div>
                </div>
                <div className="bg-gray-900/60 rounded-lg p-2.5 border border-gray-800">
                    <div className={`text-lg font-light ${textColor}`}>{daysRemaining}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">Days Remaining</div>
                </div>
                <div className="bg-gray-900/60 rounded-lg p-2.5 border border-gray-800">
                    <div className="text-lg font-light text-white">{contract.durationMonths}m</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">Total Duration</div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="bg-gray-900 border border-gray-700 text-gray-400 px-2 py-1 rounded">
                    Contract: <span className="text-gray-300 font-mono">{contract.contractNumber}</span>
                </span>
                <span className="bg-gray-900 border border-gray-700 text-gray-400 px-2 py-1 rounded">
                    SLA: <span className="text-gray-300">{contract.uptimeThreshold}% uptime</span>
                </span>
                <span className="bg-gray-900 border border-gray-700 text-gray-400 px-2 py-1 rounded">
                    Penalty cap: <span className="text-gray-300">{contract.cumulativePenaltyCap}%</span>
                </span>
            </div>
        </div>
    );
}
