import { Router } from "express";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";
import { normalizeText, parseBool, withAsync } from "../lib/helpers.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

/* ── Contract Personnel ── */

router.get(
    "/contract-personnel",
    withAsync(async (req, res) => {
        const rows = await prisma.contractPersonnel.findMany({
            where: req.query.activeOnly === "true" ? { isActive: true } : undefined,
            orderBy: { personnelCode: "asc" },
        });
        res.json(rows);
    })
);

router.post(
    "/contract-personnel",
    authorize([Role.ONGC_ADMIN, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const personnelCode = normalizeText(req.body?.personnelCode);
        const name = normalizeText(req.body?.name);
        if (!personnelCode || !name) {
            res.status(400).json({ message: "personnelCode and name are required" });
            return;
        }

        const created = await prisma.contractPersonnel.create({
            data: {
                personnelCode,
                name,
                designation: normalizeText(req.body?.designation) || null,
                specialization: normalizeText(req.body?.specialization) || null,
                email: normalizeText(req.body?.email) || null,
                phone: normalizeText(req.body?.phone) || null,
            },
        });

        await logAudit(req.user.sub, "CREATE", "contract_personnel", created.id, created);
        res.status(201).json(created);
    })
);

router.put(
    "/contract-personnel/:id",
    authorize([Role.ONGC_ADMIN, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const existing = await prisma.contractPersonnel.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Contract personnel not found" });
            return;
        }

        const updated = await prisma.contractPersonnel.update({
            where: { id: req.params.id },
            data: {
                personnelCode: normalizeText(req.body?.personnelCode) || existing.personnelCode,
                name: normalizeText(req.body?.name) || existing.name,
                designation:
                    req.body?.designation === undefined
                        ? existing.designation
                        : normalizeText(req.body?.designation) || null,
                specialization:
                    req.body?.specialization === undefined
                        ? existing.specialization
                        : normalizeText(req.body?.specialization) || null,
                email: req.body?.email === undefined ? existing.email : normalizeText(req.body?.email) || null,
                phone: req.body?.phone === undefined ? existing.phone : normalizeText(req.body?.phone) || null,
                isActive: parseBool(req.body?.isActive, existing.isActive),
            },
        });

        await logAudit(req.user.sub, "UPDATE", "contract_personnel", updated.id, req.body || {});
        res.json(updated);
    })
);

router.delete(
    "/contract-personnel/:id",
    authorize([Role.ONGC_ADMIN, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const existing = await prisma.contractPersonnel.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Contract personnel not found" });
            return;
        }

        await prisma.contractPersonnel.update({
            where: { id: req.params.id },
            data: { isActive: false },
        });

        await logAudit(req.user.sub, "SOFT_DELETE", "contract_personnel", req.params.id, {});
        res.json({ message: "Contract personnel deactivated" });
    })
);

/* ── ONGC Personnel ── */

router.get(
    "/ongc-personnel",
    withAsync(async (req, res) => {
        const rows = await prisma.ongcPersonnel.findMany({
            where: req.query.activeOnly === "true" ? { isActive: true } : undefined,
            orderBy: { employeeCode: "asc" },
        });
        res.json(rows);
    })
);

router.post(
    "/ongc-personnel",
    authorize([Role.ONGC_ADMIN]),
    withAsync(async (req, res) => {
        const employeeCode = normalizeText(req.body?.employeeCode);
        const name = normalizeText(req.body?.name);
        if (!employeeCode || !name) {
            res.status(400).json({ message: "employeeCode and name are required" });
            return;
        }

        const created = await prisma.ongcPersonnel.create({
            data: {
                employeeCode,
                name,
                designation: normalizeText(req.body?.designation) || null,
                email: normalizeText(req.body?.email) || null,
                phone: normalizeText(req.body?.phone) || null,
            },
        });

        await logAudit(req.user.sub, "CREATE", "ongc_personnel", created.id, created);
        res.status(201).json(created);
    })
);

router.put(
    "/ongc-personnel/:id",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER]),
    withAsync(async (req, res) => {
        const existing = await prisma.ongcPersonnel.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "ONGC personnel not found" });
            return;
        }

        const updated = await prisma.ongcPersonnel.update({
            where: { id: req.params.id },
            data: {
                employeeCode: normalizeText(req.body?.employeeCode) || existing.employeeCode,
                name: normalizeText(req.body?.name) || existing.name,
                designation:
                    req.body?.designation === undefined
                        ? existing.designation
                        : normalizeText(req.body?.designation) || null,
                email: req.body?.email === undefined ? existing.email : normalizeText(req.body?.email) || null,
                phone: req.body?.phone === undefined ? existing.phone : normalizeText(req.body?.phone) || null,
                isActive: parseBool(req.body?.isActive, existing.isActive),
            },
        });

        await logAudit(req.user.sub, "UPDATE", "ongc_personnel", updated.id, req.body || {});
        res.json(updated);
    })
);

router.delete(
    "/ongc-personnel/:id",
    authorize([Role.ONGC_ADMIN]),
    withAsync(async (req, res) => {
        const existing = await prisma.ongcPersonnel.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "ONGC personnel not found" });
            return;
        }

        await prisma.ongcPersonnel.update({
            where: { id: req.params.id },
            data: { isActive: false },
        });

        await logAudit(req.user.sub, "SOFT_DELETE", "ongc_personnel", req.params.id, {});
        res.json({ message: "ONGC personnel deactivated" });
    })
);

/* ── Installation Managers ── */

router.get(
    "/installation-managers",
    withAsync(async (req, res) => {
        const rows = await prisma.installationManager.findMany({
            where: req.query.activeOnly === "true" ? { isActive: true } : undefined,
            orderBy: { managerCode: "asc" },
            include: {
                assignments: {
                    include: { installation: true },
                    orderBy: { installation: { name: "asc" } },
                },
            },
        });
        res.json(rows);
    })
);

router.post(
    "/installation-managers",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER]),
    withAsync(async (req, res) => {
        const managerCode = normalizeText(req.body?.managerCode);
        const name = normalizeText(req.body?.name);
        const installationIds = Array.isArray(req.body?.installationIds)
            ? req.body.installationIds
            : [];

        if (!managerCode || !name) {
            res.status(400).json({ message: "managerCode and name are required" });
            return;
        }

        const created = await prisma.installationManager.create({
            data: {
                managerCode,
                name,
                email: normalizeText(req.body?.email) || null,
                phone: normalizeText(req.body?.phone) || null,
                assignments: {
                    create: installationIds.map((installationId) => ({ installationId })),
                },
            },
            include: {
                assignments: true,
            },
        });

        await logAudit(req.user.sub, "CREATE", "installation_manager", created.id, req.body || {});
        res.status(201).json(created);
    })
);

router.put(
    "/installation-managers/:id",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER]),
    withAsync(async (req, res) => {
        const existing = await prisma.installationManager.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Installation manager not found" });
            return;
        }

        const installationIds = Array.isArray(req.body?.installationIds)
            ? req.body.installationIds
            : null;

        const updated = await prisma.$transaction(async (tx) => {
            const manager = await tx.installationManager.update({
                where: { id: req.params.id },
                data: {
                    managerCode: normalizeText(req.body?.managerCode) || existing.managerCode,
                    name: normalizeText(req.body?.name) || existing.name,
                    email: req.body?.email === undefined ? existing.email : normalizeText(req.body?.email) || null,
                    phone: req.body?.phone === undefined ? existing.phone : normalizeText(req.body?.phone) || null,
                    isActive: parseBool(req.body?.isActive, existing.isActive),
                },
            });

            if (installationIds) {
                await tx.installationManagerAssignment.deleteMany({ where: { managerId: manager.id } });
                if (installationIds.length > 0) {
                    await tx.installationManagerAssignment.createMany({
                        data: installationIds.map((installationId) => ({ managerId: manager.id, installationId })),
                    });
                }
            }

            return manager;
        });

        await logAudit(req.user.sub, "UPDATE", "installation_manager", updated.id, req.body || {});
        res.json(updated);
    })
);

router.delete(
    "/installation-managers/:id",
    authorize([Role.ONGC_ADMIN]),
    withAsync(async (req, res) => {
        const existing = await prisma.installationManager.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Installation manager not found" });
            return;
        }

        await prisma.installationManager.update({
            where: { id: req.params.id },
            data: { isActive: false },
        });

        await logAudit(req.user.sub, "SOFT_DELETE", "installation_manager", req.params.id, {});
        res.json({ message: "Installation manager deactivated" });
    })
);

export default router;
