import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const { login } = useAuth();
    const [form, setForm] = useState({ username: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(form.username, form.password);
            // Navigation happens dynamically via App.jsx when user is set
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-[#0b1120] font-sans">
            {/* Background glow effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-[480px] bg-[#0f172a]/80 backdrop-blur-xl border border-gray-800 p-10 rounded-2xl shadow-2xl relative z-10">
                <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                    ONGC FMS Track
                </h1>
                <p className="text-sm font-medium text-gray-400 mb-8 border-b border-gray-800 pb-4">
                    Production-Parity Calibration Contract Management
                </p>

                {error && (
                    <div className="mb-6 p-3 bg-red-900/20 border border-red-900/50 text-red-400 text-sm rounded-lg flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                                Username
                            </label>
                            <input
                                required
                                className="w-full bg-[#1e293b] border border-gray-700 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm shadow-inner"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                className="w-full bg-[#1e293b] border border-gray-700 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono tracking-widest shadow-inner"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            "Sign in"
                        )}
                    </button>
                </form>

                <div className="mt-8 text-xs text-gray-600 text-center">
                    ONGC FMS Track · GEMC-511687740481810
                </div>
            </div>
        </div>
    );
}
