import { Router } from "express";
import { DeploymentMode, Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";
import { normalizeText, parseBool, parseEnum, parseDateInput, toIsoDate, withAsync } from "../lib/helpers.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get(
    "/",
    withAsync(async (req, res) => {
        const where = {
            contractPersonnelId: normalizeText(req.query.contractPersonnelId) || undefined,
            date: {
                gte: req.query.from ? parseDateInput(req.query.from) : undefined,
                lte: req.query.to ? parseDateInput(req.query.to) : undefined,
            },
        };

        const rows = await prisma.attendance.findMany({
            where,
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            include: {
                contractPersonnel: true,
                workOrder: true,
            },
        });

        res.json(rows);
    })
);

router.post(
    "/",
    authorize([
        Role.ONGC_ADMIN,
        Role.ONGC_ENGINEER,
        Role.CMS_COORDINATOR,
        Role.CMS_TECHNICIAN,
    ]),
    withAsync(async (req, res) => {
        const contractPersonnelId = normalizeText(req.body?.contractPersonnelId);
        const date = parseDateInput(req.body?.date);

        if (!contractPersonnelId || !date) {
            res.status(400).json({ message: "contractPersonnelId and date are required" });
            return;
        }

        const upserted = await prisma.attendance.upsert({
            where: {
                contractPersonnelId_date: {
                    contractPersonnelId,
                    date,
                },
            },
            create: {
                contractPersonnelId,
                date,
                present: parseBool(req.body?.present, true),
                checkIn: normalizeText(req.body?.checkIn) || null,
                checkOut: normalizeText(req.body?.checkOut) || null,
                site: normalizeText(req.body?.site) || null,
                mode: parseEnum(req.body?.mode, DeploymentMode, null),
                workOrderId: normalizeText(req.body?.workOrderId) || null,
            },
            update: {
                present: parseBool(req.body?.present, true),
                checkIn: normalizeText(req.body?.checkIn) || null,
                checkOut: normalizeText(req.body?.checkOut) || null,
                site: normalizeText(req.body?.site) || null,
                mode: parseEnum(req.body?.mode, DeploymentMode, null),
                workOrderId:
                    req.body?.workOrderId === undefined
                        ? undefined
                        : normalizeText(req.body?.workOrderId) || null,
            },
            include: {
                contractPersonnel: true,
                workOrder: true,
            },
        });

        await logAudit(req.user.sub, "UPSERT", "attendance", upserted.id, req.body || {});
        res.status(201).json(upserted);
    })
);

router.get(
    "/summary",
    withAsync(async (req, res) => {
        const month = normalizeText(req.query.month) || toIsoDate(new Date()).slice(0, 7);
        const start = parseDateInput(`${month}-01`);
        if (!start) {
            res.status(400).json({ message: "month must be YYYY-MM" });
            return;
        }

        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);

        const [personnel, rows] = await Promise.all([
            prisma.contractPersonnel.findMany({ where: { isActive: true }, orderBy: { personnelCode: "asc" } }),
            prisma.attendance.findMany({
                where: { date: { gte: start, lt: end } },
                include: { contractPersonnel: true },
            }),
        ]);

        const map = new Map();
        personnel.forEach((p) => {
            map.set(p.id, {
                id: p.id,
                personnelCode: p.personnelCode,
                name: p.name,
                designation: p.designation,
                presentDays: 0,
                onsiteDays: 0,
                remoteDays: 0,
            });
        });

        rows.forEach((row) => {
            const target = map.get(row.contractPersonnelId);
            if (!target) return;
            if (row.present) target.presentDays += 1;
            if (row.mode === DeploymentMode.ONSITE) target.onsiteDays += 1;
            if (row.mode === DeploymentMode.REMOTE) target.remoteDays += 1;
        });

        const summary = [...map.values()];
        const totalPresent = summary.reduce((sum, item) => sum + item.presentDays, 0);
        const onsiteDays = summary.reduce((sum, item) => sum + item.onsiteDays, 0);
        const remoteDays = summary.reduce((sum, item) => sum + item.remoteDays, 0);

        res.json({
            month,
            staffCount: summary.length,
            totalPresent,
            onsiteDays,
            remoteDays,
            staffSummary: summary,
        });
    })
);

export default router;
