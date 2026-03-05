import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

/* ─── ONGC Brand SVG Logo ──────────────────────────────────────────────── */
function OngcLogo({ className = "" }) {
    return (
        <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="47" stroke="#00843D" strokeWidth="2.5" fill="#00843D" fillOpacity="0.08" />
            <circle cx="50" cy="50" r="40" stroke="#00843D" strokeWidth="0.8" strokeOpacity="0.35" fill="none" />
            <path d="M50 18 C50 18 28 44 28 60 C28 72.15 37.85 82 50 82 C62.15 82 72 72.15 72 60 C72 44 50 18 50 18Z" fill="#00843D" />
            <path d="M50 28 C50 28 38 47 38 59 C38 66 43.48 72 50 72 C56.52 72 62 66 62 59 C62 47 50 28 50 28Z" fill="#005c2b" />
            <path d="M43 46 C42 50 41.5 55 42.5 60" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
            <path d="M50 14 C50 14 46 20 46 24 C46 27.3 47.8 30 50 30 C52.2 30 54 27.3 54 24 C54 20 50 14 50 14Z" fill="#FF6B00" opacity="0.9" />
        </svg>
    );
}

/* ─── Login Page ──────────────────────────────────────────────────────── */
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
        } catch (err) {
            setError(err.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#070e1a] via-[#0b1628] to-[#071020] relative overflow-hidden">

            {/* Background grid */}
            <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage:
                        "linear-gradient(#00843D 1px, transparent 1px), linear-gradient(90deg, #00843D 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                }}
            />

            {/* Ambient glow blobs */}
            <div className="absolute top-1/4 -left-24 w-96 h-96 bg-green-900/25 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-green-900/20 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Card container — centred */}
            <div className="relative z-10 w-full max-w-sm mx-4">

                {/* Brand header */}
                <div className="flex flex-col items-center mb-7">
                    <OngcLogo className="w-20 h-20 mb-4 drop-shadow-lg" />
                    <div className="text-center">
                        <h1 className="text-3xl font-black tracking-[0.18em] text-white uppercase">
                            ONGC
                        </h1>
                        <p className="text-[10px] font-semibold tracking-widest text-green-500 uppercase mt-0.5">
                            Oil and Natural Gas Corporation
                        </p>
                    </div>
                    {/* Live badge */}
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-950/60 border border-green-800/40 text-green-400 text-[10px] font-medium tracking-wider uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        FMS Track · GEMC-511687740481810
                    </div>
                </div>

                {/* Login card */}
                <div className="bg-[#0d1626]/95 backdrop-blur-2xl border border-gray-800/70 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
                    {/* Top accent stripe — ONGC green */}
                    <div className="h-[3px] bg-gradient-to-r from-green-700 via-green-500 to-emerald-400" />

                    <div className="px-8 py-7">
                        <div className="mb-6 text-center">
                            <h2 className="text-sm font-semibold text-white tracking-wide">
                                Calibration Contract Portal
                            </h2>
                            <p className="text-[11px] text-gray-500 mt-1">
                                ISG Mehsana &nbsp;·&nbsp; Authorized personnel only
                            </p>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="mb-5 p-3 bg-red-900/20 border border-red-800/40 text-red-400 text-xs rounded-lg flex items-start gap-2.5">
                                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Username */}
                            <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                                    Username
                                </label>
                                <input
                                    required
                                    autoFocus
                                    autoComplete="username"
                                    className="w-full bg-[#131f35] border border-gray-700/70 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-600 transition-all text-sm placeholder-gray-600"
                                    placeholder="Enter username"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    disabled={loading}
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    className="w-full bg-[#131f35] border border-gray-700/70 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-600 transition-all text-sm placeholder-gray-600 tracking-widest"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    disabled={loading}
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-1 bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-emerald-500 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-green-900/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Authenticating…
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                        Sign In
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer strip */}
                    <div className="px-8 py-3 bg-[#060d1a]/80 border-t border-gray-800/50 flex items-center justify-between">
                        <span className="text-[10px] text-gray-600">37-Month Contract</span>
                        <span className="text-[10px] text-gray-600">Feb 2026 – Mar 2029</span>
                    </div>
                </div>

                <p className="text-center text-[10px] text-gray-700 mt-5 tracking-wide">
                    Unauthorized access is prohibited &nbsp;·&nbsp; All sessions are audited
                </p>
            </div>
        </div>
    );
}
