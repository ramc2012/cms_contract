import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import { slugToken } from "../utils/helpers";

export default function Reports() {
    const { role, fetchApi } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("review");

    // Review Tab State
    const [pendingReports, setPendingReports] = useState([]);

    // Billing Tab State
    const [billingMonth, setBillingMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const [billingSummary, setBillingSummary] = useState(null);

    const canApprove = role === "ONGC_ADMIN" || role === "ONGC_ENGINEER";

    useEffect(() => {
        if (activeTab === "review") loadPendingReports();
        else if (activeTab === "billing") loadBillingSummary();
        // eslint-disable-next-line
    }, [activeTab, billingMonth]);

    async function loadPendingReports() {
        try {
            const data = await fetchApi("/documents?category=CALIBRATION&status=PENDING_REVIEW");
            setPendingReports(data);
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function loadBillingSummary() {
        try {
            const data = await fetchApi(`/reports/billing?month=${billingMonth}`);
            setBillingSummary(data);
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function approveReport(id) {
        try {
            await fetchApi(`/documents/${id}/status`, {
                method: "PUT",
                body: { status: "APPROVED" }
            });
            toast("Report approved.", "success");
            loadPendingReports();
        } catch (err) {
            toast(err.message, "error");
        }
    }

    async function downloadFile(id, name) {
        try {
            const resp = await fetch(`/api/documents/${id}/download`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("fms_token")}` },
            });
            if (!resp.ok) throw new Error("Could not download file");
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = name;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            toast(err.message, "error");
        }
    }

    const reviewColumns = [
        { header: "Report Name", field: "name", className: "font-mono font-medium text-emerald-400" },
        { header: "Work Order", render: r => r.workOrder?.workOrderNo || "N/A" },
        { header: "Uploaded By", render: r => r.uploadedByUser?.displayName || "System" },
        { header: "Date", render: r => new Date(r.createdAt).toLocaleDateString() },
    ];

    const reviewActions = (r) => (
        <div className="flex justify-end gap-2">
            <button
                onClick={() => downloadFile(r.id, r.name)}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white"
            >
                Preview
            </button>
            {canApprove && (
                <button
                    onClick={() => approveReport(r.id)}
                    className="text-xs bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 px-2 py-1 rounded border border-emerald-800"
                >
                    Approve
                </button>
            )}
        </div>
    );

    const billingColumns = [
        { header: "Work Order", field: "workOrderNo", className: "font-mono" },
        { header: "Date Approved", render: r => new Date(r.createdAt).toLocaleDateString() },
        { header: "Installation", render: r => r.installation ? slugToken(r.installation) : "N/A" },
        { header: "Instrument", render: r => r.instrumentTag ? slugToken(r.instrumentTag) : "N/A" },
        { header: "Category", render: r => `Cat ${r.category || "?"}` },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-light text-white tracking-widest uppercase">Reports & Billing</h1>
            </div>

            <div className="flex gap-4 border-b border-gray-800">
                <button
                    onClick={() => setActiveTab("review")}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === "review"
                        ? "text-blue-400 border-b-2 border-blue-500"
                        : "text-gray-500 hover:text-gray-300"
                        }`}
                >
                    Pending Review
                    {pendingReports.length > 0 && (
                        <span className="ml-2 bg-blue-900/50 text-blue-300 py-0.5 px-2 rounded-full text-xs">
                            {pendingReports.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("billing")}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === "billing"
                        ? "text-blue-400 border-b-2 border-blue-500"
                        : "text-gray-500 hover:text-gray-300"
                        }`}
                >
                    Billing Summaries
                </button>
            </div>

            {activeTab === "review" && (
                <DataTable
                    title="Calibration Reports Pending Approval"
                    data={pendingReports}
                    columns={reviewColumns}
                    actions={reviewActions}
                    searchPlaceholder="Search reports..."
                />
            )}

            {activeTab === "billing" && (
                <div className="space-y-6">
                    <div className="flex gap-4 items-end bg-gray-800/50 p-4 rounded-lg border border-gray-800">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Select Month</label>
                            <input
                                type="month"
                                value={billingMonth}
                                onChange={e => setBillingMonth(e.target.value)}
                                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white h-10"
                            />
                        </div>
                    </div>

                    {billingSummary && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <StatCard title="Total Approved Jobs" value={billingSummary.totalApproved} />
                                {Object.entries(billingSummary.breakdown)
                                    .filter(([_, count]) => count > 0)
                                    .map(([cat, count]) => (
                                        <StatCard key={cat} title={`Category ${cat} Jobs`} value={count} />
                                    ))}
                            </div>

                            <DataTable
                                title={`Billing Line Items - ${billingMonth}`}
                                data={billingSummary.data}
                                columns={billingColumns}
                                searchPlaceholder="Search work orders..."
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
