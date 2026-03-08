import React from "react";

const STAGES = [
    { key: "REQUESTED", label: "Requested", color: "#3b82f6" },
    { key: "ASSIGNED", label: "Assigned", color: "#8b5cf6" },
    { key: "DEPLOYED", label: "Deployed", color: "#f59e0b" },
    { key: "WORK_DONE", label: "Work Done", color: "#14b8a6" },
    { key: "REPORT_SUBMITTED", label: "Report", color: "#d946ef" },
    { key: "COMPLETED", label: "Completed", color: "#10b981" },
];

function formatTimelineDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function WorkOrderTimeline({ timeline = [], currentStatus }) {
    // Build a map of status → timeline entry (first occurrence)
    const statusMap = {};
    timeline.forEach((t) => {
        if (!statusMap[t.status]) {
            statusMap[t.status] = t;
        }
    });

    // Find the index of the current stage
    const currentIdx = STAGES.findIndex((s) => s.key === currentStatus);

    return (
        <div className="flex items-start gap-0 w-full min-w-0 py-1">
            {STAGES.map((stage, idx) => {
                const reached = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                const entry = statusMap[stage.key];
                const isLast = idx === STAGES.length - 1;

                return (
                    <div key={stage.key} className="flex items-start flex-1 min-w-0">
                        <div className="flex flex-col items-center min-w-0">
                            {/* Node */}
                            <div
                                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all duration-300 ${reached
                                    ? isCurrent
                                        ? "shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                                        : ""
                                    : "border-gray-700 bg-gray-900"
                                    }`}
                                style={reached ? {
                                    borderColor: stage.color,
                                    backgroundColor: stage.color,
                                } : {}}
                                title={entry ? `${stage.label} — ${formatTimelineDate(entry.createdAt)} by ${entry.user?.displayName || "System"}` : stage.label}
                            />
                            {/* Label + Date */}
                            <div className="flex flex-col items-center mt-1 min-w-0">
                                <span className={`text-[9px] font-medium leading-tight truncate max-w-[56px] text-center ${reached ? "text-gray-200" : "text-gray-600"
                                    }`}>
                                    {stage.label}
                                </span>
                                {entry && (
                                    <span className="text-[8px] text-gray-500 leading-tight mt-0.5 truncate max-w-[56px] text-center">
                                        {formatTimelineDate(entry.createdAt)}
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* Connector line */}
                        {!isLast && (
                            <div className={`flex-1 h-0.5 mt-2 mx-0.5 rounded transition-colors ${idx < currentIdx ? "bg-gradient-to-r" : "bg-gray-800"
                                }`}
                                style={idx < currentIdx ? {
                                    backgroundImage: `linear-gradient(to right, ${stage.color}, ${STAGES[idx + 1].color})`,
                                } : {}}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
