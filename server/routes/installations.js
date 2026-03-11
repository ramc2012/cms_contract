import { Router } from "express";
import { InstallationCategory, Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";
import { normalizeText, parseBool, parseEnum, withAsync } from "../lib/helpers.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get(
    "/",
    withAsync(async (req, res) => {
        const filters = {
            isActive: req.query.includeInactive === "true" ? undefined : true,
            category: req.query.category ? parseEnum(req.query.category, InstallationCategory, null) : undefined,
            name:
                req.query.search && normalizeText(req.query.search)
                    ? { contains: normalizeText(req.query.search), mode: "insensitive" }
                    : undefined,
        };

        const rows = await prisma.installation.findMany({
            where: filters,
            orderBy: [{ category: "asc" }, { name: "asc" }],
            include: {
                _count: {
                    select: { instruments: true, workOrders: true, workRequests: true },
                },
                managerAssignments: {
                    include: {
                        manager: {
                            select: { id: true, managerCode: true, name: true, email: true, isActive: true },
                        },
                    },
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
        const name = normalizeText(req.body?.name);
        const category = parseEnum(req.body?.category, InstallationCategory, null);
        const area = normalizeText(req.body?.area);
        const location = normalizeText(req.body?.location) || null;
        const managerIds = Array.isArray(req.body?.managerIds) ? req.body.managerIds : [];

        if (!name || !category || !area) {
            res.status(400).json({ message: "name, category and area are required" });
            return;
        }

        const created = await prisma.installation.create({
            data: {
                name,
                category,
                area,
                location,
                managerAssignments: {
                    create: managerIds.map((managerId) => ({ managerId })),
                },
            },
            include: {
                managerAssignments: true,
            },
        });

        await logAudit(req.user.sub, "CREATE", "installation", created.id, req.body || {});
        res.status(201).json(created);
    })
);

router.put(
    "/:id",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const existing = await prisma.installation.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Installation not found" });
            return;
        }

        const managerIds = Array.isArray(req.body?.managerIds) ? req.body.managerIds : null;

        const updated = await prisma.$transaction(async (tx) => {
            const installation = await tx.installation.update({
                where: { id: req.params.id },
                data: {
                    name: normalizeText(req.body?.name) || existing.name,
                    category: parseEnum(req.body?.category, InstallationCategory, existing.category),
                    area: normalizeText(req.body?.area) || existing.area,
                    location:
                        req.body?.location === undefined
                            ? existing.location
                            : normalizeText(req.body?.location) || null,
                    isActive: parseBool(req.body?.isActive, existing.isActive),
                },
            });

            if (managerIds) {
                await tx.installationManagerAssignment.deleteMany({
                    where: { installationId: installation.id },
                });
                if (managerIds.length > 0) {
                    await tx.installationManagerAssignment.createMany({
                        data: managerIds.map((managerId) => ({ installationId: installation.id, managerId })),
                    });
                }
            }

            return installation;
        });

        await logAudit(req.user.sub, "UPDATE", "installation", updated.id, req.body || {});
        res.json(updated);
    })
);

router.delete(
    "/:id",
    authorize([Role.ONGC_ADMIN]),
    withAsync(async (req, res) => {
        const existing = await prisma.installation.findUnique({
            where: { id: req.params.id },
            include: {
                _count: {
                    select: { instruments: true, workOrders: true, workRequests: true },
                },
            },
        });

        if (!existing) {
            res.status(404).json({ message: "Installation not found" });
            return;
        }

        if (existing._count.workOrders > 0 || existing._count.workRequests > 0) {
            res.status(409).json({
                message: "Cannot delete installation linked to work requests/work orders.",
            });
            return;
        }

        await prisma.installation.update({
            where: { id: req.params.id },
            data: { isActive: false },
        });

        await logAudit(req.user.sub, "SOFT_DELETE", "installation", req.params.id, {});
        res.json({ message: "Installation deactivated" });
    })
);

export default router;
