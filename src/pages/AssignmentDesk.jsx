import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import DataTable from "../components/DataTable";
import WorkOrderTimeline from "../components/WorkOrderTimeline";
import { formatDate, toInputDate, slugToken } from "../utils/helpers";

const STATUS_LABELS = {
    REQUESTED: "Requested",
    ASSIGNED: "Assigned",
    DEPLOYED: "Deployed",
    WORK_DONE: "Work Done",
    REPORT_SUBMITTED: "Report Submitted",
    COMPLETED: "Completed",
};

const STATUS_ORDER = ["REQUESTED", "ASSIGNED", "DEPLOYED", "WORK_DONE", "REPORT_SUBMITTED", "COMPLETED"];

export default function AssignmentDesk() {
    const { user, role, fetchApi } = useAuth();
    const { toast, confirm } = useToast();
    const [orders, setOrders] = useState([]);
    const [installations, setInstallations] = useState([]);
    const [services, setServices] = useState([]);
    const [personnel, setPersonnel] = useState([]);
    const [ongcPersonnel, setOngcPersonnel] = useState([]);
    const [instruments, setInstruments] = useState([]);

    const [ordFilters, setOrdFilters] = useState({ status: "", category: "" });
    const [showOrdForm, setShowOrdForm] = useState(false);
    const [editingOrd, setEditingOrd] = useState(null);
    const [formOrd, setFormOrd] = useState({});

    // Update status modal
    const [advanceTarget, setAdvanceTarget] = useState(null);
    const [advanceStatus, setAdvanceStatus] = useState("");
    const [advanceRemarks, setAdvanceRemarks] = useState("");

    // Upload report modal
    const [uploadTarget, setUploadTarget] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadProof, setUploadProof] = useState(null);
    const fileRef = useRef(null);
    const proofRef = useRef(null);

    const isAdmin = role === "ONGC_ADMIN";
    const isCMS = role === "CMS_COORDINATOR" || role === "CMS_TECHNICIAN";
    const isViewer = role === "READ_ONLY" || role === "ONGC_VIEWER";

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
                await fetchApi(`/work-orders/${editingOrd.id}`, { method: "PUT", body: payload });
                toast("Work order updated", "success");
            } else {
                await fetchApi("/work-orders", { method: "POST", body: payload });
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

    async function advanceOrder() {
        if (!advanceTarget || !advanceStatus) return;
        try {
            await fetchApi(`/work-orders/${advanceTarget.id}/advance`, {
                method: "PATCH",
                body: { status: advanceStatus, remarks: advanceRemarks || undefined },
            });
            toast(`Status updated to ${STATUS_LABELS[advanceStatus] || advanceStatus}`, "success");
            setAdvanceTarget(null);
            setAdvanceStatus("");
            setAdvanceRemarks("");
            loadOrders();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function uploadReport() {
        if (!uploadTarget) return;
        try {
            if (uploadFile) {
                const fd = new FormData();
                fd.append("file", uploadFile);
                fd.append("category", "CALIBRATION");
                fd.append("workOrderId", uploadTarget.id);
                fd.append("status", "PENDING_REVIEW");
                fd.append("name", uploadFile.name);
                const resp = await fetch(`/api/documents`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${localStorage.getItem("fms_token")}` },
                    body: fd,
                });
                if (!resp.ok) {
                    const err = await resp.json();
                    throw new Error(err.message || "Upload failed");
                }
            }
            if (uploadProof) {
                const fd = new FormData();
                fd.append("file", uploadProof);
                fd.append("category", "PROOF_PHOTO");
                fd.append("workOrderId", uploadTarget.id);
                fd.append("name", uploadProof.name);
                const resp = await fetch(`/api/documents`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${localStorage.getItem("fms_token")}` },
                    body: fd,
                });
                if (!resp.ok) {
                    const err = await resp.json();
                    throw new Error(err.message || "Upload failed");
                }
            }
            // Auto-advance to REPORT_SUBMITTED if currently WORK_DONE
            if (uploadTarget.status === "WORK_DONE" && (uploadFile || uploadProof)) {
                await fetchApi(`/work-orders/${uploadTarget.id}/advance`, {
                    method: "PATCH",
                    body: { status: "REPORT_SUBMITTED" },
                });
            }
            toast("Documents uploaded successfully", "success");
            setUploadTarget(null);
            setUploadFile(null);
            setUploadProof(null);
            loadOrders();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    function getNextStatuses(currentStatus) {
        const idx = STATUS_ORDER.indexOf(currentStatus);
        if (idx === -1 || idx >= STATUS_ORDER.length - 1) return [];
        return STATUS_ORDER.slice(idx + 1);
    }

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
                                    {a.contractPersonnel.name}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-600 mb-2 italic">Unassigned</div>
                    )}
                    <div className="text-gray-400 mb-1">ONGC Engineer:</div>
                    {r.ongcEngineer ? (
                        <div className="text-gray-300">{r.ongcEngineer.name}</div>
                    ) : (
                        <div className="text-gray-600 italic">None</div>
                    )}
                </div>
            )
        },
        {
            header: "Status & Progress", render: (r) => {
                let scn = "bg-gray-800 text-gray-400 border-gray-700";
                if (r.status === "REQUESTED") scn = "bg-blue-900 text-blue-200 border-blue-700";
                if (r.status === "ASSIGNED") scn = "bg-indigo-900 text-indigo-200 border-indigo-700";
                if (r.status === "DEPLOYED") scn = "bg-orange-900 text-orange-200 border-orange-700";
                if (r.status === "WORK_DONE") scn = "bg-teal-900 text-teal-200 border-teal-700";
                if (r.status === "REPORT_SUBMITTED") scn = "bg-fuchsia-900 text-fuchsia-200 border-fuchsia-700";
                if (r.status === "COMPLETED") scn = "bg-green-900 text-green-200 border-green-700";

                return (
                    <div className="flex flex-col gap-2 min-w-[280px]">
                        <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-medium px-2 py-1 rounded border shadow-sm ${scn}`}>
                                {STATUS_LABELS[r.status] || r.status}
                            </span>
                            <div className="flex gap-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded tracking-wide font-medium ${r.reportUploaded ? "bg-emerald-900/30 text-emerald-400" : "bg-gray-800 text-gray-500"}`}>
                                    {r.reportUploaded ? "REPORT ✓" : "NO REPORT"}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded tracking-wide font-medium ${r.uatDone ? "bg-indigo-900/30 text-indigo-400" : "bg-gray-800 text-gray-500"}`}>
                                    {r.uatDone ? "UAT ✓" : "NO UAT"}
                                </span>
                            </div>
                        </div>
                        {/* Timeline bar */}
                        <WorkOrderTimeline timeline={r.timeline || []} currentStatus={r.status} />
                    </div>
                );
            }
        },
    ];

    const actions = (r) => {
        if (isViewer) return null;

        return (
            <div className="flex flex-col gap-1.5 items-end">
                {/* Admin: Edit + Delete */}
                {isAdmin && (
                    <div className="flex gap-1.5">
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
                            className="text-xs bg-gray-700 hover:bg-gray-600 px-2.5 py-1 rounded text-white transition"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => deleteOrder(r.id)}
                            className="text-xs bg-red-900/50 hover:bg-red-800 text-red-200 px-2.5 py-1 rounded border border-red-800 transition"
                        >
                            Del
                        </button>
                    </div>
                )}

                {/* All authorized: Update Status */}
                {r.status !== "COMPLETED" && getNextStatuses(r.status).length > 0 && (
                    <button
                        onClick={() => {
                            setAdvanceTarget(r);
                            setAdvanceStatus(getNextStatuses(r.status)[0]);
                            setAdvanceRemarks("");
                        }}
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded shadow transition"
                    >
                        Update Status
                    </button>
                )}

                {/* CMS: Upload Report */}
                {isCMS && ["WORK_DONE", "REPORT_SUBMITTED", "DEPLOYED"].includes(r.status) && (
                    <button
                        onClick={() => {
                            setUploadTarget(r);
                            setUploadFile(null);
                            setUploadProof(null);
                        }}
                        className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 rounded shadow transition"
                    >
                        Upload Report
                    </button>
                )}
            </div>
        );
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-light text-white">Assignment Desk</h2>
                {isAdmin && (
                    <button
                        onClick={() => {
                            setEditingOrd(null);
                            setFormOrd({ category: 1, contractPersonnelIds: [], status: "REQUESTED" });
                            setShowOrdForm(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded shadow-lg shadow-emerald-500/30 text-sm font-medium transition flex items-center gap-2"
                    >
                        <span>+</span> Direct Work Order
                    </button>
                )}
            </div>

            {/* ─── Advance Status Modal ─── */}
            {advanceTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setAdvanceTarget(null)}>
                    <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-medium text-white mb-1">Update Status</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            {advanceTarget.workOrderNo} — currently <span className="font-semibold text-gray-200">{STATUS_LABELS[advanceTarget.status]}</span>
                        </p>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">New Status</label>
                            <select
                                value={advanceStatus}
                                onChange={(e) => setAdvanceStatus(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            >
                                {getNextStatuses(advanceTarget.status).map(s => (
                                    <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Remarks (optional)</label>
                            <textarea
                                rows="2"
                                value={advanceRemarks}
                                onChange={(e) => setAdvanceRemarks(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-600"
                                placeholder="Add a note..."
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setAdvanceTarget(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition">
                                Cancel
                            </button>
                            <button onClick={advanceOrder} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded shadow-md font-medium transition">
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Upload Report Modal ─── */}
            {uploadTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setUploadTarget(null)}>
                    <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-medium text-white mb-1">Upload Report & Photos</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            {uploadTarget.workOrderNo}
                        </p>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Calibration Report (PDF)</label>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white file:mr-4 file:bg-gray-800 file:text-gray-300 file:border-0 file:px-3 file:py-1 file:rounded file:text-xs"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Proof Photo (Image)</label>
                            <input
                                ref={proofRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => setUploadProof(e.target.files?.[0] || null)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white file:mr-4 file:bg-gray-800 file:text-gray-300 file:border-0 file:px-3 file:py-1 file:rounded file:text-xs"
                            />
                        </div>
                        {uploadTarget.status === "WORK_DONE" && (
                            <p className="text-[11px] text-amber-400 mb-4">
                                ⓘ Uploading will auto-advance status to "Report Submitted"
                            </p>
                        )}
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setUploadTarget(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition">
                                Cancel
                            </button>
                            <button
                                onClick={uploadReport}
                                disabled={!uploadFile && !uploadProof}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded shadow-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Admin Edit Form ─── */}
            {showOrdForm && (
                <div className="bg-gray-800 border-l-4 border-emerald-500 p-6 rounded-lg mb-6 shadow-xl">
                    <h3 className="text-lg font-medium text-white mb-4">
                        {editingOrd ? "Edit Work Order" : "Create Work Order"}
                    </h3>
                    <form onSubmit={saveOrder} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Installation <span className="text-red-500">*</span></label>
                            <select required value={formOrd.installationId || ""} onChange={(e) => setFormOrd({ ...formOrd, installationId: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white">
                                <option value="">Select Installation</option>
                                {installations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category <span className="text-red-500">*</span></label>
                            <select required value={formOrd.category || 1} onChange={(e) => setFormOrd({ ...formOrd, category: parseInt(e.target.value) })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white">
                                {[1, 2, 3].map(c => <option key={c} value={c}>Category {c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                            <select value={formOrd.status || "REQUESTED"} onChange={(e) => setFormOrd({ ...formOrd, status: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white">
                                {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                            </select>
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">CMS Team Assignment</label>
                            <select multiple value={formOrd.contractPersonnelIds || []} onChange={(e) => setFormOrd({ ...formOrd, contractPersonnelIds: Array.from(e.target.selectedOptions, o => o.value) })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white h-24">
                                {personnel.filter(p => p.isActive).map((p) => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.designation})</option>
                                ))}
                            </select>
                            <div className="text-[10px] text-gray-500 mt-1">Hold Cmd/Ctrl to select multiple</div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">ONGC Engineer</label>
                            <select value={formOrd.ongcEngineerId || ""} onChange={(e) => setFormOrd({ ...formOrd, ongcEngineerId: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white">
                                <option value="">(None)</option>
                                {ongcPersonnel.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-full flex gap-4 mt-2 mb-2 p-3 bg-gray-900/50 rounded border border-gray-700">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                                <input type="checkbox" checked={formOrd.escortRequired || false} onChange={(e) => setFormOrd({ ...formOrd, escortRequired: e.target.checked })} className="rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500/30 w-4 h-4" />
                                Escort Required
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                                <input type="checkbox" checked={formOrd.uatDone || false} onChange={(e) => setFormOrd({ ...formOrd, uatDone: e.target.checked })} className="rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500/30 w-4 h-4" />
                                UAT Completed
                            </label>
                        </div>
                        <div className="col-span-full flex justify-end gap-3 mt-4 border-t border-gray-700 pt-4">
                            <button type="button" onClick={() => setShowOrdForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-lg shadow-emerald-500/30 font-medium">Save Assignment</button>
                        </div>
                    </form>
                </div>
            )}

            <DataTable
                title="Work Orders"
                data={orders}
                columns={cols}
                actions={!isViewer ? actions : undefined}
                filters={
                    <>
                        <select className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white" value={ordFilters.status} onChange={(e) => setOrdFilters({ ...ordFilters, status: e.target.value })}>
                            <option value="">All Statuses</option>
                            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                        <select className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white" value={ordFilters.category} onChange={(e) => setOrdFilters({ ...ordFilters, category: e.target.value })}>
                            <option value="">All Categories</option>
                            {[1, 2, 3].map(c => <option key={c} value={c}>Category {c}</option>)}
                        </select>
                    </>
                }
                onSearch={(q) => {
                    if (!q) { loadOrders(); return; }
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
