import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import DataTable from "../../components/DataTable";
import OverlayDialog from "../../components/OverlayDialog";

const ROLES = [
    { value: "ONGC_ADMIN", label: "ONGC Admin" },
    { value: "ONGC_ENGINEER", label: "ONGC Engineer" },
    { value: "CMS_COORDINATOR", label: "CMS Coordinator" },
    { value: "CMS_TECHNICIAN", label: "CMS Technician" },
    { value: "INSTALLATION_MANAGER", label: "Installation Manager" },
    { value: "READ_ONLY", label: "Read Only" },
];

const ROLE_COLORS = {
    ONGC_ADMIN: "bg-purple-900/40 text-purple-300 border-purple-700",
    ONGC_ENGINEER: "bg-blue-900/40 text-blue-300 border-blue-700",
    CMS_COORDINATOR: "bg-teal-900/40 text-teal-300 border-teal-700",
    CMS_TECHNICIAN: "bg-cyan-900/40 text-cyan-300 border-cyan-700",
    INSTALLATION_MANAGER: "bg-orange-900/40 text-orange-300 border-orange-700",
    READ_ONLY: "bg-gray-800/40 text-gray-400 border-gray-700",
};

export default function UserManagement() {
    const { fetchApi, role: currentRole, user: currentUser } = useAuth();
    const { toast, confirm } = useToast();
    const isAdmin = currentRole === "ONGC_ADMIN";

    // Admin state
    const [users, setUsers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});

    // Self-service state
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [pwLoading, setPwLoading] = useState(false);

    useEffect(() => {
        if (isAdmin) loadUsers();
        // eslint-disable-next-line
    }, []);

    async function loadUsers() {
        try {
            const data = await fetchApi("/auth/users");
            setUsers(data);
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function saveUser(e) {
        e.preventDefault();
        try {
            if (editing) {
                const body = { ...form };
                // Only send newPassword if the admin typed one
                if (!body.newPassword) delete body.newPassword;
                await fetchApi(`/auth/users/${editing.id}`, {
                    method: "PUT",
                    body,
                });
                toast("User updated", "success");
            } else {
                if (!form.password) {
                    toast("Password is required for new users", "error");
                    return;
                }
                await fetchApi("/auth/users", {
                    method: "POST",
                    body: form,
                });
                toast("User created", "success");
            }
            setShowForm(false);
            loadUsers();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function toggleActive(user) {
        const action = user.isActive ? "deactivate" : "activate";
        const ok = await confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user "${user.displayName}"?`);
        if (!ok) return;
        try {
            await fetchApi(`/auth/users/${user.id}`, {
                method: "PUT",
                body: { isActive: !user.isActive },
            });
            toast(`User ${action}d`, "success");
            loadUsers();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function changeOwnPassword(e) {
        e.preventDefault();
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            toast("New passwords do not match", "error");
            return;
        }
        if (pwForm.newPassword.length < 6) {
            toast("Password must be at least 6 characters", "error");
            return;
        }
        setPwLoading(true);
        try {
            await fetchApi("/auth/change-password", {
                method: "PUT",
                body: {
                    currentPassword: pwForm.currentPassword,
                    newPassword: pwForm.newPassword,
                },
            });
            toast("Password changed successfully", "success");
            setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            toast(err.message, "error");
        } finally {
            setPwLoading(false);
        }
    }

    // helpers
    function linkedName(u) {
        if (u.ongcPersonnel) return u.ongcPersonnel.name;
        if (u.contractPersonnel) return u.contractPersonnel.name;
        if (u.manager) return u.manager.name;
        return "—";
    }

    /* ── Admin columns ── */
    const columns = [
        {
            header: "User",
            render: (r) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-200">{r.displayName}</span>
                    <span className="text-xs text-gray-500 font-mono">{r.username}</span>
                </div>
            ),
        },
        {
            header: "Role",
            render: (r) => (
                <span className={`px-2 py-1 rounded text-[10px] uppercase border ${ROLE_COLORS[r.role] || ROLE_COLORS.READ_ONLY}`}>
                    {ROLES.find(ro => ro.value === r.role)?.label || r.role}
                </span>
            ),
        },
        {
            header: "Linked Personnel",
            render: (r) => (
                <span className="text-xs text-gray-400">{linkedName(r)}</span>
            ),
        },
        {
            header: "Status",
            render: (r) => (
                <span className={`px-2 py-1 rounded text-[10px] uppercase ${r.isActive ? "bg-green-900/30 text-green-400 border border-green-800" : "bg-red-900/30 text-red-400 border border-red-800"}`}>
                    {r.isActive ? "Active" : "Inactive"}
                </span>
            ),
        },
    ];

    const actions = (r) => (
        <div className="flex justify-end gap-2">
            <button
                onClick={() => {
                    setEditing(r);
                    setForm({
                        displayName: r.displayName,
                        role: r.role,
                        isActive: r.isActive,
                        managerId: r.managerId || "",
                        contractPersonnelId: r.contractPersonnelId || "",
                        ongcPersonnelId: r.ongcPersonnelId || "",
                    });
                    setShowForm(true);
                }}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white"
            >
                Edit
            </button>
            <button
                onClick={() => toggleActive(r)}
                className={`text-xs px-2 py-1 rounded border ${r.isActive ? "bg-red-900/50 hover:bg-red-800 text-red-200 border-red-800" : "bg-green-900/50 hover:bg-green-800 text-green-200 border-green-800"}`}
            >
                {r.isActive ? "Deactivate" : "Activate"}
            </button>
        </div>
    );

    /* ── Non-admin: show password change only ── */
    if (!isAdmin) {
        // READ_ONLY users can't change password either
        if (currentRole === "READ_ONLY") {
            return (
                <div className="text-center py-12">
                    <p className="text-gray-400 text-sm">Password management is not available for read-only accounts.</p>
                </div>
            );
        }

        return (
            <div>
                <h2 className="text-2xl font-light text-white mb-6">Change Password</h2>
                <div className="max-w-md">
                    <div className="bg-gray-800 border-l-4 border-teal-500 p-6 rounded-lg shadow-xl">
                        <form onSubmit={changeOwnPassword} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Current Password *</label>
                                <input
                                    required
                                    type="password"
                                    value={pwForm.currentPassword}
                                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">New Password * <span className="normal-case text-gray-600">(min 6 chars)</span></label>
                                <input
                                    required
                                    type="password"
                                    value={pwForm.newPassword}
                                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Confirm New Password *</label>
                                <input
                                    required
                                    type="password"
                                    value={pwForm.confirmPassword}
                                    onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={pwLoading}
                                className="mt-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded font-medium shadow-md disabled:opacity-50"
                            >
                                {pwLoading ? "Changing…" : "Change Password"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Admin view ── */
    return (
        <div>
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <h2 className="text-2xl font-light text-white">User Management</h2>
                <button
                    onClick={() => {
                        setEditing(null);
                        setForm({ isActive: true, role: "READ_ONLY" });
                        setShowForm(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium shadow-lg shadow-blue-500/30"
                >
                    + Add User
                </button>
            </div>

            <OverlayDialog
                open={showForm}
                onClose={() => setShowForm(false)}
                title={editing ? `Edit User — ${editing.username}` : "Add User"}
            >
                <form onSubmit={saveUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!editing && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Username *</label>
                            <input
                                required
                                value={form.username || ""}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-mono"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Display Name *</label>
                        <input
                            required
                            value={form.displayName || ""}
                            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{editing ? "Reset Password" : "Password *"}</label>
                        <input
                            type="password"
                            required={!editing}
                            value={editing ? (form.newPassword || "") : (form.password || "")}
                            onChange={(e) => setForm({
                                ...form,
                                [editing ? "newPassword" : "password"]: e.target.value,
                            })}
                            placeholder={editing ? "Leave blank to keep" : ""}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role *</label>
                        <select
                            required
                            value={form.role || "READ_ONLY"}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                        >
                            {ROLES.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
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
                            {editing ? "Update" : "Create"}
                        </button>
                    </div>
                </form>
            </OverlayDialog>

            <DataTable
                title="Users"
                data={users}
                columns={columns}
                actions={actions}
                onSearch={(q) => {
                    if (!q) {
                        loadUsers();
                        return;
                    }
                    const t = q.toLowerCase();
                    setUsers((prev) => prev.filter(r =>
                        (r.displayName || "").toLowerCase().includes(t) ||
                        (r.username || "").toLowerCase().includes(t) ||
                        (r.role || "").toLowerCase().includes(t)
                    ));
                }}
            />
        </div>
    );
}
