import { Router } from "express";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";
import { normalizeText, parseDateInput, withAsync } from "../lib/helpers.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

/* ─── LIST absences ────────────────────────────────── */
router.get(
    "/",
    withAsync(async (req, res) => {
        const where = {};

        if (req.query.contractPersonnelId) {
            where.contractPersonnelId = normalizeText(req.query.contractPersonnelId);
        }

        // Filter by month (YYYY-MM) — include any absence that overlaps the month
        if (req.query.month) {
            const start = parseDateInput(`${req.query.month}-01`);
            if (start) {
                const end = new Date(start);
                end.setMonth(end.getMonth() + 1);
                where.fromDate = { lt: end };
                where.toDate = { gte: start };
            }
        }

        const rows = await prisma.absencePeriod.findMany({
            where,
            orderBy: [{ fromDate: "desc" }],
            include: {
                contractPersonnel: true,
                createdByUser: { select: { displayName: true } },
            },
        });

        res.json(rows);
    })
);

/* ─── CREATE absence ───────────────────────────────── */
router.post(
    "/",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const contractPersonnelId = normalizeText(req.body?.contractPersonnelId);
        const fromDate = parseDateInput(req.body?.fromDate);
        const toDate = parseDateInput(req.body?.toDate);

        if (!contractPersonnelId || !fromDate || !toDate) {
            res.status(400).json({ message: "contractPersonnelId, fromDate, and toDate are required" });
            return;
        }

        if (toDate < fromDate) {
            res.status(400).json({ message: "toDate must be after fromDate" });
            return;
        }

        const created = await prisma.absencePeriod.create({
            data: {
                contractPersonnelId,
                fromDate,
                toDate,
                reason: normalizeText(req.body?.reason) || null,
                createdByUserId: req.user.sub,
            },
            include: {
                contractPersonnel: true,
                createdByUser: { select: { displayName: true } },
            },
        });

        await logAudit(req.user.sub, "CREATE", "absence_period", created.id, req.body || {});
        res.status(201).json(created);
    })
);

/* ─── UPDATE absence ───────────────────────────────── */
router.put(
    "/:id",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const existing = await prisma.absencePeriod.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Absence period not found" });
            return;
        }

        const fromDate = parseDateInput(req.body?.fromDate) || existing.fromDate;
        const toDate = parseDateInput(req.body?.toDate) || existing.toDate;

        const updated = await prisma.absencePeriod.update({
            where: { id: req.params.id },
            data: {
                contractPersonnelId: normalizeText(req.body?.contractPersonnelId) || existing.contractPersonnelId,
                fromDate,
                toDate,
                reason: req.body?.reason === undefined ? existing.reason : normalizeText(req.body?.reason) || null,
            },
            include: {
                contractPersonnel: true,
                createdByUser: { select: { displayName: true } },
            },
        });

        await logAudit(req.user.sub, "UPDATE", "absence_period", updated.id, req.body || {});
        res.json(updated);
    })
);

/* ─── DELETE absence ───────────────────────────────── */
router.delete(
    "/:id",
    authorize([Role.ONGC_ADMIN]),
    withAsync(async (req, res) => {
        const existing = await prisma.absencePeriod.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Absence period not found" });
            return;
        }

        await prisma.absencePeriod.delete({ where: { id: req.params.id } });
        await logAudit(req.user.sub, "DELETE", "absence_period", existing.id, {});
        res.json({ message: "Absence period deleted" });
    })
);

/* ─── SUMMARY ──────────────────────────────────────── */
router.get(
    "/summary",
    withAsync(async (req, res) => {
        const month = normalizeText(req.query.month);
        const start = month ? parseDateInput(`${month}-01`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);

        const personnel = await prisma.contractPersonnel.findMany({
            where: { isActive: true },
            orderBy: { personnelCode: "asc" },
        });

        const absences = await prisma.absencePeriod.findMany({
            where: {
                fromDate: { lt: end },
                toDate: { gte: start },
            },
        });

        // Calculate days absent in the given month for each person
        const summaryMap = new Map();
        personnel.forEach(p => {
            summaryMap.set(p.id, {
                id: p.id,
                personnelCode: p.personnelCode,
                name: p.name,
                designation: p.designation,
                absentDays: 0,
                periods: [],
            });
        });

        for (const abs of absences) {
            const target = summaryMap.get(abs.contractPersonnelId);
            if (!target) continue;

            // Clamp absence to the month window
            const absStart = abs.fromDate < start ? start : abs.fromDate;
            const absEnd = abs.toDate > end ? end : abs.toDate;
            const days = Math.ceil((absEnd - absStart) / (1000 * 60 * 60 * 24));
            target.absentDays += Math.max(0, days);
            target.periods.push({
                from: abs.fromDate,
                to: abs.toDate,
                reason: abs.reason,
            });
        }

        const summary = [...summaryMap.values()];
        const totalAbsentDays = summary.reduce((sum, s) => sum + s.absentDays, 0);

        res.json({
            month: start.toISOString().slice(0, 7),
            staffCount: summary.length,
            totalAbsentDays,
            staffSummary: summary,
        });
    })
);

export default router;
