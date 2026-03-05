import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import DataTable from "../components/DataTable";
import RoleBadge from "../components/RoleBadge";
import { formatDate, toInputDate, slugToken } from "../utils/helpers";

export default function AssignmentDesk() {
    const { user, role, fetchApi } = useAuth();
    const { toast, confirm } = useToast();
    const [orders, setOrders] = useState([]);
    const [installations, setInstallations] = useState([]);
    const [services, setServices] = useState([]);
    const [personnel, setPersonnel] = useState([]);
    const [ongcPersonnel, setOngcPersonnel] = useState([]);
    const [instruments, setInstruments] = useState([]);

    const [ordFilters, setOrdFilters] = useState({
        status: "",
        category: "",
    });
    const [showOrdForm, setShowOrdForm] = useState(false);
    const [editingOrd, setEditingOrd] = useState(null);
    const [formOrd, setFormOrd] = useState({});

    useEffect(() => {
        loadOrders();
        loadMeta();
        // eslint-disable-next-line
    }, [ordFilters]);

    async function loadOrders() {
        try {
            const q = new URLSearchParams();
            if (ordFilters.status) q.append("status", ordFilters.status);
            if (ordFilters.category) q.append("category", ordFilters.category);
            const data = await fetchApi(`/work-orders?${q}`);
            setOrders(data);
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function loadMeta() {
        try {
            const [insts, srvs, prs, ongc, instrm] = await Promise.all([
                fetchApi("/installations"),
                fetchApi("/services"),
                fetchApi("/contract-personnel"),
                fetchApi("/ongc-personnel"),
                fetchApi("/instruments"),
            ]);
            setInstallations(insts);
            setServices(srvs);
            setPersonnel(prs);
            setOngcPersonnel(ongc);
            setInstruments(instrm);
        } catch (err) {
            console.error(err);
        }
    }

    async function saveOrder(e) {
        e.preventDefault();
        try {
            const payload = { ...formOrd };
            if (!payload.installationId) throw new Error("Installation required");
            if (!payload.category) throw new Error("Category required");

            if (editingOrd) {
                await fetchApi(`/work-orders/${editingOrd.id}`, {
                    method: "PUT",
                    body: payload,
                });
                toast("Work order updated", "success");
            } else {
                await fetchApi("/work-orders", {
                    method: "POST",
                    body: payload,
                });
                toast("Work order created", "success");
            }
            setShowOrdForm(false);
            loadOrders();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function deleteOrder(id) {
        const ok = await confirm("Delete this work order and all linked records?");
        if (!ok) return;
        try {
            await fetchApi(`/work-orders/${id}`, { method: "DELETE" });
            toast("Work order deleted", "warn");
            loadOrders();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    const isTechOrCoord = role === "CMS_TECHNICIAN" || role === "CMS_COORDINATOR";

    const cols = [
        { header: "WO #", field: "workOrderNo", className: "font-mono font-medium text-emerald-400" },
        {
            header: "Context", render: (r) => (
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
            header: "Details", render: (r) => (
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-200">Cat {r.category}</span>
                        {r.escortRequired && (
                            <span className="text-[10px] bg-amber-900/30 text-amber-500 border border-amber-800/50 px-1 rounded">
                                Escort Required
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        {r.sourceRequest ? (
                            <span className="text-gray-400">Source: <span className="font-mono text-blue-300">{r.sourceRequest.requestNo}</span></span>
                        ) : (
                            <span className="text-gray-500 italic">Direct Order</span>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: "Team / Engineers", render: (r) => (
                <div className="text-xs">
                    <div className="text-gray-400 mb-1">CMS Team:</div>
                    {r.assignments && r.assignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {r.assignments.map((a) => (
                                <span key={a.id} className="bg-gray-800 border border-gray-700 text-gray-300 px-1.5 py-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                                    {a.contractPersonnel.name} <span className="text-gray-500 text-[10px]">({a.contractPersonnel.personnelCode})</span>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-600 mb-2 italic">Unassigned</div>
                    )}

                    <div className="text-gray-400 mb-1">ONGC Engineer:</div>
                    {r.ongcEngineer ? (
                        <div className="text-gray-300">
                            {r.ongcEngineer.name} <span className="text-gray-500 text-[10px]">({r.ongcEngineer.cpfNo})</span>
                        </div>
                    ) : (
                        <div className="text-gray-600 italic">None selected</div>
                    )}
                </div>
            )
        },
        {
            header: "Schedule", render: (r) => (
                <div className="text-xs space-y-1">
                    <div>
                        <span className="text-gray-500 block">Scheduled:</span>
                        <span className="font-medium text-gray-300">{formatDate(r.scheduledDate)}</span>
                    </div>
                    {r.completedDate && (
                        <div>
                            <span className="text-gray-500 block">Completed:</span>
                            <span className="font-medium text-gray-300">{formatDate(r.completedDate)}</span>
                        </div>
                    )}
                </div>
            )
        },
        {
            header: "Status & Flags", render: (r) => {
                let scn = "bg-gray-800 text-gray-400 border-gray-700";
                if (r.status === "SCHEDULED") scn = "bg-blue-900 text-blue-200 border-blue-700";
                if (r.status === "IN_PROGRESS") scn = "bg-orange-900 text-orange-200 border-orange-700";
                if (r.status === "COMPLETED") scn = "bg-green-900 text-green-200 border-green-700";
                if (r.status === "CANCELLED") scn = "bg-red-900 text-red-200 border-red-700";

                return (
                    <div className="flex flex-col gap-2 w-max">
                        <span className={`text-[11px] font-medium px-2 py-1 rounded border shadow-sm ${scn}`}>
                            {r.status}
                        </span>
                        <div className="flex gap-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded tracking-wide font-medium ${r.reportUploaded ? "bg-emerald-900/30 text-emerald-400" : "bg-gray-800 text-gray-500"
                                }`}>
                                {r.reportUploaded ? "REPORT UP" : "NO REPORT"}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded tracking-wide font-medium ${r.uatDone ? "bg-indigo-900/30 text-indigo-400" : "bg-gray-800 text-gray-500"
                                }`}>
                                {r.uatDone ? "UAT DONE" : "NO UAT"}
                            </span>
                        </div>
                    </div>
                );
            }
        },
    ];

    const actions = (r) => (
        <div className="flex items-center justify-end gap-2">
            <button
                onClick={() => {
                    setEditingOrd(r);
                    setFormOrd({
                        ...r,
                        scheduledDate: toInputDate(r.scheduledDate),
                        completedDate: toInputDate(r.completedDate),
                        contractPersonnelIds: r.assignments?.map(a => a.contractPersonnelId) || []
                    });
                    setShowOrdForm(true);
                }}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white"
                disabled={isTechOrCoord && r.status === "COMPLETED"} // Basic UI protection
            >
                Edit
            </button>
            {!isTechOrCoord && (
                <button
                    onClick={() => deleteOrder(r.id)}
                    className="text-xs bg-red-900/50 hover:bg-red-800 text-red-200 px-2 py-1 rounded border border-red-800 flex items-center gap-1"
                >
                    Del
                </button>
            )}
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-light text-white">Assignment Desk</h2>
                {!isTechOrCoord && role !== "ONGC_VIEWER" && (
                    <button
                        onClick={() => {
                            setEditingOrd(null);
                            setFormOrd({
                                category: 1,
                                contractPersonnelIds: [],
                                status: "SCHEDULED"
                            });
                            setShowOrdForm(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded shadow-lg shadow-emerald-500/30 text-sm font-medium transition flex items-center gap-2"
                    >
                        <span>+</span> Direct Work Order
                    </button>
                )}
            </div>

            {showOrdForm && (
                <div className="bg-gray-800 border-l-4 border-emerald-500 p-6 rounded-lg mb-6 shadow-xl">
                    <h3 className="text-lg font-medium text-white mb-4">
                        {editingOrd ? "Edit Work Order" : "Create Work Order"}
                    </h3>
                    <form onSubmit={saveOrder} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Form fields logic is simplified for brevity but functional */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Installation <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={formOrd.installationId || ""}
                                onChange={(e) => setFormOrd({ ...formOrd, installationId: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                                disabled={isTechOrCoord}
                            >
                                <option value="">Select Installation</option>
                                {installations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={formOrd.category || 1}
                                onChange={(e) => setFormOrd({ ...formOrd, category: parseInt(e.target.value) })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                                disabled={isTechOrCoord}
                            >
                                {[1, 2, 3].map(c => <option key={c} value={c}>Category {c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                            <select
                                value={formOrd.status || "SCHEDULED"}
                                onChange={(e) => setFormOrd({ ...formOrd, status: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            >
                                {["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Multiple personnel select - simplified multiselect UI */}
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">CMS Team Assignment</label>
                            <select
                                multiple
                                value={formOrd.contractPersonnelIds || []}
                                onChange={(e) => {
                                    const vals = Array.from(e.target.selectedOptions, option => option.value);
                                    setFormOrd({ ...formOrd, contractPersonnelIds: vals });
                                }}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white h-24"
                            >
                                {personnel.filter(p => p.isActive).map((p) => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.designation})</option>
                                ))}
                            </select>
                            <div className="text-[10px] text-gray-500 mt-1">Hold Cmd/Ctrl to select multiple</div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">ONGC Engineer</label>
                            <select
                                value={formOrd.ongcEngineerId || ""}
                                onChange={(e) => setFormOrd({ ...formOrd, ongcEngineerId: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                                disabled={isTechOrCoord}
                            >
                                <option value="">(None)</option>
                                {ongcPersonnel.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div className="col-span-full flex gap-4 mt-2 mb-2 p-3 bg-gray-900/50 rounded border border-gray-700">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={formOrd.escortRequired || false}
                                    onChange={(e) => setFormOrd({ ...formOrd, escortRequired: e.target.checked })}
                                    disabled={isTechOrCoord}
                                    className="rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500/30 w-4 h-4 cursor-pointer"
                                />
                                Escort Required
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={formOrd.uatDone || false}
                                    onChange={(e) => setFormOrd({ ...formOrd, uatDone: e.target.checked })}
                                    className="rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500/30 w-4 h-4 cursor-pointer"
                                />
                                UAT Completed
                            </label>
                        </div>

                        <div className="col-span-full flex justify-end gap-3 mt-4 border-t border-gray-700 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowOrdForm(false)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-lg shadow-emerald-500/30 font-medium"
                            >
                                Save Assignment
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <DataTable
                title="Work Orders"
                data={orders}
                columns={cols}
                actions={role !== "ONGC_VIEWER" ? actions : undefined}
                filters={
                    <>
                        <select
                            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={ordFilters.status}
                            onChange={(e) => setOrdFilters({ ...ordFilters, status: e.target.value })}
                        >
                            <option value="">All Statuses</option>
                            {["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select
                            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={ordFilters.category}
                            onChange={(e) => setOrdFilters({ ...ordFilters, category: e.target.value })}
                        >
                            <option value="">All Categories</option>
                            {[1, 2, 3].map(c => <option key={c} value={c}>Category {c}</option>)}
                        </select>
                    </>
                }
                onSearch={(q) => {
                    if (!q) {
                        loadOrders();
                        return;
                    }
                    const term = q.toLowerCase();
                    setOrders((prev) => prev.filter(r =>
                        (r.workOrderNo || "").toLowerCase().includes(term) ||
                        (r.sourceRequest?.requestNo || "").toLowerCase().includes(term) ||
                        (r.installation?.name || "").toLowerCase().includes(term) ||
                        (r.instrument?.tagNo || "").toLowerCase().includes(term)
                    ));
                }}
            />
        </div>
    );
}
