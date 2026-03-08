import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import { toInputDate } from "../utils/helpers";

function formatDateShort(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function daysBetween(from, to) {
    const d1 = new Date(from);
    const d2 = new Date(to);
    return Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
}

export default function Attendance() {
    const { role, fetchApi } = useAuth();
    const { toast, confirm } = useToast();
    const [absences, setAbsences] = useState([]);
    const [personnel, setPersonnel] = useState([]);
    const [summary, setSummary] = useState(null);

    const currentMonth = toInputDate(new Date()).substring(0, 7);
    const [month, setMonth] = useState(currentMonth);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({});

    const canEdit = ["ONGC_ADMIN", "ONGC_ENGINEER", "CMS_COORDINATOR"].includes(role);
    const isAdmin = role === "ONGC_ADMIN";

    useEffect(() => {
        loadData();
        // eslint-disable-next-line
    }, [month]);

    async function loadData() {
        try {
            const q = new URLSearchParams();
            if (month) q.append("month", month);

            const [abs, pers, sum] = await Promise.all([
                fetchApi(`/absences?${q}`),
                fetchApi("/contract-personnel"),
                fetchApi(`/absences/summary?${q}`),
            ]);
            setAbsences(abs);
            setPersonnel(pers);
            setSummary(sum);
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function saveAbsence(e) {
        e.preventDefault();
        try {
            if (!form.contractPersonnelId) throw new Error("Select a person");
            if (!form.fromDate || !form.toDate) throw new Error("Both dates required");

            if (editingId) {
                await fetchApi(`/absences/${editingId}`, { method: "PUT", body: form });
                toast("Absence period updated", "success");
            } else {
                await fetchApi("/absences", { method: "POST", body: form });
                toast("Absence period recorded", "success");
            }
            setShowForm(false);
            setEditingId(null);
            loadData();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function deleteAbsence(id) {
        const ok = await confirm("Delete this absence record?");
        if (!ok) return;
        try {
            await fetchApi(`/absences/${id}`, { method: "DELETE" });
            toast("Absence deleted", "warn");
            loadData();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    const cols = [
        {
            header: "Personnel", render: (r) => (
                <div className="flex flex-col">
                    <span className="text-gray-200 font-medium">{r.contractPersonnel?.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono tracking-widest">{r.contractPersonnel?.personnelCode}</span>
                    {r.contractPersonnel?.designation && (
                        <span className="text-[10px] text-gray-500">{r.contractPersonnel.designation}</span>
                    )}
                </div>
            )
        },
        {
            header: "Absence Period", render: (r) => (
                <div className="flex items-center gap-2 text-sm">
                    <span className="bg-red-900/20 text-red-300 border border-red-900/50 px-2 py-0.5 rounded text-xs font-medium">
                        {formatDateShort(r.fromDate)}
                    </span>
                    <span className="text-gray-600">→</span>
                    <span className="bg-red-900/20 text-red-300 border border-red-900/50 px-2 py-0.5 rounded text-xs font-medium">
                        {formatDateShort(r.toDate)}
                    </span>
                </div>
            )
        },
        {
            header: "Duration", render: (r) => {
                const days = daysBetween(r.fromDate, r.toDate);
                return (
                    <span className={`text-sm font-semibold ${days >= 7 ? "text-red-400" : days >= 3 ? "text-amber-400" : "text-gray-300"}`}>
                        {days} day{days !== 1 ? "s" : ""}
                    </span>
                );
            }
        },
        {
            header: "Reason", render: (r) => (
                <span className="text-gray-400 text-xs max-w-[200px] truncate block" title={r.reason || "No reason"}>
                    {r.reason || <span className="italic text-gray-600">No reason specified</span>}
                </span>
            )
        },
        {
            header: "Recorded By", render: (r) => (
                <span className="text-gray-500 text-xs">{r.createdByUser?.displayName || "System"}</span>
            )
        },
    ];

    const actions = (r) => {
        if (!canEdit) return null;
        return (
            <div className="flex items-center justify-end gap-2">
                <button
                    onClick={() => {
                        setEditingId(r.id);
                        setForm({
                            contractPersonnelId: r.contractPersonnelId,
                            fromDate: toInputDate(r.fromDate),
                            toDate: toInputDate(r.toDate),
                            reason: r.reason || "",
                        });
                        setShowForm(true);
                    }}
                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white transition"
                >
                    Edit
                </button>
                {isAdmin && (
                    <button
                        onClick={() => deleteAbsence(r.id)}
                        className="text-xs bg-red-900/50 hover:bg-red-800 text-red-200 px-2 py-1 rounded border border-red-800 transition"
                    >
                        Del
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <h1 className="text-3xl font-light text-white tracking-tight">Absence Tracker</h1>
                <div className="flex items-center gap-4">
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 rounded-md focus:ring-blue-500 focus:border-blue-500 shadow-inner"
                    />
                    {canEdit && (
                        <button
                            onClick={() => {
                                setEditingId(null);
                                setForm({
                                    fromDate: toInputDate(new Date()),
                                    toDate: toInputDate(new Date()),
                                    reason: "",
                                });
                                setShowForm(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg shadow-blue-500/30 text-sm font-medium transition"
                        >
                            + Add Absence
                        </button>
                    )}
                </div>
            </div>

            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Total Staff Tracked" value={summary.staffCount} />
                    <StatCard label="Total Absent Days" value={summary.totalAbsentDays} variant="danger" />
                    <StatCard
                        label="Staff with Absences"
                        value={summary.staffSummary?.filter(s => s.absentDays > 0).length || 0}
                    />
                    <StatCard
                        label="Avg Absent Days / Person"
                        value={summary.staffCount > 0 ? (summary.totalAbsentDays / summary.staffCount).toFixed(1) : "0"}
                    />
                </div>
            )}

            {/* Per-person summary */}
            {summary?.staffSummary && summary.staffSummary.some(s => s.absentDays > 0) && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Staff Absence Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {summary.staffSummary
                            .filter(s => s.absentDays > 0)
                            .sort((a, b) => b.absentDays - a.absentDays)
                            .map(s => (
                                <div key={s.id} className="flex items-center justify-between bg-gray-800 rounded px-3 py-2">
                                    <div>
                                        <span className="text-sm text-gray-200">{s.name}</span>
                                        <span className="text-[10px] font-mono text-gray-500 ml-2">{s.personnelCode}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${s.absentDays >= 7 ? "text-red-400" : s.absentDays >= 3 ? "text-amber-400" : "text-gray-300"}`}>
                                        {s.absentDays}d
                                    </span>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}

            {showForm && (
                <div className="bg-gray-800 border-l-4 border-blue-500 p-6 rounded-lg shadow-xl">
                    <h3 className="text-lg font-medium text-white mb-4">
                        {editingId ? "Edit Absence Period" : "Record Absence Period"}
                    </h3>
                    <form onSubmit={saveAbsence} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Personnel <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={form.contractPersonnelId || ""}
                                onChange={(e) => setForm({ ...form, contractPersonnelId: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            >
                                <option value="">Select Personnel</option>
                                {personnel.map(p => <option key={p.id} value={p.id}>{p.name} ({p.personnelCode})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From Date <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                required
                                value={form.fromDate || ""}
                                onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To Date <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                required
                                value={form.toDate || ""}
                                onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            />
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Reason</label>
                            <input
                                type="text"
                                value={form.reason || ""}
                                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-600"
                                placeholder="e.g., Medical leave, Personal leave..."
                            />
                        </div>
                        <div className="md:col-span-4 flex justify-end gap-3 mt-4 border-t border-gray-700 pt-4">
                            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition">
                                Cancel
                            </button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded shadow-md shadow-blue-500/20 font-medium transition">
                                {editingId ? "Update" : "Save"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <DataTable
                title="Absence Records"
                data={absences}
                columns={cols}
                actions={canEdit ? actions : undefined}
                searchPlaceholder="Search personnel, reason..."
                onSearch={(q) => {
                    if (!q) { loadData(); return; }
                    const term = q.toLowerCase();
                    setAbsences((prev) => prev.filter(r =>
                        (r.contractPersonnel?.name || "").toLowerCase().includes(term) ||
                        (r.reason || "").toLowerCase().includes(term) ||
                        (r.contractPersonnel?.personnelCode || "").toLowerCase().includes(term)
                    ));
                }}
            />
        </div>
    );
}
