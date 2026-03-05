import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import DataTable from "../../components/DataTable";

export default function Services() {
    const { fetchApi } = useAuth();
    const { toast, confirm } = useToast();
    const [services, setServices] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});

    useEffect(() => {
        loadServices();
        // eslint-disable-next-line
    }, []);

    async function loadServices() {
        try {
            const data = await fetchApi("/services");
            setServices(data);
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function saveService(e) {
        e.preventDefault();
        try {
            if (editing) {
                await fetchApi(`/services/${editing.id}`, {
                    method: "PUT",
                    body: form,
                });
                toast("Service updated", "success");
            } else {
                await fetchApi("/services", {
                    method: "POST",
                    body: form,
                });
                toast("Service added", "success");
            }
            setShowForm(false);
            loadServices();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function deleteService(id) {
        const ok = await confirm("Delete this service?");
        if (!ok) return;
        try {
            await fetchApi(`/services/${id}`, { method: "DELETE" });
            toast("Service deleted", "warn");
            loadServices();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    const columns = [
        { header: "Code", field: "serviceCode", className: "font-mono font-medium text-blue-400" },
        { header: "Name", field: "name" },
        { header: "Description", field: "description", className: "max-w-xs truncate" },
    ];

    const actions = (r) => (
        <div className="flex justify-end gap-2">
            <button
                onClick={() => {
                    setEditing(r);
                    setForm(r);
                    setShowForm(true);
                }}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white"
            >
                Edit
            </button>
            <button
                onClick={() => deleteService(r.id)}
                className="text-xs bg-red-900/50 hover:bg-red-800 text-red-200 px-2 py-1 rounded border border-red-800"
            >
                Del
            </button>
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-light text-white">Services Catalog</h2>
                <button
                    onClick={() => {
                        setEditing(null);
                        setForm({});
                        setShowForm(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium shadow-lg shadow-blue-500/30"
                >
                    + Add Service
                </button>
            </div>

            {showForm && (
                <div className="bg-gray-800 border-l-4 border-blue-500 p-6 rounded-lg mb-6 shadow-xl">
                    <h3 className="text-lg font-medium text-white mb-4">
                        {editing ? "Edit Service" : "Add Service"}
                    </h3>
                    <form onSubmit={saveService} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Code *</label>
                            <input
                                required
                                value={form.serviceCode || ""}
                                onChange={(e) => setForm({ ...form, serviceCode: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name *</label>
                            <input
                                required
                                value={form.name || ""}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                            <textarea
                                value={form.description || ""}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white h-20"
                            />
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 mt-2 border-t border-gray-700 pt-4">
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
                title="Services"
                data={services}
                columns={columns}
                actions={actions}
                onSearch={(q) => {
                    if (!q) {
                        loadServices();
                        return;
                    }
                    const t = q.toLowerCase();
                    setServices((prev) => prev.filter(r =>
                        (r.serviceCode || "").toLowerCase().includes(t) ||
                        (r.name || "").toLowerCase().includes(t)
                    ));
                }}
            />
        </div>
    );
}
