import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";
import { normalizeText, withAsync } from "../lib/helpers.js";
import { JWT_SECRET } from "../config.js";
import { authMiddleware, authorize, loginRateLimiter } from "../middleware/auth.js";

const router = Router();

router.post(
    "/login",
    loginRateLimiter,
    withAsync(async (req, res) => {
        const username = normalizeText(req.body?.username);
        const password = normalizeText(req.body?.password);

        if (!username || !password) {
            res.status(400).json({ message: "username and password are required" });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                manager: {
                    include: {
                        assignments: { select: { installationId: true } },
                    },
                },
                contractPersonnel: true,
                ongcPersonnel: true,
            },
        });

        if (!user || !user.isActive) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        const payload = {
            sub: user.id,
            role: user.role,
            username: user.username,
            displayName: user.displayName,
            managerId: user.managerId,
            contractPersonnelId: user.contractPersonnelId,
            ongcPersonnelId: user.ongcPersonnelId,
            installations: user.manager?.assignments?.map(a => a.installationId) || [],
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });

        await logAudit(user.id, "LOGIN", "auth", user.id, { username: user.username });

        res.json({
            token,
            user: payload,
        });
    })
);

router.get(
    "/me",
    authMiddleware,
    withAsync(async (req, res) => {
        const user = await prisma.user.findUnique({
            where: { id: req.user.sub },
            select: {
                id: true,
                username: true,
                role: true,
                displayName: true,
                managerId: true,
                contractPersonnelId: true,
                ongcPersonnelId: true,
                manager: {
                    select: {
                        assignments: { select: { installationId: true } },
                    },
                },
            },
        });

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.json({
            ...user,
            installations: user.manager?.assignments?.map(a => a.installationId) || [],
            manager: undefined,
        });
    })
);

/* ── User Management (Admin-only CRUD) ── */

router.get(
    "/users",
    authorize([Role.ONGC_ADMIN]),
    withAsync(async (_req, res) => {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                username: true,
                displayName: true,
                role: true,
                isActive: true,
                createdAt: true,
                managerId: true,
                contractPersonnelId: true,
                ongcPersonnelId: true,
                manager: { select: { id: true, name: true } },
                contractPersonnel: { select: { id: true, name: true } },
                ongcPersonnel: { select: { id: true, name: true } },
            },
        });
        res.json(users);
    })
);

router.post(
    "/users",
    authorize([Role.ONGC_ADMIN]),
    withAsync(async (req, res) => {
        const username = normalizeText(req.body?.username);
        const password = normalizeText(req.body?.password);
        const displayName = normalizeText(req.body?.displayName);
        const role = normalizeText(req.body?.role);

        if (!username || !password || !displayName || !role) {
            res.status(400).json({ message: "username, password, displayName, and role are required" });
            return;
        }

        const exists = await prisma.user.findUnique({ where: { username } });
        if (exists) {
            res.status(409).json({ message: "Username already exists" });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const data = {
            username,
            passwordHash,
            displayName,
            role,
            isActive: req.body?.isActive !== false,
        };

        // Link to personnel if provided
        if (req.body?.managerId) data.managerId = req.body.managerId;
        if (req.body?.contractPersonnelId) data.contractPersonnelId = req.body.contractPersonnelId;
        if (req.body?.ongcPersonnelId) data.ongcPersonnelId = req.body.ongcPersonnelId;

        const user = await prisma.user.create({ data });
        await logAudit(req.user.sub, "CREATE", "user", user.id, { username, role });
        res.status(201).json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role });
    })
);

router.put(
    "/users/:id",
    authorize([Role.ONGC_ADMIN]),
    withAsync(async (req, res) => {
        const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const data = {};
        if (req.body?.displayName !== undefined) data.displayName = normalizeText(req.body.displayName) || existing.displayName;
        if (req.body?.role !== undefined) data.role = normalizeText(req.body.role) || existing.role;
        if (req.body?.isActive !== undefined) data.isActive = req.body.isActive;

        // Optional password reset
        if (req.body?.newPassword) {
            data.passwordHash = await bcrypt.hash(req.body.newPassword, 10);
        }

        // Link to personnel
        if (req.body?.managerId !== undefined) data.managerId = req.body.managerId || null;
        if (req.body?.contractPersonnelId !== undefined) data.contractPersonnelId = req.body.contractPersonnelId || null;
        if (req.body?.ongcPersonnelId !== undefined) data.ongcPersonnelId = req.body.ongcPersonnelId || null;

        const updated = await prisma.user.update({
            where: { id: req.params.id },
            data,
            select: { id: true, username: true, displayName: true, role: true, isActive: true },
        });

        await logAudit(req.user.sub, "UPDATE", "user", updated.id, req.body || {});
        res.json(updated);
    })
);

/* ── Self-service password change ── */

router.put(
    "/change-password",
    authMiddleware,
    withAsync(async (req, res) => {
        const userId = req.user.sub;

        // Block READ_ONLY users
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.role === "READ_ONLY") {
            res.status(403).json({ message: "Password change is not available for this account" });
            return;
        }

        const currentPassword = normalizeText(req.body?.currentPassword);
        const newPassword = normalizeText(req.body?.newPassword);

        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: "currentPassword and newPassword are required" });
            return;
        }

        if (newPassword.length < 6) {
            res.status(400).json({ message: "New password must be at least 6 characters" });
            return;
        }

        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) {
            res.status(401).json({ message: "Current password is incorrect" });
            return;
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });

        await logAudit(userId, "CHANGE_PASSWORD", "user", userId, {});
        res.json({ message: "Password changed successfully" });
    })
);

export default router;
