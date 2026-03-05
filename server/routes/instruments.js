import { Router } from "express";
import { CalibrationStatus, Division, Role, WorkingStatus } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";
import { normalizeText, parseBool, parseEnum, parseDateInput, nextCode, withAsync } from "../lib/helpers.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get(
    "/",
    withAsync(async (req, res) => {
        const where = {
            isActive: req.query.includeInactive === "true" ? undefined : true,
            installationId: normalizeText(req.query.installationId) || undefined,
            serviceId: normalizeText(req.query.serviceId) || undefined,
            calStatus: req.query.calStatus
                ? parseEnum(req.query.calStatus, CalibrationStatus, undefined)
                : undefined,
            installation: req.query.division
                ? { division: parseEnum(req.query.division, Division, undefined) }
                : undefined,
            OR:
                normalizeText(req.query.search) !== ""
                    ? [
                        {
                            tagNo: {
                                contains: normalizeText(req.query.search),
                                mode: "insensitive",
                            },
                        },
                        {
                            instrumentCode: {
                                contains: normalizeText(req.query.search),
                                mode: "insensitive",
                            },
                        },
                        {
                            equipmentType: {
                                contains: normalizeText(req.query.search),
                                mode: "insensitive",
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

        const rows = await prisma.instrument.findMany({
            where,
            include: {
                installation: true,
                service: true,
                _count: {
                    select: { workOrders: true, workRequests: true },
                },
            },
            orderBy: [{ installation: { name: "asc" } }, { tagNo: "asc" }],
        });

        res.json(rows);
    })
);

router.post(
    "/",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const installationId = normalizeText(req.body?.installationId);
        const tagNo = normalizeText(req.body?.tagNo);
        const equipmentType = normalizeText(req.body?.equipmentType);

        if (!installationId || !tagNo || !equipmentType) {
            res.status(400).json({ message: "installationId, tagNo and equipmentType are required" });
            return;
        }

        const installation = await prisma.installation.findUnique({ where: { id: installationId } });
        if (!installation || !installation.isActive) {
            res.status(404).json({ message: "Installation not found" });
            return;
        }

        const instrumentCode = await nextCode("instrument", "instrumentCode", "INS", 5);

        const created = await prisma.instrument.create({
            data: {
                instrumentCode,
                tagNo,
                installationId,
                serviceId: normalizeText(req.body?.serviceId) || null,
                equipmentType,
                make: normalizeText(req.body?.make) || null,
                model: normalizeText(req.body?.model) || null,
                serialNo: normalizeText(req.body?.serialNo) || null,
                workingStatus: parseEnum(req.body?.workingStatus, WorkingStatus, WorkingStatus.WORKING),
                calStatus: parseEnum(req.body?.calStatus, CalibrationStatus, CalibrationStatus.PENDING),
                lastCalibration: parseDateInput(req.body?.lastCalibration),
                nextCalibration: parseDateInput(req.body?.nextCalibration),
                scadaConnected: parseBool(req.body?.scadaConnected, false),
            },
            include: {
                installation: true,
                service: true,
            },
        });

        await logAudit(req.user.sub, "CREATE", "instrument", created.id, req.body || {});
        res.status(201).json(created);
    })
);

router.put(
    "/:id",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const existing = await prisma.instrument.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Instrument not found" });
            return;
        }

        const updated = await prisma.instrument.update({
            where: { id: req.params.id },
            data: {
                tagNo: normalizeText(req.body?.tagNo) || existing.tagNo,
                installationId: normalizeText(req.body?.installationId) || existing.installationId,
                serviceId: req.body?.serviceId === undefined ? existing.serviceId : normalizeText(req.body?.serviceId) || null,
                equipmentType: normalizeText(req.body?.equipmentType) || existing.equipmentType,
                make: req.body?.make === undefined ? existing.make : normalizeText(req.body?.make) || null,
                model: req.body?.model === undefined ? existing.model : normalizeText(req.body?.model) || null,
                serialNo:
                    req.body?.serialNo === undefined ? existing.serialNo : normalizeText(req.body?.serialNo) || null,
                workingStatus: parseEnum(req.body?.workingStatus, WorkingStatus, existing.workingStatus),
                calStatus: parseEnum(req.body?.calStatus, CalibrationStatus, existing.calStatus),
                lastCalibration:
                    req.body?.lastCalibration === undefined
                        ? existing.lastCalibration
                        : parseDateInput(req.body?.lastCalibration),
                nextCalibration:
                    req.body?.nextCalibration === undefined
                        ? existing.nextCalibration
                        : parseDateInput(req.body?.nextCalibration),
                scadaConnected: parseBool(req.body?.scadaConnected, existing.scadaConnected),
                isActive: parseBool(req.body?.isActive, existing.isActive),
            },
            include: {
                installation: true,
                service: true,
            },
        });

        await logAudit(req.user.sub, "UPDATE", "instrument", updated.id, req.body || {});
        res.json(updated);
    })
);

router.delete(
    "/:id",
    authorize([Role.ONGC_ADMIN, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const existing = await prisma.instrument.findUnique({
            where: { id: req.params.id },
            include: {
                _count: {
                    select: { workOrders: true, workRequests: true },
                },
            },
        });

        if (!existing) {
            res.status(404).json({ message: "Instrument not found" });
            return;
        }

        if (existing._count.workOrders > 0 || existing._count.workRequests > 0) {
            res.status(409).json({
                message: "Cannot delete instrument linked with work requests/work orders.",
            });
            return;
        }

        await prisma.instrument.update({
            where: { id: req.params.id },
            data: { isActive: false },
        });

        await logAudit(req.user.sub, "SOFT_DELETE", "instrument", req.params.id, {});
        res.json({ message: "Instrument deactivated" });
    })
);

export default router;
