import { Router } from "express";
import {
    CalibrationStatus,
    Division,
    Priority,
    Role,
    WorkOrderStatus,
    WorkRequestStatus,
} from "@prisma/client";
import prisma from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";
import {
    normalizeText,
    parseBool,
    parseEnum,
    parseDateInput,
    nextCode,
    toIsoDate,
    decorateWorkRequest,
    withAsync,
    OPEN_REQUEST_STATUSES,
    OPEN_ORDER_STATUSES,
} from "../lib/helpers.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get(
    "/",
    withAsync(async (req, res) => {
        const originFilters = normalizeText(req.query.origin)
            .split(",")
            .map((item) => item.trim().toUpperCase())
            .filter(Boolean);

        const where = {
            status: req.query.status
                ? parseEnum(req.query.status, WorkRequestStatus, undefined)
                : undefined,
            installationId: normalizeText(req.query.installationId) || undefined,
            requestedByManagerId: normalizeText(req.query.managerId) || undefined,
            installation: req.query.division
                ? { division: parseEnum(req.query.division, Division, undefined) }
                : undefined,
        };

        if (req.user.role === Role.INSTALLATION_MANAGER && req.user.managerId) {
            where.requestedByManagerId = req.user.managerId;
        }

        const rows = await prisma.workRequest.findMany({
            where,
            orderBy: [{ requestedDate: "desc" }, { createdAt: "desc" }],
            include: {
                installation: true,
                instrument: true,
                service: true,
                requestedByManager: true,
                reviewedBy: true,
                convertedWorkOrder: true,
                createdByUser: {
                    select: { id: true, username: true, displayName: true, role: true },
                },
            },
        });

        const decorated = rows.map(decorateWorkRequest);
        if (originFilters.length > 0) {
            res.json(decorated.filter((row) => originFilters.includes(row.requestOrigin)));
            return;
        }

        res.json(decorated);
    })
);

router.post(
    "/",
    authorize([
        Role.ONGC_ADMIN,
        Role.ONGC_ENGINEER,
        Role.CMS_COORDINATOR,
        Role.INSTALLATION_MANAGER,
    ]),
    withAsync(async (req, res) => {
        const installationId = normalizeText(req.body?.installationId);
        const title = normalizeText(req.body?.title);
        const description = normalizeText(req.body?.description);

        if (!installationId || !title || !description) {
            res.status(400).json({ message: "installationId, title and description are required" });
            return;
        }

        let requestedByManagerId = normalizeText(req.body?.requestedByManagerId) || null;

        if (req.user.role === Role.INSTALLATION_MANAGER) {
            requestedByManagerId = req.user.managerId;
        }

        if (!requestedByManagerId) {
            res.status(400).json({ message: "requestedByManagerId is required" });
            return;
        }

        if (req.user.role === Role.INSTALLATION_MANAGER) {
            if (!req.user.managerId) {
                res.status(403).json({ message: "Installation manager identity is not mapped." });
                return;
            }

            const assignment = await prisma.installationManagerAssignment.findFirst({
                where: {
                    managerId: req.user.managerId,
                    installationId,
                },
            });

            if (!assignment) {
                res.status(403).json({
                    message:
                        "You can create requests only for your assigned installation(s). Switch to view mode for other installations.",
                });
                return;
            }
        }

        const manager = await prisma.installationManager.findUnique({ where: { id: requestedByManagerId } });
        if (!manager || !manager.isActive) {
            res.status(400).json({ message: "Invalid installation manager" });
            return;
        }

        const managerAssignment = await prisma.installationManagerAssignment.findFirst({
            where: {
                managerId: requestedByManagerId,
                installationId,
            },
        });

        if (!managerAssignment) {
            res.status(400).json({
                message: "Selected manager is not assigned to the chosen installation.",
            });
            return;
        }

        const requestNo = await nextCode("workRequest", "requestNo", "REQ", 5);

        const created = await prisma.workRequest.create({
            data: {
                requestNo,
                installationId,
                instrumentId: normalizeText(req.body?.instrumentId) || null,
                serviceId: normalizeText(req.body?.serviceId) || null,
                requestedByManagerId,
                createdByUserId: req.user.sub,
                title,
                description,
                priority: parseEnum(req.body?.priority, Priority, Priority.MEDIUM),
                preferredDate: parseDateInput(req.body?.preferredDate),
                status:
                    req.user.role === Role.INSTALLATION_MANAGER
                        ? WorkRequestStatus.SUBMITTED
                        : parseEnum(req.body?.status, WorkRequestStatus, WorkRequestStatus.DRAFT),
                remarks: normalizeText(req.body?.remarks) || null,
            },
            include: {
                installation: true,
                instrument: true,
                service: true,
                requestedByManager: true,
                createdByUser: {
                    select: { id: true, username: true, displayName: true, role: true },
                },
            },
        });

        await logAudit(req.user.sub, "CREATE", "work_request", created.id, req.body || {});
        res.status(201).json(decorateWorkRequest(created));
    })
);

router.post(
    "/auto-generate",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER]),
    withAsync(async (req, res) => {
        const now = new Date();
        const limit = Math.min(Math.max(Number(req.body?.limit || 120), 1), 500);

        const overdueInstruments = await prisma.instrument.findMany({
            where: {
                isActive: true,
                OR: [
                    { calStatus: CalibrationStatus.OVERDUE },
                    { nextCalibration: { lt: now } },
                ],
            },
            include: {
                installation: true,
            },
            orderBy: [{ nextCalibration: "asc" }, { instrumentCode: "asc" }],
            take: limit,
        });

        if (overdueInstruments.length === 0) {
            res.json({ checked: 0, createdCount: 0, requests: [] });
            return;
        }

        const instrumentIds = overdueInstruments.map((item) => item.id);
        const installationIds = [...new Set(overdueInstruments.map((item) => item.installationId))];

        const [openRequests, openOrders, assignments, fallbackManager] = await Promise.all([
            prisma.workRequest.findMany({
                where: {
                    instrumentId: { in: instrumentIds },
                    status: { in: OPEN_REQUEST_STATUSES },
                },
                select: { instrumentId: true },
            }),
            prisma.workOrder.findMany({
                where: {
                    instrumentId: { in: instrumentIds },
                    status: { in: OPEN_ORDER_STATUSES },
                },
                select: { instrumentId: true },
            }),
            prisma.installationManagerAssignment.findMany({
                where: { installationId: { in: installationIds } },
                orderBy: { createdAt: "asc" },
            }),
            prisma.installationManager.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: "asc" },
            }),
        ]);

        const openRequestInstrumentSet = new Set(openRequests.map((item) => item.instrumentId).filter(Boolean));
        const openOrderInstrumentSet = new Set(openOrders.map((item) => item.instrumentId).filter(Boolean));
        const managerByInstallation = new Map();
        assignments.forEach((item) => {
            if (!managerByInstallation.has(item.installationId)) {
                managerByInstallation.set(item.installationId, item.managerId);
            }
        });

        const createdRows = [];

        for (const instrument of overdueInstruments) {
            if (openRequestInstrumentSet.has(instrument.id) || openOrderInstrumentSet.has(instrument.id)) {
                continue;
            }

            const requestedByManagerId =
                managerByInstallation.get(instrument.installationId) || fallbackManager?.id || null;
            if (!requestedByManagerId) {
                continue;
            }

            const requestNo = await nextCode("workRequest", "requestNo", "REQ", 5);
            const title = `AUTO: Calibration due for ${instrument.tagNo}`;
            const description = `Auto-generated request for overdue calibration of ${instrument.tagNo} (${instrument.instrumentCode}).`;

            const created = await prisma.workRequest.create({
                data: {
                    requestNo,
                    installationId: instrument.installationId,
                    instrumentId: instrument.id,
                    serviceId: instrument.serviceId,
                    requestedByManagerId,
                    createdByUserId: null,
                    title,
                    description,
                    priority: Priority.HIGH,
                    status: WorkRequestStatus.SUBMITTED,
                    preferredDate: now,
                    remarks: `[AUTO] Generated on ${toIsoDate(now)}`,
                },
                include: {
                    installation: true,
                    instrument: true,
                    service: true,
                    requestedByManager: true,
                    reviewedBy: true,
                    convertedWorkOrder: true,
                    createdByUser: {
                        select: { id: true, username: true, displayName: true, role: true },
                    },
                },
            });

            createdRows.push(decorateWorkRequest(created));
            openRequestInstrumentSet.add(instrument.id);
        }

        await logAudit(req.user.sub, "AUTO_GENERATE", "work_request", null, {
            checked: overdueInstruments.length,
            createdCount: createdRows.length,
        });

        res.json({
            checked: overdueInstruments.length,
            createdCount: createdRows.length,
            requests: createdRows.slice(0, 40),
        });
    })
);

router.put(
    "/:id",
    authorize([
        Role.ONGC_ADMIN,
        Role.ONGC_ENGINEER,
        Role.CMS_COORDINATOR,
        Role.INSTALLATION_MANAGER,
    ]),
    withAsync(async (req, res) => {
        const existing = await prisma.workRequest.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Work request not found" });
            return;
        }

        if (
            req.user.role === Role.INSTALLATION_MANAGER &&
            req.user.managerId &&
            existing.requestedByManagerId !== req.user.managerId
        ) {
            res.status(403).json({ message: "You can only modify your own requests" });
            return;
        }

        if (existing.status === WorkRequestStatus.CONVERTED) {
            res.status(409).json({ message: "Converted requests cannot be edited" });
            return;
        }

        const targetInstallationId =
            req.body?.installationId === undefined
                ? existing.installationId
                : normalizeText(req.body?.installationId) || existing.installationId;

        if (req.user.role === Role.INSTALLATION_MANAGER) {
            const assignment = await prisma.installationManagerAssignment.findFirst({
                where: {
                    managerId: req.user.managerId,
                    installationId: targetInstallationId,
                },
            });

            if (!assignment) {
                res.status(403).json({
                    message: "You can only move/update requests under your assigned installation(s).",
                });
                return;
            }
        }

        const updated = await prisma.workRequest.update({
            where: { id: req.params.id },
            data: {
                installationId: targetInstallationId,
                instrumentId:
                    req.body?.instrumentId === undefined
                        ? existing.instrumentId
                        : normalizeText(req.body?.instrumentId) || null,
                serviceId:
                    req.body?.serviceId === undefined ? existing.serviceId : normalizeText(req.body?.serviceId) || null,
                title: normalizeText(req.body?.title) || existing.title,
                description: normalizeText(req.body?.description) || existing.description,
                priority: parseEnum(req.body?.priority, Priority, existing.priority),
                preferredDate:
                    req.body?.preferredDate === undefined
                        ? existing.preferredDate
                        : parseDateInput(req.body?.preferredDate),
                status: parseEnum(req.body?.status, WorkRequestStatus, existing.status),
                remarks: req.body?.remarks === undefined ? existing.remarks : normalizeText(req.body?.remarks) || null,
            },
            include: {
                installation: true,
                instrument: true,
                service: true,
                requestedByManager: true,
                reviewedBy: true,
                convertedWorkOrder: true,
                createdByUser: {
                    select: { id: true, username: true, displayName: true, role: true },
                },
            },
        });

        await logAudit(req.user.sub, "UPDATE", "work_request", updated.id, req.body || {});
        res.json(decorateWorkRequest(updated));
    })
);

router.post(
    "/:id/submit",
    authorize([
        Role.ONGC_ADMIN,
        Role.ONGC_ENGINEER,
        Role.CMS_COORDINATOR,
        Role.INSTALLATION_MANAGER,
    ]),
    withAsync(async (req, res) => {
        const existing = await prisma.workRequest.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Work request not found" });
            return;
        }

        if (
            req.user.role === Role.INSTALLATION_MANAGER &&
            req.user.managerId &&
            existing.requestedByManagerId !== req.user.managerId
        ) {
            res.status(403).json({ message: "You can only submit your own requests" });
            return;
        }

        const updated = await prisma.workRequest.update({
            where: { id: req.params.id },
            data: { status: WorkRequestStatus.SUBMITTED },
        });

        await logAudit(req.user.sub, "SUBMIT", "work_request", updated.id, {});
        res.json(updated);
    })
);

router.post(
    "/:id/convert",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER]),
    withAsync(async (req, res) => {
        const request = await prisma.workRequest.findUnique({
            where: { id: req.params.id },
            include: { installation: true, instrument: true },
        });

        if (!request) {
            res.status(404).json({ message: "Work request not found" });
            return;
        }

        if (request.status === WorkRequestStatus.CONVERTED) {
            res.status(409).json({ message: "Work request already converted" });
            return;
        }

        const instrumentId = normalizeText(req.body?.instrumentId) || request.instrumentId;
        if (!instrumentId) {
            res.status(400).json({ message: "instrumentId is required for work order conversion" });
            return;
        }

        const category = Number(req.body?.category || 1);
        if (![1, 2, 3].includes(category)) {
            res.status(400).json({ message: "category must be 1, 2 or 3" });
            return;
        }

        const status = parseEnum(req.body?.status, WorkOrderStatus, WorkOrderStatus.REQUESTED);
        const ongcEngineerId = normalizeText(req.body?.ongcEngineerId) || req.user.ongcPersonnelId || null;
        const workOrderNo = await nextCode("workOrder", "workOrderNo", "WO", 5);

        const created = await prisma.$transaction(async (tx) => {
            const order = await tx.workOrder.create({
                data: {
                    workOrderNo,
                    workRequestId: request.id,
                    installationId: request.installationId,
                    instrumentId,
                    serviceId: request.serviceId,
                    category,
                    status,
                    scheduledDate: parseDateInput(req.body?.scheduledDate) || new Date(),
                    ongcEngineerId,
                    escortRequired: category > 1,
                    remarks: normalizeText(req.body?.remarks) || request.remarks || null,
                    createdByUserId: req.user.sub,
                },
            });

            await tx.workRequest.update({
                where: { id: request.id },
                data: {
                    status: WorkRequestStatus.CONVERTED,
                    reviewedById: ongcEngineerId,
                    reviewedAt: new Date(),
                    convertedWorkOrderId: order.id,
                    remarks: normalizeText(req.body?.requestRemarks) || request.remarks,
                },
            });

            await tx.workOrderTimeline.create({
                data: {
                    workOrderId: order.id,
                    status: order.status,
                    userId: req.user.sub,
                }
            });

            const contractPersonnelIds = Array.isArray(req.body?.contractPersonnelIds)
                ? req.body.contractPersonnelIds
                : [];

            if (contractPersonnelIds.length > 0) {
                await tx.workOrderAssignment.createMany({
                    data: contractPersonnelIds.map((contractPersonnelId) => ({
                        workOrderId: order.id,
                        contractPersonnelId,
                    })),
                    skipDuplicates: true,
                });
            }

            return tx.workOrder.findUnique({
                where: { id: order.id },
                include: {
                    installation: true,
                    instrument: true,
                    service: true,
                    ongcEngineer: true,
                    assignments: {
                        include: { contractPersonnel: true },
                    },
                    timeline: {
                        include: { user: { select: { displayName: true } } },
                        orderBy: { createdAt: "asc" }
                    },
                    sourceRequest: true,
                },
            });
        });

        await logAudit(req.user.sub, "CONVERT", "work_request", request.id, {
            workOrderId: created.id,
            workOrderNo: created.workOrderNo,
        });

        res.json(created);
    })
);

router.delete(
    "/:id",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER, Role.INSTALLATION_MANAGER]),
    withAsync(async (req, res) => {
        const existing = await prisma.workRequest.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Work request not found" });
            return;
        }

        if (existing.status === WorkRequestStatus.CONVERTED) {
            res.status(409).json({ message: "Converted requests cannot be deleted" });
            return;
        }

        if (
            req.user.role === Role.INSTALLATION_MANAGER &&
            req.user.managerId &&
            existing.requestedByManagerId !== req.user.managerId
        ) {
            res.status(403).json({ message: "You can only delete your own requests" });
            return;
        }

        await prisma.document.deleteMany({ where: { workRequestId: existing.id } });
        await prisma.workRequest.delete({ where: { id: existing.id } });

        await logAudit(req.user.sub, "DELETE", "work_request", existing.id, {});
        res.json({ message: "Work request deleted" });
    })
);

export default router;
