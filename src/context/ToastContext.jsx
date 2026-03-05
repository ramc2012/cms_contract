import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastContext = createContext(null);

let _nextId = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});

    const dismiss = useCallback((id) => {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = useCallback(
        (message, type = "info", duration = 4000) => {
            const id = ++_nextId;
            setToasts((prev) => [...prev, { id, message, type }]);
            if (duration > 0) {
                timers.current[id] = setTimeout(() => dismiss(id), duration);
            }
            return id;
        },
        [dismiss]
    );

    const confirm = useCallback(
        (message) =>
            new Promise((resolve) => {
                const id = ++_nextId;
                setToasts((prev) => [...prev, { id, message, type: "confirm", resolve }]);
            }),
        []
    );

    const resolveConfirm = useCallback(
        (id, value) => {
            setToasts((prev) => {
                const t = prev.find((x) => x.id === id);
                if (t?.resolve) t.resolve(value);
                return prev.filter((x) => x.id !== id);
            });
        },
        []
    );

    const value = {
        toast,
        confirm,
        success: (msg, dur) => toast(msg, "success", dur),
        error: (msg, dur) => toast(msg, "error", dur ?? 6000),
        warn: (msg, dur) => toast(msg, "warn", dur),
        info: (msg, dur) => toast(msg, "info", dur),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} onConfirm={resolveConfirm} />
        </ToastContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}

/* ── Toast container & individual toast ── */

const STYLES = {
    success: {
        bar: "bg-emerald-500",
        icon: "✓",
        iconBg: "bg-emerald-900/40 text-emerald-400 border-emerald-700",
        border: "border-emerald-800/60",
        text: "text-emerald-200",
    },
    error: {
        bar: "bg-red-500",
        icon: "✕",
        iconBg: "bg-red-900/40 text-red-400 border-red-700",
        border: "border-red-800/60",
        text: "text-red-200",
    },
    warn: {
        bar: "bg-amber-500",
        icon: "⚠",
        iconBg: "bg-amber-900/40 text-amber-400 border-amber-700",
        border: "border-amber-800/60",
        text: "text-amber-200",
    },
    info: {
        bar: "bg-blue-500",
        icon: "i",
        iconBg: "bg-blue-900/40 text-blue-400 border-blue-700",
        border: "border-blue-800/60",
        text: "text-blue-200",
    },
    confirm: {
        bar: "bg-indigo-500",
        icon: "?",
        iconBg: "bg-indigo-900/40 text-indigo-400 border-indigo-700",
        border: "border-indigo-800/60",
        text: "text-indigo-100",
    },
};

function ToastContainer({ toasts, onDismiss, onConfirm }) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((t) => (
                <Toast
                    key={t.id}
                    toast={t}
                    onDismiss={onDismiss}
                    onConfirm={onConfirm}
                />
            ))}
        </div>
    );
}

function Toast({ toast: t, onDismiss, onConfirm }) {
    const s = STYLES[t.type] || STYLES.info;
    const isConfirm = t.type === "confirm";

    return (
        <div
            className={`pointer-events-auto relative overflow-hidden rounded-lg border ${s.border} bg-[#0f172a]/95 backdrop-blur-sm shadow-2xl shadow-black/40 animate-slide-in`}
        >
            {/* Accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />

            <div className="flex items-start gap-3 px-4 py-3 pl-5">
                <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${s.iconBg}`}>
                    {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug ${s.text}`}>{t.message}</p>
                    {isConfirm && (
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => onConfirm(t.id, true)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-medium transition-colors"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => onConfirm(t.id, false)}
                                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
                {!isConfirm && (
                    <button
                        onClick={() => onDismiss(t.id)}
                        className="text-gray-600 hover:text-gray-400 transition-colors mt-0.5 flex-shrink-0 text-sm leading-none"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
}
