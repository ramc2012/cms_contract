import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import { formatDate, toInputDate } from "../utils/helpers";

export default function Attendance() {
    const { role, fetchApi } = useAuth();
    const { toast } = useToast();
    const [data, setData] = useState([]);
    const [personnel, setPersonnel] = useState([]);
    const [summary, setSummary] = useState(null);

    const currentMonth = toInputDate(new Date()).substring(0, 7);
    const [month, setMonth] = useState(currentMonth);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({});

    useEffect(() => {
        loadData();
        // eslint-disable-next-line
    }, [month]);

    // Load summary whenever data changes
    useEffect(() => {
        loadSummary();
        // eslint-disable-next-line
    }, [month, data]);

    async function loadData() {
        try {
            const q = new URLSearchParams();
            // If we pick a month, fetch dates from 1st to 31st
            if (month) {
                q.append("from", `${month}-01`);
                q.append("to", `${month}-31`);
            }
            const [att, pers] = await Promise.all([
                fetchApi(`/attendance?${q}`),
                fetchApi("/contract-personnel")
            ]);
            setData(att);
            setPersonnel(pers);
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function loadSummary() {
        try {
            const q = new URLSearchParams();
            if (month) q.append("month", month);
            const sum = await fetchApi(`/attendance/summary?${q}`);
            setSummary(sum);
        } catch (err) {
            console.error(err);
        }
    }

    async function saveAttendance(e) {
        e.preventDefault();
        try {
            await fetchApi("/attendance", {
                method: "POST",
                body: form,
            });
            toast("Attendance record saved", "success");
            setShowForm(false);
            loadData();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    const isEditor = ["ONGC_ADMIN", "ONGC_ENGINEER", "CMS_COORDINATOR", "CMS_TECHNICIAN"].includes(role);

    const cols = [
        { header: "Date", render: (r) => <span className="font-medium text-white">{formatDate(r.date)}</span> },
        {
            header: "Personnel", render: (r) => (
                <div className="flex flex-col">
                    <span className="text-gray-200">{r.contractPersonnel?.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono tracking-widest">{r.contractPersonnel?.personnelCode}</span>
                </div>
            )
        },
        {
            header: "Status", render: (r) => (
                r.present
                    ? <span className="bg-emerald-900/30 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-xs">Present</span>
                    : <span className="bg-red-900/30 text-red-400 border border-red-800 px-2 py-0.5 rounded text-xs">Absent</span>
            )
        },
        {
            header: "Mode & Location", render: (r) => {
                if (!r.present) return "-";
                return (
                    <div className="flex flex-col text-xs space-y-1">
                        <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded border ${r.mode === "ONSITE" ? "bg-blue-900/30 border-blue-800 text-blue-300" :
                                    r.mode === "REMOTE" ? "bg-purple-900/30 border-purple-800 text-purple-300" :
                                        "bg-gray-800 border-gray-700 text-gray-400"
                                }`}>
                                {r.mode || "UNKNOWN"}
                            </span>
                        </div>
                        {r.site && <div className="text-gray-400 truncate max-w-[200px]" title={r.site}>📍 {r.site}</div>}
                    </div>
                );
            }
        },
        {
            header: "Work Order", render: (r) => (
                r.workOrder ? (
                    <span className="font-mono text-xs text-blue-400 hover:text-blue-300 cursor-pointer">{r.workOrder.workOrderNo}</span>
                ) : "-"
            )
        },
    ];

    const actions = (r) => (
        <div className="flex items-center justify-end">
            {isEditor && (
                <button
                    onClick={() => {
                        setForm({
                            ...r,
                            date: toInputDate(r.date),
                        });
                        setShowForm(true);
                    }}
                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white"
                >
                    Edit
                </button>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <h1 className="text-3xl font-light text-white tracking-tight">Attendance & Deployment</h1>
                <div className="flex items-center gap-4">
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 rounded-md focus:ring-blue-500 focus:border-blue-500 shadow-inner"
                    />
                    {isEditor && (
                        <button
                            onClick={() => {
                                setForm({
                                    date: toInputDate(new Date()),
                                    present: true,
                                    mode: "ONSITE"
                                });
                                setShowForm(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg shadow-blue-500/30 text-sm font-medium transition"
                        >
                            Log Entry
                        </button>
                    )}
                </div>
            </div>

            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Total Staff Tracked" value={summary.staffCount} />
                    <StatCard label="Total Man-days (Month)" value={summary.totalPresent} />
                    <StatCard label="Onsite Days" value={summary.onsiteDays} />
                    <StatCard label="Remote Support Days" value={summary.remoteDays} />
                </div>
            )}

            {showForm && (
                <div className="bg-gray-800 border-l-4 border-blue-500 p-6 rounded-lg shadow-xl">
                    <h3 className="text-lg font-medium text-white mb-4">Log Attendance Event</h3>
                    <form onSubmit={saveAttendance} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
                            <input
                                type="date"
                                required
                                value={form.date || ""}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Personnel</label>
                            <select
                                required
                                value={form.contractPersonnelId || ""}
                                onChange={(e) => setForm({ ...form, contractPersonnelId: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            >
                                <option value="">Select Personnel</option>
                                {personnel.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
                                <input
                                    type="checkbox"
                                    checked={form.present !== false}
                                    onChange={(e) => setForm({ ...form, present: e.target.checked })}
                                    className="rounded bg-gray-900 border-gray-700 text-blue-600 focus:ring-blue-500 w-5 h-5"
                                />
                                Present
                            </label>
                        </div>

                        {form.present !== false && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Deployment Mode</label>
                                    <select
                                        value={form.mode || "ONSITE"}
                                        onChange={(e) => setForm({ ...form, mode: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                                    >
                                        <option value="ONSITE">ONSITE</option>
                                        <option value="REMOTE">REMOTE</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Site / Location</label>
                                    <input
                                        type="text"
                                        value={form.site || ""}
                                        onChange={(e) => setForm({ ...form, site: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-600"
                                        placeholder="E.g., Rig Alpha, Base Camp..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Work Order (Optional)</label>
                                    <input
                                        type="text"
                                        value={form.workOrderId || ""}
                                        onChange={(e) => setForm({ ...form, workOrderId: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-mono text-sm placeholder-gray-600"
                                        placeholder="Paste ID..."
                                    />
                                </div>
                            </>
                        )}

                        <div className="md:col-span-4 flex justify-end gap-3 mt-4 border-t border-gray-700 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded shadow-md shadow-blue-500/20 font-medium transition"
                            >
                                Save Record
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <DataTable
                title="Daily Logs"
                data={data}
                columns={cols}
                actions={actions}
                searchPlaceholder="Search personnel, location..."
                onSearch={(q) => {
                    if (!q) {
                        loadData();
                        return;
                    }
                    const term = q.toLowerCase();
                    setData((prev) => prev.filter(r =>
                        (r.contractPersonnel?.name || "").toLowerCase().includes(term) ||
                        (r.site || "").toLowerCase().includes(term) ||
                        (r.workOrder?.workOrderNo || "").toLowerCase().includes(term)
                    ));
                }}
            />
        </div>
    );
}
