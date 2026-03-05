import { Router } from "express";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";
import { normalizeText, parseBool, withAsync } from "../lib/helpers.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get(
    "/",
    withAsync(async (req, res) => {
        const rows = await prisma.serviceCatalog.findMany({
            where: req.query.activeOnly === "true" ? { isActive: true } : undefined,
            orderBy: { name: "asc" },
        });
        res.json(rows);
    })
);

router.post(
    "/",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const name = normalizeText(req.body?.name);
        const description = normalizeText(req.body?.description) || null;

        if (!name) {
            res.status(400).json({ message: "name is required" });
            return;
        }

        const created = await prisma.serviceCatalog.create({
            data: { name, description },
        });

        await logAudit(req.user.sub, "CREATE", "service", created.id, created);
        res.status(201).json(created);
    })
);

router.put(
    "/:id",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const existing = await prisma.serviceCatalog.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Service not found" });
            return;
        }

        const updated = await prisma.serviceCatalog.update({
            where: { id: req.params.id },
            data: {
                name: normalizeText(req.body?.name) || existing.name,
                description:
                    req.body?.description === undefined
                        ? existing.description
                        : normalizeText(req.body?.description) || null,
                isActive: parseBool(req.body?.isActive, existing.isActive),
            },
        });

        await logAudit(req.user.sub, "UPDATE", "service", updated.id, req.body || {});
        res.json(updated);
    })
);

router.delete(
    "/:id",
    authorize([Role.ONGC_ADMIN]),
    withAsync(async (req, res) => {
        const existing = await prisma.serviceCatalog.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Service not found" });
            return;
        }

        await prisma.serviceCatalog.update({
            where: { id: req.params.id },
            data: { isActive: false },
        });

        await logAudit(req.user.sub, "SOFT_DELETE", "service", req.params.id, {});
        res.json({ message: "Service deactivated" });
    })
);

export default router;
