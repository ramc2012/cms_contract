import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import DataTable from "../../components/DataTable";

export default function Installations() {
    const { fetchApi } = useAuth();
    const { toast, confirm } = useToast();
    const [installations, setInstallations] = useState([]);
    const [managers, setManagers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});

    useEffect(() => {
        loadData();
        // eslint-disable-next-line
    }, []);

    async function loadData() {
        try {
            const [insts, mgrs] = await Promise.all([
                fetchApi("/installations"),
                fetchApi("/installation-managers"),
            ]);
            setInstallations(insts);
            setManagers(mgrs);
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function saveInstallation(e) {
        e.preventDefault();
        try {
            if (editing) {
                await fetchApi(`/installations/${editing.id}`, {
                    method: "PUT",
                    body: form,
                });
                toast("Installation updated", "success");
            } else {
                await fetchApi("/installations", {
                    method: "POST",
                    body: form,
                });
                toast("Installation added", "success");
            }
            setShowForm(false);
            loadData();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function deleteInstallation(id) {
        const ok = await confirm("Delete this installation and all linked records?");
        if (!ok) return;
        try {
            await fetchApi(`/installations/${id}`, { method: "DELETE" });
            toast("Installation deleted", "warn");
            loadData();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    const columns = [
        { header: "Name", field: "name", className: "font-semibold text-gray-200" },
        { header: "Division", field: "division" },
        { header: "Type", field: "type" },
        {
            header: "Managers", render: (r) => (
                <div className="flex flex-col gap-1 text-xs">
                    {r.managerAssignments && r.managerAssignments.length > 0 ? (
                        r.managerAssignments.map((a) => (
                            <span key={a.id} className="text-gray-400">
                                {a.manager.name} <span className="text-gray-500">({a.manager.sapNo})</span>
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-600 italic">None</span>
                    )}
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
                        managerIds: r.managerAssignments?.map(a => a.managerId) || []
                    });
                    setShowForm(true);
                }}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white"
            >
                Edit
            </button>
            <button
                onClick={() => deleteInstallation(r.id)}
                className="text-xs bg-red-900/50 hover:bg-red-800 text-red-200 px-2 py-1 rounded border border-red-800"
            >
                Del
            </button>
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-light text-white">Installations</h2>
                <button
                    onClick={() => {
                        setEditing(null);
                        setForm({ type: "ONSHORE", division: "MUMBAI" });
                        setShowForm(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium shadow-lg shadow-blue-500/30"
                >
                    + Add Installation
                </button>
            </div>

            {showForm && (
                <div className="bg-gray-800 border-l-4 border-blue-500 p-6 rounded-lg mb-6 shadow-xl">
                    <h3 className="text-lg font-medium text-white mb-4">
                        {editing ? "Edit Installation" : "Add Installation"}
                    </h3>
                    <form onSubmit={saveInstallation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name *</label>
                            <input
                                required
                                value={form.name || ""}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Division *</label>
                            <select
                                required
                                value={form.division || "MUMBAI"}
                                onChange={(e) => setForm({ ...form, division: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            >
                                <option value="MUMBAI">MUMBAI</option>
                                <option value="GUJARAT">GUJARAT</option>
                                <option value="ASSAM">ASSAM</option>
                                <option value="OTHER">OTHER</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Type *</label>
                            <select
                                required
                                value={form.type || "ONSHORE"}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            >
                                <option value="ONSHORE">ONSHORE</option>
                                <option value="OFFSHORE">OFFSHORE</option>
                                <option value="VESSEL">VESSEL</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Assigned Managers</label>
                            <select
                                multiple
                                value={form.managerIds || []}
                                onChange={(e) => {
                                    const vals = Array.from(e.target.selectedOptions, option => option.value);
                                    setForm({ ...form, managerIds: vals });
                                }}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white h-24"
                            >
                                {managers.filter(m => m.isActive).map((m) => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                            <div className="text-[10px] text-gray-500 mt-1">Hold Cmd/Ctrl to multi-select</div>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 mt-4 border-t border-gray-700 pt-4">
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
                </div>
            )}

            <DataTable
                title="Active Installations"
                data={installations}
                columns={columns}
                actions={actions}
                onSearch={(q) => {
                    if (!q) {
                        loadData();
                        return;
                    }
                    const t = q.toLowerCase();
                    setInstallations((prev) => prev.filter(r =>
                        (r.name || "").toLowerCase().includes(t) ||
                        (r.division || "").toLowerCase().includes(t)
                    ));
                }}
            />
        </div>
    );
}
