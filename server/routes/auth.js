import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";
import { normalizeText, withAsync } from "../lib/helpers.js";
import { JWT_SECRET } from "../config.js";
import { authMiddleware, loginRateLimiter } from "../middleware/auth.js";

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

export default router;
