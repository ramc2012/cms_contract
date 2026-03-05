import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import DataTable from "../../components/DataTable";

export default function Personnel() {
    const { fetchApi } = useAuth();
    const { toast, confirm } = useToast();
    const [tab, setTab] = useState("CMS"); // CMS, ONGC, MANAGERS
    const [data, setData] = useState([]);

    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});

    useEffect(() => {
        loadData();
        // eslint-disable-next-line
    }, [tab]);

    async function loadData() {
        try {
            let endpoint = "/contract-personnel";
            if (tab === "ONGC") endpoint = "/ongc-personnel";
            if (tab === "MANAGERS") endpoint = "/managers";
            const result = await fetchApi(endpoint);
            setData(result);
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function saveData(e) {
        e.preventDefault();
        try {
            let endpoint = "/contract-personnel";
            if (tab === "ONGC") endpoint = "/ongc-personnel";
            if (tab === "MANAGERS") endpoint = "/managers";

            if (editing) {
                await fetchApi(`${endpoint}/${editing.id}`, {
                    method: "PUT",
                    body: form,
                });
                toast("Record updated", "success");
            } else {
                await fetchApi(endpoint, {
                    method: "POST",
                    body: form,
                });
                toast("Record added", "success");
            }
            setShowForm(false);
            loadData();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function deleteData(id) {
        const ok = await confirm("Delete this personnel record?");
        if (!ok) return;
        try {
            let endpoint = "/contract-personnel";
            if (tab === "ONGC") endpoint = "/ongc-personnel";
            if (tab === "MANAGERS") endpoint = "/managers";

            await fetchApi(`${endpoint}/${id}`, { method: "DELETE" });
            toast("Record deleted", "warn");
            loadData();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    // Column definitions per tab
    let cols = [];
    if (tab === "CMS") {
        cols = [
            { header: "Personnel Code", field: "personnelCode", className: "font-mono text-sm text-gray-400" },
            { header: "Name", field: "name", className: "font-medium text-gray-200" },
            { header: "Designation", field: "designation" },
            { header: "Phone", field: "phone" },
            {
                header: "Status", render: (r) => (
                    <span className={`px-2 py-1 rounded text-[10px] uppercase ${r.isActive ? "bg-green-900/30 text-green-400 border border-green-800" : "bg-red-900/30 text-red-400 border border-red-800"
                        }`}>
                        {r.isActive ? "Active" : "Inactive"}
                    </span>
                )
            },
        ];
    } else if (tab === "ONGC") {
        cols = [
            { header: "CPF No", field: "cpfNo", className: "font-mono text-sm text-gray-400" },
            { header: "Name", field: "name", className: "font-medium text-gray-200" },
            { header: "Designation", field: "designation" },
            { header: "Email", field: "email" },
        ];
    } else if (tab === "MANAGERS") {
        cols = [
            { header: "SAP No", field: "sapNo", className: "font-mono text-sm text-gray-400" },
            { header: "Name", field: "name", className: "font-medium text-gray-200" },
            { header: "Designation", field: "designation" },
            {
                header: "Phone/Email", render: (r) => (
                    <div className="text-xs">
                        <div>{r.phone || "-"}</div>
                        <div className="text-gray-500">{r.email || "-"}</div>
                    </div>
                )
            },
        ];
    }

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
                onClick={() => deleteData(r.id)}
                className="text-xs bg-red-900/50 hover:bg-red-800 text-red-200 px-2 py-1 rounded border border-red-800"
            >
                Del
            </button>
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <h2 className="text-2xl font-light text-white">Personnel Directory</h2>
                <button
                    onClick={() => {
                        setEditing(null);
                        setForm({ isActive: true });
                        setShowForm(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium shadow-lg shadow-blue-500/30"
                >
                    + Add {tab === "CMS" ? "CMS Staff" : tab === "ONGC" ? "ONGC Staff" : "Manager"}
                </button>
            </div>

            <div className="flex gap-2 mb-6">
                {[
                    { id: "CMS", label: "CMS Contract Team" },
                    { id: "ONGC", label: "ONGC Engineers" },
                    { id: "MANAGERS", label: "Installation Managers" }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id
                                ? "bg-gray-700 text-white shadow-inner"
                                : "bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {showForm && (
                <div className="bg-gray-800 border-l-4 border-blue-500 p-6 rounded-lg mb-6 shadow-xl">
                    <h3 className="text-lg font-medium text-white mb-4">
                        {editing ? "Edit Record" : "Add Record"}
                    </h3>
                    <form onSubmit={saveData} className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {tab === "CMS" && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Personnel Code *</label>
                                <input required value={form.personnelCode || ""} onChange={e => setForm({ ...form, personnelCode: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-mono" />
                            </div>
                        )}

                        {tab === "ONGC" && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">CPF No *</label>
                                <input required value={form.cpfNo || ""} onChange={e => setForm({ ...form, cpfNo: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-mono" />
                            </div>
                        )}

                        {tab === "MANAGERS" && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">SAP No *</label>
                                <input required value={form.sapNo || ""} onChange={e => setForm({ ...form, sapNo: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-mono" />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name *</label>
                            <input required value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Designation</label>
                            <input value={form.designation || ""} onChange={e => setForm({ ...form, designation: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone</label>
                            <input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
                        </div>

                        {(tab === "ONGC" || tab === "MANAGERS") && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                                <input type="email" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
                            </div>
                        )}

                        <div className="md:col-span-2 flex justify-end gap-3 mt-4 border-t border-gray-700 pt-4">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded shadow-md font-medium">Save</button>
                        </div>
                    </form>
                </div>
            )}

            <DataTable
                title={`${tab} Registry`}
                data={data}
                columns={cols}
                actions={actions}
                onSearch={(q) => {
                    if (!q) {
                        loadData();
                        return;
                    }
                    const t = q.toLowerCase();
                    setData((prev) => prev.filter(r =>
                        (r.name || "").toLowerCase().includes(t) ||
                        (r.personnelCode || "").toLowerCase().includes(t) ||
                        (r.cpfNo || "").toLowerCase().includes(t) ||
                        (r.sapNo || "").toLowerCase().includes(t)
                    ));
                }}
            />
        </div>
    );
}
