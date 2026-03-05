import { Router } from "express";
import { Division, Role, WorkOrderStatus, WorkRequestStatus } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";
import { normalizeText, parseBool, parseEnum, parseDateInput, nextCode, withAsync } from "../lib/helpers.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get(
    "/",
    withAsync(async (req, res) => {
        const where = {
            status: req.query.status
                ? parseEnum(req.query.status, WorkOrderStatus, undefined)
                : undefined,
            installationId: normalizeText(req.query.installationId) || undefined,
            serviceId: normalizeText(req.query.serviceId) || undefined,
            category: req.query.category ? Number(req.query.category) : undefined,
            installation: req.query.division
                ? { division: parseEnum(req.query.division, Division, undefined) }
                : undefined,
            OR:
                normalizeText(req.query.search) !== ""
                    ? [
                        {
                            workOrderNo: {
                                contains: normalizeText(req.query.search),
                                mode: "insensitive",
                            },
                        },
                        {
                            instrument: {
                                tagNo: {
                                    contains: normalizeText(req.query.search),
                                    mode: "insensitive",
                                },
                            },
                        },
                        {
                            installation: {
                                name: {
                                    contains: normalizeText(req.query.search),
                                    mode: "insensitive",
                                },
                            },
                        },
                    ]
                    : undefined,
        };

        const rows = await prisma.workOrder.findMany({
            where,
            orderBy: [{ scheduledDate: "desc" }, { createdAt: "desc" }],
            include: {
                installation: true,
                instrument: true,
                service: true,
                ongcEngineer: true,
                sourceRequest: true,
                assignments: {
                    include: { contractPersonnel: true },
                    orderBy: { contractPersonnel: { name: "asc" } },
                },
            },
        });

        res.json(rows);
    })
);

router.post(
    "/",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const installationId = normalizeText(req.body?.installationId);
        const instrumentId = normalizeText(req.body?.instrumentId) || null;
        const category = Number(req.body?.category || 1);

        if (!installationId || ![1, 2, 3].includes(category)) {
            res.status(400).json({ message: "installationId and valid category (1/2/3) are required" });
            return;
        }

        const workOrderNo = await nextCode("workOrder", "workOrderNo", "WO", 5);
        const contractPersonnelIds = Array.isArray(req.body?.contractPersonnelIds)
            ? req.body.contractPersonnelIds
            : [];

        const created = await prisma.$transaction(async (tx) => {
            const order = await tx.workOrder.create({
                data: {
                    workOrderNo,
                    installationId,
                    instrumentId,
                    serviceId: normalizeText(req.body?.serviceId) || null,
                    category,
                    status: parseEnum(req.body?.status, WorkOrderStatus, WorkOrderStatus.SCHEDULED),
                    scheduledDate: parseDateInput(req.body?.scheduledDate) || new Date(),
                    ongcEngineerId: normalizeText(req.body?.ongcEngineerId) || null,
                    escortRequired: parseBool(req.body?.escortRequired, category > 1),
                    reportUploaded: parseBool(req.body?.reportUploaded, false),
                    uatDone: parseBool(req.body?.uatDone, false),
                    remarks: normalizeText(req.body?.remarks) || null,
                    createdByUserId: req.user.sub,
                },
            });

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
                },
            });
        });

        await logAudit(req.user.sub, "CREATE", "work_order", created.id, req.body || {});
        res.status(201).json(created);
    })
);

router.put(
    "/:id",
    authorize([
        Role.ONGC_ADMIN,
        Role.ONGC_ENGINEER,
        Role.CMS_COORDINATOR,
        Role.CMS_TECHNICIAN,
    ]),
    withAsync(async (req, res) => {
        const existing = await prisma.workOrder.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Work order not found" });
            return;
        }

        const contractPersonnelIds = Array.isArray(req.body?.contractPersonnelIds)
            ? req.body.contractPersonnelIds
            : null;

        const updated = await prisma.$transaction(async (tx) => {
            const order = await tx.workOrder.update({
                where: { id: req.params.id },
                data: {
                    installationId: normalizeText(req.body?.installationId) || existing.installationId,
                    instrumentId:
                        req.body?.instrumentId === undefined
                            ? existing.instrumentId
                            : normalizeText(req.body?.instrumentId) || null,
                    serviceId:
                        req.body?.serviceId === undefined ? existing.serviceId : normalizeText(req.body?.serviceId) || null,
                    category: req.body?.category ? Number(req.body.category) : existing.category,
                    status: parseEnum(req.body?.status, WorkOrderStatus, existing.status),
                    scheduledDate:
                        req.body?.scheduledDate === undefined
                            ? existing.scheduledDate
                            : parseDateInput(req.body?.scheduledDate) || existing.scheduledDate,
                    completedDate:
                        req.body?.completedDate === undefined
                            ? existing.completedDate
                            : parseDateInput(req.body?.completedDate),
                    ongcEngineerId:
                        req.body?.ongcEngineerId === undefined
                            ? existing.ongcEngineerId
                            : normalizeText(req.body?.ongcEngineerId) || null,
                    escortRequired: parseBool(req.body?.escortRequired, existing.escortRequired),
                    reportUploaded: parseBool(req.body?.reportUploaded, existing.reportUploaded),
                    uatDone: parseBool(req.body?.uatDone, existing.uatDone),
                    remarks: req.body?.remarks === undefined ? existing.remarks : normalizeText(req.body?.remarks) || null,
                },
            });

            if (contractPersonnelIds) {
                await tx.workOrderAssignment.deleteMany({ where: { workOrderId: order.id } });
                if (contractPersonnelIds.length > 0) {
                    await tx.workOrderAssignment.createMany({
                        data: contractPersonnelIds.map((contractPersonnelId) => ({
                            workOrderId: order.id,
                            contractPersonnelId,
                        })),
                        skipDuplicates: true,
                    });
                }
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
                },
            });
        });

        await logAudit(req.user.sub, "UPDATE", "work_order", updated.id, req.body || {});
        res.json(updated);
    })
);

router.delete(
    "/:id",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER]),
    withAsync(async (req, res) => {
        const existing = await prisma.workOrder.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Work order not found" });
            return;
        }

        await prisma.$transaction(async (tx) => {
            await tx.attendance.deleteMany({ where: { workOrderId: existing.id } });
            await tx.document.deleteMany({ where: { workOrderId: existing.id } });
            await tx.workOrderAssignment.deleteMany({ where: { workOrderId: existing.id } });
            if (existing.workRequestId) {
                await tx.workRequest.update({
                    where: { id: existing.workRequestId },
                    data: {
                        status: WorkRequestStatus.REVIEWED,
                        convertedWorkOrderId: null,
                    },
                });
            }
            await tx.workOrder.delete({ where: { id: existing.id } });
        });

        await logAudit(req.user.sub, "DELETE", "work_order", existing.id, {});
        res.json({ message: "Work order deleted" });
    })
);

export default router;
