import { Router } from "express";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { withAsync } from "../lib/helpers.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get(
    "/",
    authorize([Role.ONGC_ADMIN]),
    withAsync(async (req, res) => {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: Number(req.query.limit || 200),
            include: {
                user: {
                    select: { id: true, username: true, displayName: true, role: true },
                },
            },
        });

        res.json(logs);
    })
);

export default router;
