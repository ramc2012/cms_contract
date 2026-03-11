import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../utils/helpers";

/* ── Status config ── */
const STATUS_STYLES = {
    CALIBRATED: {
        bg: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
        border: "#10b981",
        glow: "rgba(16, 185, 129, 0.25)",
        label: "Calibrated",
        icon: "✓",
    },
    PENDING: {
        bg: "linear-gradient(135deg, #78350f 0%, #92400e 100%)",
        border: "#f59e0b",
        glow: "rgba(245, 158, 11, 0.25)",
        label: "Pending",
        icon: "⏳",
    },
    OVERDUE: {
        bg: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
        border: "#ef4444",
        glow: "rgba(239, 68, 68, 0.3)",
        label: "Overdue",
        icon: "⚠",
    },
};

const FALLBACK_STYLE = {
    bg: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
    border: "#64748b",
    glow: "rgba(100, 116, 139, 0.2)",
    label: "Unknown",
    icon: "?",
};

/* ── Tooltip component ── */
function Tooltip({ instrument, position, tileRect }) {
    const ref = useRef(null);
    const [adjustedPos, setAdjustedPos] = useState(position);

    useEffect(() => {
        if (!ref.current || !tileRect) return;
        const tt = ref.current.getBoundingClientRect();
        let x = position.x;
        let y = position.y;

        // keep within viewport
        if (x + tt.width > window.innerWidth - 16) x = window.innerWidth - tt.width - 16;
        if (x < 16) x = 16;
        if (y + tt.height > window.innerHeight - 16) y = tileRect.top - tt.height - 8;
        setAdjustedPos({ x, y });
    }, [position, tileRect]);

    const s = STATUS_STYLES[instrument.calStatus] || FALLBACK_STYLE;

    return (
        <div
            ref={ref}
            className="health-tooltip"
            style={{ left: adjustedPos.x, top: adjustedPos.y }}
        >
            <div className="health-tooltip-header" style={{ borderLeftColor: s.border }}>
                <span className="health-tooltip-tag">{instrument.tagNo}</span>
                <span className="health-tooltip-code">{instrument.instrumentCode}</span>
            </div>

            <div className="health-tooltip-body">
                <div className="health-tooltip-row">
                    <span className="health-tooltip-label">Type</span>
                    <span>{instrument.equipmentType || "—"}</span>
                </div>
                {instrument.make && (
                    <div className="health-tooltip-row">
                        <span className="health-tooltip-label">Make / Model</span>
                        <span>{instrument.make}{instrument.model ? ` / ${instrument.model}` : ""}</span>
                    </div>
                )}
                <div className="health-tooltip-row">
                    <span className="health-tooltip-label">Installation</span>
                    <span>{instrument.installation?.name || "—"}</span>
                </div>
                <div className="health-tooltip-row">
                    <span className="health-tooltip-label">Service</span>
                    <span>{instrument.service?.name || "—"}</span>
                </div>

                <div className="health-tooltip-divider" />

                <div className="health-tooltip-row">
                    <span className="health-tooltip-label">Status</span>
                    <span style={{ color: s.border, fontWeight: 600 }}>{s.label}</span>
                </div>
                <div className="health-tooltip-row">
                    <span className="health-tooltip-label">Last Calibration</span>
                    <span>{formatDate(instrument.lastCalibration)}</span>
                </div>
                <div className="health-tooltip-row">
                    <span className="health-tooltip-label">Next Due</span>
                    <span>{formatDate(instrument.nextCalibration)}</span>
                </div>

                {instrument.lastJob && (
                    <>
                        <div className="health-tooltip-divider" />
                        <div className="health-tooltip-section-title">Last Job</div>
                        <div className="health-tooltip-row">
                            <span className="health-tooltip-label">WO #</span>
                            <span className="font-mono">{instrument.lastJob.workOrderNo}</span>
                        </div>
                        <div className="health-tooltip-row">
                            <span className="health-tooltip-label">Completed</span>
                            <span>{formatDate(instrument.lastJob.completedDate)}</span>
                        </div>
                        {instrument.lastJob.remarks && (
                            <div className="health-tooltip-remarks">
                                {instrument.lastJob.remarks}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

/* ── Tile component ── */
function HealthTile({ instrument, onHover, onLeave }) {
    const s = STATUS_STYLES[instrument.calStatus] || FALLBACK_STYLE;
    const tileRef = useRef(null);

    const handleMouseEnter = () => {
        if (!tileRef.current) return;
        const rect = tileRef.current.getBoundingClientRect();
        onHover(instrument, { x: rect.right + 8, y: rect.top }, rect);
    };

    return (
        <div
            ref={tileRef}
            className="health-tile"
            style={{
                background: s.bg,
                borderColor: s.border,
                boxShadow: `0 0 12px ${s.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={onLeave}
        >
            <div className="health-tile-status-icon" style={{ color: s.border }}>
                {s.icon}
            </div>
            <div className="health-tile-tag">{instrument.tagNo}</div>
            <div className="health-tile-date">
                {instrument.lastCalibration
                    ? formatDate(instrument.lastCalibration)
                    : instrument.lastJob?.completedDate
                        ? formatDate(instrument.lastJob.completedDate)
                        : "No data"}
            </div>
        </div>
    );
}

/* ── Summary card ── */
function SummaryCard({ label, count, color, icon, total }) {
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    return (
        <div className="health-summary-card" style={{ borderColor: color }}>
            <div className="health-summary-icon" style={{ color }}>{icon}</div>
            <div className="health-summary-info">
                <div className="health-summary-count" style={{ color }}>{count}</div>
                <div className="health-summary-label">{label}</div>
            </div>
            <div className="health-summary-pct">{pct}%</div>
        </div>
    );
}

/* ─────────── Main Page ─────────── */
export default function EquipmentHealth() {
    const { fetchApi } = useAuth();
    const { toast } = useToast();
    const [instruments, setInstruments] = useState([]);
    const [installations, setInstallations] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        installationId: "",
        serviceId: "",
    });

    const [hoveredInstrument, setHoveredInstrument] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [tileRect, setTileRect] = useState(null);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line
    }, [filters]);

    useEffect(() => {
        loadMeta();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const q = new URLSearchParams();
            if (filters.installationId) q.append("installationId", filters.installationId);
            if (filters.serviceId) q.append("serviceId", filters.serviceId);
            const data = await fetchApi(`/instruments/health?${q}`);
            setInstruments(data);
        } catch (err) {
            toast(err.message, "error");
        } finally {
            setLoading(false);
        }
    }

    async function loadMeta() {
        try {
            const [insts, srvs] = await Promise.all([
                fetchApi("/installations"),
                fetchApi("/services"),
            ]);
            setInstallations(insts);
            setServices(srvs);
        } catch (err) {
            console.error(err);
        }
    }

    // Compute summaries
    const calibrated = instruments.filter(i => i.calStatus === "CALIBRATED").length;
    const pending = instruments.filter(i => i.calStatus === "PENDING").length;
    const overdue = instruments.filter(i => i.calStatus === "OVERDUE").length;
    const total = instruments.length;

    // Group by installation
    const grouped = {};
    instruments.forEach(inst => {
        const key = inst.installation?.name || "Unassigned";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(inst);
    });

    return (
        <div className="equipment-health-page">
            {/* Header */}
            <div className="health-page-header">
                <div>
                    <h1 className="health-page-title">Equipment Health</h1>
                    <p className="health-page-subtitle">
                        Real-time calibration status of all instruments
                    </p>
                </div>
                <div className="health-legend">
                    {Object.entries(STATUS_STYLES).map(([key, s]) => (
                        <div key={key} className="health-legend-item">
                            <span className="health-legend-dot" style={{ background: s.border }} />
                            <span>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="health-filters">
                <select
                    className="health-filter-select"
                    value={filters.installationId}
                    onChange={e => setFilters({ ...filters, installationId: e.target.value })}
                >
                    <option value="">All Installations</option>
                    {installations.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                </select>
                <select
                    className="health-filter-select"
                    value={filters.serviceId}
                    onChange={e => setFilters({ ...filters, serviceId: e.target.value })}
                >
                    <option value="">All Services</option>
                    {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                <div className="health-filter-count">
                    {total} instrument{total !== 1 ? "s" : ""}
                </div>
            </div>

            {/* Summary strip */}
            <div className="health-summary-strip">
                <SummaryCard label="Calibrated" count={calibrated} color="#10b981" icon="✓" total={total} />
                <SummaryCard label="Pending" count={pending} color="#f59e0b" icon="⏳" total={total} />
                <SummaryCard label="Overdue" count={overdue} color="#ef4444" icon="⚠" total={total} />
            </div>

            {/* Loading */}
            {loading && (
                <div className="health-loading">
                    <div className="health-spinner" />
                    <span>Loading instruments...</span>
                </div>
            )}

            {/* Tile grid grouped by installation */}
            {!loading && total === 0 && (
                <div className="health-empty">
                    <span className="health-empty-icon">📦</span>
                    <p>No instruments found matching the selected filters.</p>
                </div>
            )}

            {!loading && Object.keys(grouped).sort().map(instName => (
                <div key={instName} className="health-group">
                    <div className="health-group-header">
                        <span className="health-group-icon">🏢</span>
                        <span className="health-group-name">{instName}</span>
                        <span className="health-group-count">{grouped[instName].length}</span>
                    </div>
                    <div className="health-grid">
                        {grouped[instName].map(inst => (
                            <HealthTile
                                key={inst.id}
                                instrument={inst}
                                onHover={(instrument, pos, rect) => {
                                    setHoveredInstrument(instrument);
                                    setTooltipPos(pos);
                                    setTileRect(rect);
                                }}
                                onLeave={() => setHoveredInstrument(null)}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {/* Tooltip */}
            {hoveredInstrument && (
                <Tooltip
                    instrument={hoveredInstrument}
                    position={tooltipPos}
                    tileRect={tileRect}
                />
            )}
        </div>
    );
}
