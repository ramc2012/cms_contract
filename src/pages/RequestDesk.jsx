import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import DataTable from "../components/DataTable";
import RoleBadge from "../components/RoleBadge";
import { formatDate, toInputDate, slugToken } from "../utils/helpers";

const REQUEST_ORIGINS = [
    ["INSTALLATION_MANAGER", "IM Generated"],
    ["AUTO_GENERATED", "Auto Generated"],
    ["MANUAL", "Manual"],
];

export default function RequestDesk() {
    const { user, role, fetchApi } = useAuth();
    const { toast, confirm } = useToast();
    const [requests, setRequests] = useState([]);
    const [installations, setInstallations] = useState([]);
    const [services, setServices] = useState([]);
    const [managers, setManagers] = useState([]);
    const [instruments, setInstruments] = useState([]);

    const [reqFilters, setReqFilters] = useState({
        status: "",
        origin: "",
        managerId: "",
    });
    const [showReqForm, setShowReqForm] = useState(false);
    const [editingReq, setEditingReq] = useState(null);
    const [formReq, setFormReq] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadRequests();
        loadMeta();
        // eslint-disable-next-line
    }, [reqFilters]);

    async function loadRequests() {
        try {
            const q = new URLSearchParams();
            if (reqFilters.status) q.append("status", reqFilters.status);
            if (reqFilters.origin) q.append("origin", reqFilters.origin);
            if (reqFilters.managerId) q.append("managerId", reqFilters.managerId);
            const data = await fetchApi(`/work-requests?${q}`);
            setRequests(data);
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function loadMeta() {
        try {
            const [insts, srvs, mgrs, instrms] = await Promise.all([
                fetchApi("/installations"),
                fetchApi("/services"),
                fetchApi("/managers"),
                fetchApi("/instruments"),
            ]);
            setInstallations(insts);
            setServices(srvs);
            setManagers(mgrs);
            setInstruments(instrms);
        } catch (err) {
            console.error(err);
        }
    }

    async function saveRequest(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...formReq };
            if (!payload.installationId) throw new Error("Installation required");
            if (!payload.title) throw new Error("Title required");
            if (!payload.description) throw new Error("Description required");
            if (
                role !== "INSTALLATION_MANAGER" &&
                !payload.requestedByManagerId
            ) {
                throw new Error("Manager required");
            }
            if (editingReq) {
                await fetchApi(`/work-requests/${editingReq.id}`, {
                    method: "PUT",
                    body: payload,
                });
                toast("Work request updated", "success");
            } else {
                await fetchApi("/work-requests", {
                    method: "POST",
                    body: payload,
                });
                toast("Work request created", "success");
            }
            setShowReqForm(false);
            loadRequests();
        } catch (err) {
            toast(err.message, "error");
        } finally {
            setSaving(false);
        }
    }

    async function submitRequest(id) {
        const ok = await confirm("Submit this request for review?");
        if (!ok) return;
        try {
            await fetchApi(`/work-requests/${id}/submit`, { method: "POST" });
            toast("Request submitted for review", "success");
            loadRequests();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function deleteRequest(id) {
        const ok = await confirm("Permanently delete this request?");
        if (!ok) return;
        try {
            await fetchApi(`/work-requests/${id}`, { method: "DELETE" });
            toast("Request deleted", "warn");
            loadRequests();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function generateAuto() {
        try {
            const res = await fetchApi("/work-requests/auto-generate", {
                method: "POST",
                body: { limit: 100 },
            });
            toast(`Checked ${res.checked} instruments. Created ${res.createdCount} auto-requests.`, "success");
            loadRequests();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    const isIM = role === "INSTALLATION_MANAGER";
    const imAssignedIds = user?.installations?.map((i) => i.id) || [];

    const allowedInstallations =
        isIM ? installations.filter((i) => imAssignedIds.includes(i.id)) : installations;

    const cols = [
        { header: "REQ #", field: "requestNo", className: "font-mono font-medium text-blue-400" },
        {
            header: "Title & Details", render: (r) => (
                <div>
                    <div className="font-semibold text-gray-200">{r.title}</div>
                    <div className="text-xs text-gray-400 mt-1 max-w-sm truncate" title={r.description}>
                        {r.description}
                    </div>
                    <div className="flex gap-2 mt-2">
                        {r.requestOrigin && (
                            <span className="text-[10px] bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded text-gray-400">
                                {r.requestOrigin}
                            </span>
                        )}
                        {r.priority && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${r.priority === "HIGH" ? "bg-red-900/30 text-red-400 border-red-800" :
                                    r.priority === "MEDIUM" ? "bg-orange-900/30 text-orange-400 border-orange-800" :
                                        "bg-gray-800 text-gray-400 border-gray-700"
                                }`}>
                                {r.priority}
                            </span>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: "Asset Context", render: (r) => (
                <div className="flex flex-col gap-1 text-xs">
                    {r.installation && (
                        <span className="bg-blue-900/20 text-blue-300 border border-blue-900/50 px-2 py-1 rounded inline-flex items-center w-max">
                            🏢 {slugToken(r.installation.name)}
                        </span>
                    )}
                    {r.instrument && (
                        <span className="bg-teal-900/20 text-teal-300 border border-teal-900/50 px-2 py-1 rounded inline-flex items-center w-max">
                            ⚙️ {slugToken(r.instrument.tagNo)}
                        </span>
                    )}
                </div>
            )
        },
        {
            header: "Requested By", render: (r) => (
                <div className="flex flex-col gap-1">
                    {r.requestedByManager ? (
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-300 font-medium">{r.requestedByManager.name}</span>
                            <span className="text-[10px] text-gray-500">({r.requestedByManager.sapNo})</span>
                        </div>
                    ) : (
                        <span className="text-gray-500 italic text-xs">No Manager Assigned</span>
                    )}
                    <div className="text-[10px] text-gray-500">
                        Created: {formatDate(r.createdAt)}
                    </div>
                </div>
            )
        },
        {
            header: "Preferred Date", render: (r) =>
                r.preferredDate ? formatDate(r.preferredDate) : "-"
        },
        {
            header: "Status", render: (r) => {
                let cn = "bg-gray-800 text-gray-400 border-gray-700";
                if (r.status === "SUBMITTED") cn = "bg-blue-900 text-blue-200 border-blue-700";
                if (r.status === "REVIEWED") cn = "bg-purple-900 text-purple-200 border-purple-700";
                if (r.status === "REJECTED") cn = "bg-red-900 text-red-200 border-red-700";
                if (r.status === "CONVERTED") cn = "bg-green-900 text-green-200 border-green-700";
                return (
                    <span className={`text-[11px] font-medium px-2 py-1 rounded border shadow-sm ${cn}`}>
                        {r.status}
                    </span>
                );
            }
        },
    ];

    const actions = (r) => (
        <div className="flex items-center justify-end gap-2">
            {r.status === "DRAFT" && (isIM || role === "ONGC_ADMIN") && (
                <button
                    onClick={() => submitRequest(r.id)}
                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded shadow"
                >
                    Submit
                </button>
            )}
            {/* Edit logic */}
            {r.status !== "CONVERTED" && r.status !== "REJECTED" && (
                <button
                    onClick={() => {
                        setEditingReq(r);
                        setFormReq({
                            ...r,
                            preferredDate: toInputDate(r.preferredDate),
                            installationId: r.installationId || "",
                            instrumentId: r.instrumentId || "",
                            serviceId: r.serviceId || "",
                            requestedByManagerId: r.requestedByManagerId || "",
                        });
                        setShowReqForm(true);
                    }}
                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white"
                >
                    Edit
                </button>
            )}
            {/* Admin overriding delete */}
            {r.status !== "CONVERTED" && (role === "ONGC_ADMIN" || isIM || role === "ONGC_ENGINEER") && (
                <button
                    onClick={() => deleteRequest(r.id)}
                    className="text-xs bg-red-900/50 hover:bg-red-800 text-red-200 px-2 py-1 rounded border border-red-800"
                >
                    Del
                </button>
            )}
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-light text-white">Work Requests</h2>
                <div className="flex gap-3">
                    {role === "ONGC_ADMIN" && (
                        <button
                            onClick={generateAuto}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded shadow-lg shadow-indigo-500/30 text-sm font-medium transition"
                        >
                            Check Overdue & Auto-Gen
                        </button>
                    )}
                    {role !== "ONGC_VIEWER" && (
                        <button
                            onClick={() => {
                                setEditingReq(null);
                                setFormReq({ priority: "MEDIUM" });
                                setShowReqForm(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded shadow-lg shadow-blue-500/30 text-sm font-medium transition flex items-center gap-2"
                        >
                            <span>+</span> New Request
                        </button>
                    )}
                </div>
            </div>

            {showReqForm && (
                <div className="bg-gray-800 border-l-4 border-blue-500 p-6 rounded-lg mb-6 shadow-xl">
                    <h3 className="text-lg font-medium text-white mb-4">
                        {editingReq ? "Edit Work Request" : "Create Work Request"}
                    </h3>
                    <form onSubmit={saveRequest} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <div className="xl:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                value={formReq.title || ""}
                                onChange={(e) => setFormReq({ ...formReq, title: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div className="xl:col-span-4">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                required
                                rows="2"
                                value={formReq.description || ""}
                                onChange={(e) => setFormReq({ ...formReq, description: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                Installation <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formReq.installationId || ""}
                                onChange={(e) => setFormReq({ ...formReq, installationId: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">Select Installation</option>
                                {allowedInstallations.map((i) => (
                                    <option key={i.id} value={i.id}>{i.name}</option>
                                ))}
                            </select>
                        </div>

                        {!isIM && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Manager <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formReq.requestedByManagerId || ""}
                                    onChange={(e) => setFormReq({ ...formReq, requestedByManagerId: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                                >
                                    <option value="">Select Manager</option>
                                    {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                Instrument
                            </label>
                            <select
                                value={formReq.instrumentId || ""}
                                onChange={(e) => setFormReq({ ...formReq, instrumentId: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            >
                                <option value="">(None)</option>
                                {instruments
                                    .filter((i) => !formReq.installationId || i.installationId === formReq.installationId)
                                    .map((i) => <option key={i.id} value={i.id}>{i.tagNo}</option>)}
                            </select>
                        </div>

                        {role === "ONGC_ADMIN" && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                                <select
                                    value={formReq.status || "DRAFT"}
                                    onChange={(e) => setFormReq({ ...formReq, status: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                                >
                                    <option value="DRAFT">DRAFT</option>
                                    <option value="SUBMITTED">SUBMITTED</option>
                                    <option value="REVIEWED">REVIEWED</option>
                                    <option value="REJECTED">REJECTED</option>
                                </select>
                            </div>
                        )}

                        <div className="xl:col-span-4 flex justify-end gap-3 mt-2 border-t border-gray-700 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowReqForm(false)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded shadow-lg shadow-blue-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters inside DataTable */}
            <DataTable
                title="Work Request Catalog"
                data={requests}
                columns={cols}
                actions={role !== "ONGC_VIEWER" ? actions : undefined}
                filters={
                    <>
                        <select
                            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white"
                            value={reqFilters.status}
                            onChange={(e) => setReqFilters({ ...reqFilters, status: e.target.value })}
                        >
                            <option value="">All Statuses</option>
                            {["DRAFT", "SUBMITTED", "REVIEWED", "REJECTED", "CONVERTED"].map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <select
                            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white"
                            value={reqFilters.origin}
                            onChange={(e) => setReqFilters({ ...reqFilters, origin: e.target.value })}
                        >
                            <option value="">All Origins</option>
                            {REQUEST_ORIGINS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </>
                }
                onSearch={(q) => {
                    if (!q) {
                        loadRequests();
                        return;
                    }
                    const term = q.toLowerCase();
                    setRequests((prev) => prev.filter(r =>
                        (r.requestNo || "").toLowerCase().includes(term) ||
                        (r.title || "").toLowerCase().includes(term) ||
                        (r.installation?.name || "").toLowerCase().includes(term) ||
                        (r.instrument?.tagNo || "").toLowerCase().includes(term)
                    ));
                }}
            />
        </div>
    );
}
