import { Router } from "express";
import {
    CalibrationStatus,
    DeploymentMode,
    Division,
    DocumentCategory,
    DocumentStatus,
    Priority,
    WorkOrderStatus,
    WorkRequestStatus,
    WorkingStatus,
    DocumentStatus as DS,
    Role,
} from "@prisma/client";
import prisma from "../lib/prisma.js";
import { withAsync } from "../lib/helpers.js";
import { CONTRACT_CONTEXT, STORAGE_MODE } from "../config.js";

const router = Router();

router.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), storage: STORAGE_MODE });
});

router.get(
    "/meta",
    withAsync(async (req, res) => {
        res.json({
            contract: CONTRACT_CONTEXT,
            enums: {
                division: Object.values(Division),
                workingStatus: Object.values(WorkingStatus),
                calibrationStatus: Object.values(CalibrationStatus),
                priority: Object.values(Priority),
                workRequestStatus: Object.values(WorkRequestStatus),
                workOrderStatus: Object.values(WorkOrderStatus),
                deploymentMode: Object.values(DeploymentMode),
                documentCategory: Object.values(DocumentCategory),
                documentStatus: Object.values(DocumentStatus),
                role: Object.values(Role),
            },
        });
    })
);

router.get(
    "/dashboard",
    withAsync(async (req, res) => {
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

        // Build last-6-months range for trend data
        const monthBuckets = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            monthBuckets.push(d.toISOString().slice(0, 7));
        }

        const [
            installations,
            instruments,
            overdueInstruments,
            workRequests,
            openRequests,
            urgentRequests,
            workOrders,
            openOrders,
            completedOrders,
            escortRiskOrders,
            documentsPendingReview,
            activeManagers,
            activeContractPersonnel,
            activeOngcPersonnel,
        ] = await Promise.all([
            prisma.installation.count({ where: { isActive: true } }),
            prisma.instrument.count({ where: { isActive: true } }),
            prisma.instrument.count({
                where: {
                    isActive: true,
                    OR: [
                        { calStatus: CalibrationStatus.OVERDUE },
                        { nextCalibration: { lt: now } },
                    ],
                },
            }),
            prisma.workRequest.count(),
            prisma.workRequest.count({
                where: {
                    status: {
                        in: [WorkRequestStatus.DRAFT, WorkRequestStatus.SUBMITTED, WorkRequestStatus.REVIEWED],
                    },
                },
            }),
            prisma.workRequest.count({
                where: {
                    priority: Priority.HIGH,
                    status: { in: [WorkRequestStatus.DRAFT, WorkRequestStatus.SUBMITTED, WorkRequestStatus.REVIEWED] },
                },
            }),
            prisma.workOrder.count(),
            prisma.workOrder.count({
                where: { status: { in: [WorkOrderStatus.SCHEDULED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.ON_HOLD] } },
            }),
            prisma.workOrder.count({ where: { status: WorkOrderStatus.COMPLETED } }),
            prisma.workOrder.count({
                where: {
                    category: { in: [2, 3] },
                    OR: [{ ongcEngineerId: null }, { ongcEngineerId: "" }],
                },
            }),
            prisma.document.count({ where: { status: DS.PENDING_REVIEW } }),
            prisma.installationManager.count({ where: { isActive: true } }),
            prisma.contractPersonnel.count({ where: { isActive: true } }),
            prisma.ongcPersonnel.count({ where: { isActive: true } }),
        ]);

        // Status breakdowns
        const [
            divisionBreakdown,
            requestStatusBreakdown,
            orderStatusBreakdown,
            calStatusBreakdown,
            orderCategoryBreakdown,
            requestPriorityBreakdown,
        ] = await Promise.all([
            prisma.installation.groupBy({ by: ["division"], where: { isActive: true }, _count: { _all: true } }),
            prisma.workRequest.groupBy({ by: ["status"], _count: { _all: true } }),
            prisma.workOrder.groupBy({ by: ["status"], _count: { _all: true } }),
            prisma.instrument.groupBy({ by: ["calStatus"], where: { isActive: true }, _count: { _all: true } }),
            prisma.workOrder.groupBy({ by: ["category"], _count: { _all: true } }),
            prisma.workRequest.groupBy({
                by: ["priority"],
                where: { status: { in: [WorkRequestStatus.DRAFT, WorkRequestStatus.SUBMITTED, WorkRequestStatus.REVIEWED] } },
                _count: { _all: true },
            }),
        ]);

        // Monthly work order completion trend — last 6 months
        const completedByMonth = await prisma.workOrder.findMany({
            where: {
                status: WorkOrderStatus.COMPLETED,
                completedDate: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
                },
            },
            select: { completedDate: true },
        });

        const monthlyCompletions = monthBuckets.map((m) => ({
            month: m,
            completed: completedByMonth.filter(
                (o) => o.completedDate && o.completedDate.toISOString().slice(0, 7) === m
            ).length,
        }));

        // Current month SLA
        let slaAvailability = CONTRACT_CONTEXT.uptimeThreshold;
        try {
            const slaRecord = await prisma.slaRecord.findUnique({ where: { month: currentMonth } });
            if (slaRecord) slaAvailability = slaRecord.availability;
        } catch {
            // SlaRecord table might not exist yet
        }

        // SLA trend — last 6 months
        const slaTrend = await Promise.all(
            monthBuckets.map(async (m) => {
                try {
                    const rec = await prisma.slaRecord.findUnique({ where: { month: m } });
                    return { month: m, availability: rec ? rec.availability : null };
                } catch {
                    return { month: m, availability: null };
                }
            })
        );

        // Recent audit logs
        const recentLogs = await prisma.auditLog.findMany({
            take: 15,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { username: true, role: true, displayName: true } },
            },
        });

        // Installation-level calibration health
        const installationCalHealth = await prisma.installation.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                division: true,
                _count: {
                    select: { instruments: true },
                },
                instruments: {
                    where: { isActive: true },
                    select: { calStatus: true },
                },
            },
        });

        const installationHealth = installationCalHealth.map((inst) => {
            const total = inst.instruments.length;
            const overdue = inst.instruments.filter((i) => i.calStatus === CalibrationStatus.OVERDUE).length;
            const dueSoon = inst.instruments.filter((i) => i.calStatus === CalibrationStatus.DUE_SOON).length;
            const valid = inst.instruments.filter((i) => i.calStatus === CalibrationStatus.VALID).length;
            return {
                id: inst.id,
                name: inst.name,
                division: inst.division,
                total,
                valid,
                dueSoon,
                overdue,
                healthScore: total > 0 ? Math.round((valid / total) * 100) : 100,
            };
        });

        res.json({
            cards: {
                installations,
                instruments,
                overdueInstruments,
                workRequests,
                openRequests,
                urgentRequests,
                workOrders,
                openOrders,
                completedOrders,
                escortRiskOrders,
                documentsPendingReview,
                activeManagers,
                activeContractPersonnel,
                activeOngcPersonnel,
            },
            divisionBreakdown,
            requestStatusBreakdown,
            orderStatusBreakdown,
            calStatusBreakdown,
            orderCategoryBreakdown,
            requestPriorityBreakdown,
            monthlyCompletions,
            slaAvailability,
            slaTrend,
            recentLogs,
            installationHealth,
        });
    })
);

export default router;
