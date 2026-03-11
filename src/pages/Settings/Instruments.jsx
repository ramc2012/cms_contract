import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import DataTable from "../../components/DataTable";
import OverlayDialog from "../../components/OverlayDialog";
import { formatDate, toInputDate } from "../../utils/helpers";

export default function Instruments() {
    const { fetchApi } = useAuth();
    const { toast, confirm } = useToast();
    const [instruments, setInstruments] = useState([]);
    const [installations, setInstallations] = useState([]);
    const [services, setServices] = useState([]);

    const [filters, setFilters] = useState({
        installationId: "",
        serviceId: "",
        calStatus: "",
    });

    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});

    useEffect(() => {
        loadData();
        loadMeta();
        // eslint-disable-next-line
    }, [filters]);

    async function loadData() {
        try {
            const q = new URLSearchParams();
            if (filters.installationId) q.append("installationId", filters.installationId);
            if (filters.serviceId) q.append("serviceId", filters.serviceId);
            if (filters.calStatus) q.append("calStatus", filters.calStatus);
            const data = await fetchApi(`/instruments?${q}`);
            setInstruments(data);
        } catch (err) {
            toast(err.message, "error");
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

    async function saveInstrument(e) {
        e.preventDefault();
        try {
            const payload = { ...form };
            if (!payload.installationId) throw new Error("Installation required");
            if (!payload.serviceId) throw new Error("Service bound required");
            if (payload.calibrationFrequencyMonths) {
                payload.calibrationFrequencyMonths = parseInt(payload.calibrationFrequencyMonths);
            }

            if (editing) {
                await fetchApi(`/instruments/${editing.id}`, {
                    method: "PUT",
                    body: payload,
                });
                toast("Instrument updated", "success");
            } else {
                await fetchApi("/instruments", {
                    method: "POST",
                    body: payload,
                });
                toast("Instrument added", "success");
            }
            setShowForm(false);
            loadData();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function deleteInstrument(id) {
        const ok = await confirm("Delete this instrument and all linked requests/orders?");
        if (!ok) return;
        try {
            await fetchApi(`/instruments/${id}`, { method: "DELETE" });
            toast("Instrument deleted", "warn");
            loadData();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    const columns = [
        { header: "Tag No", field: "tagNo", className: "font-mono font-bold text-teal-400" },
        { header: "Code", field: "instrumentCode", className: "font-mono text-xs text-gray-500" },
        {
            header: "Details", render: (r) => (
                <div className="flex flex-col text-xs">
                    <span className="text-gray-300">🏢 {r.installation?.name}</span>
                    <span className="text-gray-500">Service: {r.service?.name}</span>
                    <span className="text-gray-500">Type: {r.equipmentType || "—"}</span>
                    {r.remarks && <span className="text-gray-600 block truncate max-w-xs">{r.remarks}</span>}
                </div>
            )
        },
        {
            header: "Calibration", render: (r) => {
                let cn = "bg-gray-800 text-gray-400 border-gray-700";
                if (r.calStatus === "CALIBRATED") cn = "bg-green-900 text-green-200 border-green-700";
                if (r.calStatus === "PENDING") cn = "bg-orange-900 text-orange-200 border-orange-700";
                if (r.calStatus === "OVERDUE") cn = "bg-red-900 text-red-200 border-red-700";

                return (
                    <div className="flex flex-col gap-1 w-max">
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${cn}`}>
                            {r.calStatus}
                        </span>
                        <div className="text-[10px] text-gray-500">
                            Freq: {r.calibrationFrequencyMonths}m
                        </div>
                    </div>
                );
            }
        },
        {
            header: "Dates", render: (r) => (
                <div className="text-xs space-y-1">
                    <div>
                        <span className="text-gray-500">Last:</span> <span className="text-gray-300">{formatDate(r.lastCalibration)}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Next:</span> <span className="text-gray-200 font-medium">{formatDate(r.nextCalibration)}</span>
                    </div>
                </div>
            )
        },
    ];

    const actions = (r) => (
        <div className="flex justify-end gap-2">
            <button
                onClick={() => {
                    setEditing(r);
                    setForm({
                        ...r,
                        lastCalibration: toInputDate(r.lastCalibration),
                        nextCalibration: toInputDate(r.nextCalibration),
                    });
                    setShowForm(true);
                }}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white"
            >
                Edit
            </button>
            <button
                onClick={() => deleteInstrument(r.id)}
                className="text-xs bg-red-900/50 hover:bg-red-800 text-red-200 px-2 py-1 rounded border border-red-800"
            >
                Del
            </button>
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-light text-white">Instruments Inventory</h2>
                <button
                    onClick={() => {
                        setEditing(null);
                        setForm({ isActive: true, calStatus: "CALIBRATED", workingStatus: "WORKING" });
                        setShowForm(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium shadow-lg shadow-blue-500/30"
                >
                    + Add Instrument
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Search instruments..."
                    value={filters.search || ""}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                />
                <select
                    value={filters.installationId || ""}
                    onChange={(e) => setFilters({ ...filters, installationId: e.target.value })}
                    className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                >
                    <option value="">All Installations</option>
                    {installations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <select
                    value={filters.serviceId || ""}
                    onChange={(e) => setFilters({ ...filters, serviceId: e.target.value })}
                    className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                >
                    <option value="">All Services</option>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            <OverlayDialog
                open={showForm}
                onClose={() => setShowForm(false)}
                title={editing ? "Edit Instrument" : "Add Instrument"}
                wide
            >
                    <form onSubmit={saveInstrument} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tag No *</label>
                            <input
                                required
                                value={form.tagNo || ""}
                                onChange={(e) => setForm({ ...form, tagNo: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Instrument Code</label>
                            <input
                                value={form.instrumentCode || ""}
                                onChange={(e) => setForm({ ...form, instrumentCode: e.target.value })}
                                placeholder="Auto-generated"
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Equipment Type *</label>
                            <input
                                required
                                value={form.equipmentType || ""}
                                onChange={(e) => setForm({ ...form, equipmentType: e.target.value })}
                                placeholder="e.g. Pressure Transmitter"
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            />
                        </div>

                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
                                <input
                                    type="checkbox"
                                    checked={form.isActive !== false}
                                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                    className="rounded bg-gray-900 border-gray-700 text-blue-600 w-5 h-5"
                                />
                                Active
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Installation *</label>
                            <select
                                required
                                value={form.installationId || ""}
                                onChange={(e) => setForm({ ...form, installationId: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            >
                                <option value="">Select Installation</option>
                                {installations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Service Type</label>
                            <select
                                value={form.serviceId || ""}
                                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            >
                                <option value="">Select Service</option>
                                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Make</label>
                            <input
                                value={form.make || ""}
                                onChange={(e) => setForm({ ...form, make: e.target.value })}
                                placeholder="Manufacturer"
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Model</label>
                            <input
                                value={form.model || ""}
                                onChange={(e) => setForm({ ...form, model: e.target.value })}
                                placeholder="Model No"
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Serial No</label>
                            <input
                                value={form.serialNo || ""}
                                onChange={(e) => setForm({ ...form, serialNo: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Working Status</label>
                            <select
                                value={form.workingStatus || "WORKING"}
                                onChange={(e) => setForm({ ...form, workingStatus: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            >
                                <option value="WORKING">WORKING</option>
                                <option value="NOT_WORKING">NOT WORKING</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cal. Status</label>
                            <select
                                value={form.calStatus || "CALIBRATED"}
                                onChange={(e) => setForm({ ...form, calStatus: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            >
                                <option value="CALIBRATED">CALIBRATED</option>
                                <option value="PENDING">PENDING</option>
                                <option value="OVERDUE">OVERDUE</option>
                            </select>
                        </div>

                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
                                <input
                                    type="checkbox"
                                    checked={form.scadaConnected === true}
                                    onChange={(e) => setForm({ ...form, scadaConnected: e.target.checked })}
                                    className="rounded bg-gray-900 border-gray-700 text-blue-600 w-5 h-5"
                                />
                                SCADA Connected
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Last Cal Date</label>
                            <input
                                type="date"
                                value={form.lastCalibration || ""}
                                onChange={(e) => setForm({ ...form, lastCalibration: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Next Cal Date</label>
                            <input
                                type="date"
                                value={form.nextCalibration || ""}
                                onChange={(e) => setForm({ ...form, nextCalibration: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            />
                        </div>

                        <div className="md:col-span-4 flex justify-end gap-3 mt-4 border-t border-gray-700 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium shadow-md shadow-blue-500/20"
                            >
                                Save
                            </button>
                        </div>
                    </form>
            </OverlayDialog>

            <DataTable
                title="Instruments"
                data={instruments}
                columns={columns}
                actions={actions}
                filters={
                    <>
                        <select
                            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white"
                            value={filters.installationId}
                            onChange={(e) => setFilters({ ...filters, installationId: e.target.value })}
                        >
                            <option value="">All Installations</option>
                            {installations.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                        <select
                            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white"
                            value={filters.serviceId}
                            onChange={(e) => setFilters({ ...filters, serviceId: e.target.value })}
                        >
                            <option value="">All Services</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select
                            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white"
                            value={filters.calStatus}
                            onChange={(e) => setFilters({ ...filters, calStatus: e.target.value })}
                        >
                            <option value="">All Statuses</option>
                            {["CALIBRATED", "PENDING", "OVERDUE"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </>
                }
                onSearch={(q) => {
                    if (!q) {
                        loadData();
                        return;
                    }
                    const t = q.toLowerCase();
                    setInstruments((prev) => prev.filter(r =>
                        (r.tagNo || "").toLowerCase().includes(t) ||
                        (r.instrumentCode || "").toLowerCase().includes(t) ||
                        (r.installation?.name || "").toLowerCase().includes(t)
                    ));
                }}
            />
        </div>
    );
}
