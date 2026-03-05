import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import RoleBadge from "../components/RoleBadge";
import CalibrationDonut from "../components/charts/CalibrationDonut";
import WorkRequestPipeline from "../components/charts/WorkRequestPipeline";
import WorkOrderStatus from "../components/charts/WorkOrderStatus";
import MonthlyTrend from "../components/charts/MonthlyTrend";
import SlaGauge from "../components/charts/SlaGauge";
import ContractProgress from "../components/charts/ContractProgress";
import InstallationHealthGrid from "../components/charts/InstallationHealthGrid";
import { formatDate } from "../utils/helpers";

/* ── Small chart card wrapper ── */
function ChartCard({ title, subtitle, children, className = "" }) {
    return (
        <div className={`bg-gray-800/60 border border-gray-700/80 rounded-xl p-5 ${className}`}>
            <div className="mb-3">
                <div className="text-sm font-medium text-gray-300">{title}</div>
                {subtitle && <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{subtitle}</div>}
            </div>
            {children}
        </div>
    );
}

/* ── Alert item ── */
function Alert({ level = "warn", message, action, onAction }) {
    const styles = {
        warn: "border-amber-800/60 bg-amber-900/20 text-amber-300",
        danger: "border-red-800/60 bg-red-900/20 text-red-300",
        info: "border-blue-800/60 bg-blue-900/20 text-blue-300",
    };
    return (
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-sm ${styles[level]}`}>
            <span>{message}</span>
            {action && onAction && (
                <button
                    onClick={onAction}
                    className="text-xs px-2 py-0.5 rounded border border-current opacity-70 hover:opacity-100 transition flex-shrink-0"
                >
                    {action}
                </button>
            )}
        </div>
    );
}

/* ── Audit log table columns ── */
const LOG_COLS = [
    { header: "Action", field: "action", className: "font-mono text-xs" },
    { header: "Entity", field: "entity", className: "text-xs" },
    {
        header: "User", render: (r) => (
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{r.user?.username || "—"}</span>
                {r.user?.role && <RoleBadge role={r.user.role} />}
            </div>
        )
    },
    { header: "Time", render: (r) => <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span> },
];

/* ─────────── Role-specific section components ─────────── */

function AdminAnalytics({ dash, meta }) {
    const { cards, requestStatusBreakdown, orderStatusBreakdown, calStatusBreakdown,
        monthlyCompletions, slaAvailability, slaTrend, installationHealth } = dash;

    return (
        <>
            {/* Primary KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard label="Installations" value={cards.installations} variant="default" icon="🏢" />
                <StatCard label="Instruments" value={cards.instruments} variant="default" icon="⚙️" />
                <StatCard label="Overdue Cal." value={cards.overdueInstruments}
                    variant={cards.overdueInstruments > 0 ? "danger" : "success"} icon="⚠️"
                    hint={cards.overdueInstruments > 0 ? "Require immediate action" : "All calibrations current"} />
                <StatCard label="Open Requests" value={cards.openRequests}
                    variant={cards.urgentRequests > 0 ? "warning" : "default"} icon="📋"
                    hint={`${cards.urgentRequests} high priority`} />
                <StatCard label="Open Orders" value={cards.openOrders}
                    variant={cards.escortRiskOrders > 0 ? "warning" : "default"} icon="📝"
                    hint={cards.escortRiskOrders > 0 ? `${cards.escortRiskOrders} escort risk` : ""} />
                <StatCard label="SLA Availability" value={`${(slaAvailability || 99.5).toFixed(1)}%`}
                    variant={slaAvailability >= 99.5 ? "success" : "danger"} icon="📊" />
            </div>

            {/* Main analytics row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ChartCard title="Calibration Health" subtitle="By instrument status">
                    <CalibrationDonut data={calStatusBreakdown} />
                </ChartCard>

                <ChartCard title="Work Request Pipeline" subtitle="All requests by status">
                    <WorkRequestPipeline data={requestStatusBreakdown} />
                </ChartCard>

                <ChartCard title="Work Order Status" subtitle="Active work orders">
                    <WorkOrderStatus data={orderStatusBreakdown} />
                </ChartCard>
            </div>

            {/* Secondary row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ChartCard title="SLA Performance" subtitle={`Threshold: ${meta?.contract?.uptimeThreshold ?? 99.5}%`}>
                    <SlaGauge
                        currentAvailability={slaAvailability || meta?.contract?.uptimeThreshold || 99.5}
                        threshold={meta?.contract?.uptimeThreshold || 99.5}
                        trend={slaTrend || []}
                    />
                </ChartCard>

                <ChartCard title="Monthly WO Completions" subtitle="Last 6 months">
                    <MonthlyTrend data={monthlyCompletions || []} />
                </ChartCard>

                <ChartCard title="Installation Cal. Health" subtitle="Per-site calibration score">
                    <InstallationHealthGrid data={installationHealth || []} />
                </ChartCard>
            </div>

            {/* Contract progress */}
            {meta?.contract && (
                <ChartCard title="Contract Execution Progress" subtitle={meta.contract.contractNumber}>
                    <ContractProgress contract={meta.contract} />
                </ChartCard>
            )}

            {/* Personnel strip */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard label="Active CMS Staff" value={cards.activeContractPersonnel} variant="info" icon="👷" />
                <StatCard label="ONGC Engineers" value={cards.activeOngcPersonnel} variant="info" icon="🔬" />
                <StatCard label="Installation Managers" value={cards.activeManagers} variant="info" icon="🏭" />
            </div>
        </>
    );
}

function EngineerAnalytics({ dash, meta }) {
    const { cards, requestStatusBreakdown, orderStatusBreakdown, calStatusBreakdown,
        monthlyCompletions, slaAvailability, slaTrend } = dash;

    return (
        <>
            {/* Work queue KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Pending Review" value={cards.openRequests}
                    variant={cards.openRequests > 5 ? "warning" : "default"}
                    hint="Requests awaiting conversion" />
                <StatCard label="Urgent Requests" value={cards.urgentRequests}
                    variant={cards.urgentRequests > 0 ? "danger" : "success"}
                    hint="HIGH priority open" />
                <StatCard label="Open Work Orders" value={cards.openOrders}
                    variant="info" hint="Scheduled or in progress" />
                <StatCard label="Overdue Instruments" value={cards.overdueInstruments}
                    variant={cards.overdueInstruments > 0 ? "danger" : "success"} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Work Request Pipeline" subtitle="Requests by status">
                    <WorkRequestPipeline data={requestStatusBreakdown} />
                </ChartCard>
                <ChartCard title="Work Order Status" subtitle="WO distribution">
                    <WorkOrderStatus data={orderStatusBreakdown} />
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ChartCard title="Calibration Health" subtitle="Fleet-wide status">
                    <CalibrationDonut data={calStatusBreakdown} />
                </ChartCard>
                <ChartCard title="SLA Performance" subtitle={`Threshold: ${meta?.contract?.uptimeThreshold ?? 99.5}%`}>
                    <SlaGauge
                        currentAvailability={slaAvailability || meta?.contract?.uptimeThreshold || 99.5}
                        threshold={meta?.contract?.uptimeThreshold || 99.5}
                        trend={slaTrend || []}
                    />
                </ChartCard>
                <ChartCard title="Monthly Completions" subtitle="WO completion trend">
                    <MonthlyTrend data={monthlyCompletions || []} />
                </ChartCard>
            </div>

            {cards.escortRiskOrders > 0 && (
                <Alert level="warn"
                    message={`${cards.escortRiskOrders} work order(s) (Cat 2/3) have no ONGC escort assigned`}
                    action="View Orders" />
            )}
        </>
    );
}

function CoordinatorAnalytics({ dash }) {
    const { cards, orderStatusBreakdown, monthlyCompletions } = dash;

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Active CMS Staff" value={cards.activeContractPersonnel} variant="info" icon="👷" />
                <StatCard label="Open Work Orders" value={cards.openOrders} variant="default" />
                <StatCard label="Completed Orders" value={cards.completedOrders} variant="success" hint="All time" />
                <StatCard label="Docs Pending Review" value={cards.documentsPendingReview}
                    variant={cards.documentsPendingReview > 0 ? "warning" : "default"} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Work Order Status" subtitle="Current WO distribution">
                    <WorkOrderStatus data={orderStatusBreakdown} />
                </ChartCard>
                <ChartCard title="Monthly WO Completions" subtitle="Last 6 months">
                    <MonthlyTrend data={monthlyCompletions || []} />
                </ChartCard>
            </div>
        </>
    );
}

function TechnicianAnalytics({ dash }) {
    const { cards } = dash;

    return (
        <div className="grid grid-cols-2 gap-3">
            <StatCard label="Open Work Orders" value={cards.openOrders} variant="info"
                hint="Scheduled & in progress" />
            <StatCard label="Completed Orders" value={cards.completedOrders} variant="success"
                hint="Total completed" />
        </div>
    );
}

function ManagerAnalytics({ dash }) {
    const { cards, requestStatusBreakdown, installationHealth } = dash;

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard label="My Open Requests" value={cards.openRequests} variant="info"
                    hint="Submitted or under review" />
                <StatCard label="Urgent" value={cards.urgentRequests}
                    variant={cards.urgentRequests > 0 ? "danger" : "success"} />
                <StatCard label="Overdue Instruments" value={cards.overdueInstruments}
                    variant={cards.overdueInstruments > 0 ? "danger" : "success"} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Request Status" subtitle="Requests you raised">
                    <WorkRequestPipeline data={requestStatusBreakdown} />
                </ChartCard>
                <ChartCard title="Installation Cal. Health" subtitle="Your installation(s)">
                    <InstallationHealthGrid data={installationHealth || []} />
                </ChartCard>
            </div>
        </>
    );
}

function ViewerAnalytics({ dash, meta }) {
    const { cards, calStatusBreakdown, slaAvailability, slaTrend } = dash;

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Installations" value={cards.installations} />
                <StatCard label="Instruments" value={cards.instruments} />
                <StatCard label="Open Work Orders" value={cards.openOrders} variant="info" />
                <StatCard label="SLA" value={`${(slaAvailability || 99.5).toFixed(1)}%`}
                    variant={slaAvailability >= 99.5 ? "success" : "danger"} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Calibration Health" subtitle="Fleet-wide">
                    <CalibrationDonut data={calStatusBreakdown} />
                </ChartCard>
                <ChartCard title="SLA Performance">
                    <SlaGauge
                        currentAvailability={slaAvailability || 99.5}
                        threshold={meta?.contract?.uptimeThreshold || 99.5}
                        trend={slaTrend || []}
                    />
                </ChartCard>
            </div>
        </>
    );
}

/* ─────────── Main Dashboard component ─────────── */
export default function Dashboard() {
    const { user, role, fetchApi } = useAuth();
    const [dash, setDash] = useState(null);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const [d, m] = await Promise.all([fetchApi("/dashboard"), fetchApi("/meta")]);
                setDash(d);
                setMeta(m);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [fetchApi]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 gap-3">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-sm">Loading dashboard...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-900/20 border border-red-900/50 rounded-xl text-red-400 text-sm">
                Failed to load dashboard: {error}
            </div>
        );
    }

    if (!dash) return null;

    const now = new Date();
    const monthLabel = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

    /* Build actionable alerts */
    const alerts = [];
    if (dash.cards.overdueInstruments > 0) {
        alerts.push({ level: "danger", msg: `${dash.cards.overdueInstruments} instrument(s) have overdue calibrations` });
    }
    if (dash.cards.urgentRequests > 0) {
        alerts.push({ level: "warn", msg: `${dash.cards.urgentRequests} HIGH priority work request(s) are pending` });
    }
    if (dash.cards.escortRiskOrders > 0) {
        alerts.push({ level: "warn", msg: `${dash.cards.escortRiskOrders} Cat 2/3 work order(s) missing ONGC escort` });
    }
    if (dash.cards.documentsPendingReview > 0) {
        alerts.push({ level: "info", msg: `${dash.cards.documentsPendingReview} document(s) pending review` });
    }
    if (dash.slaAvailability && dash.slaAvailability < (meta?.contract?.uptimeThreshold ?? 99.5)) {
        alerts.push({ level: "danger", msg: `SLA breach: ${dash.slaAvailability}% availability is below ${meta?.contract?.uptimeThreshold ?? 99.5}% threshold` });
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-white">
                        Dashboard
                    </h1>
                    <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                        {monthLabel} · ONGC FMS Track
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <RoleBadge role={role} />
                    <span className="text-sm text-gray-400 font-medium">{user?.displayName}</span>
                </div>
            </div>

            {/* Actionable alerts */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((a, i) => (
                        <Alert key={i} level={a.level} message={a.msg} />
                    ))}
                </div>
            )}

            {/* Role-adaptive analytics */}
            {role === "ONGC_ADMIN" && <AdminAnalytics dash={dash} meta={meta} />}
            {role === "ONGC_ENGINEER" && <EngineerAnalytics dash={dash} meta={meta} />}
            {role === "CMS_COORDINATOR" && <CoordinatorAnalytics dash={dash} />}
            {role === "CMS_TECHNICIAN" && <TechnicianAnalytics dash={dash} />}
            {role === "INSTALLATION_MANAGER" && <ManagerAnalytics dash={dash} />}
            {role === "READ_ONLY" && <ViewerAnalytics dash={dash} meta={meta} />}

            {/* Recent activity (show for admin, engineer, coordinator) */}
            {["ONGC_ADMIN", "ONGC_ENGINEER", "CMS_COORDINATOR"].includes(role) && dash.recentLogs?.length > 0 && (
                <ChartCard title="Recent Activity" subtitle="Last 15 system events">
                    <DataTable
                        data={dash.recentLogs}
                        columns={LOG_COLS}
                        searchPlaceholder="Search logs..."
                        onSearch={(q) => {
                            if (!q) return dash.recentLogs;
                            const t = q.toLowerCase();
                            return dash.recentLogs.filter(
                                (l) =>
                                    (l.action || "").toLowerCase().includes(t) ||
                                    (l.entity || "").toLowerCase().includes(t) ||
                                    (l.user?.username || "").toLowerCase().includes(t)
                            );
                        }}
                    />
                </ChartCard>
            )}
        </div>
    );
}
