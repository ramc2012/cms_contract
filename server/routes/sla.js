import { Router } from "express";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";
import { normalizeText, withAsync } from "../lib/helpers.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get(
    "/:month",
    withAsync(async (req, res) => {
        const month = normalizeText(req.params.month);
        if (!/^\d{4}-\d{2}$/.test(month)) {
            res.status(400).json({ message: "month must be YYYY-MM" });
            return;
        }

        const row = await prisma.slaAvailability.findUnique({ where: { month } });
        res.json(
            row || {
                month,
                availability: 99.7,
            }
        );
    })
);

router.put(
    "/:month",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const month = normalizeText(req.params.month);
        const availability = Number(req.body?.availability);
        if (!/^\d{4}-\d{2}$/.test(month)) {
            res.status(400).json({ message: "month must be YYYY-MM" });
            return;
        }
        if (Number.isNaN(availability) || availability < 0 || availability > 100) {
            res.status(400).json({ message: "availability must be between 0 and 100" });
            return;
        }

        const row = await prisma.slaAvailability.upsert({
            where: { month },
            create: { month, availability },
            update: { availability },
        });

        await logAudit(req.user.sub, "UPDATE", "sla_availability", row.id, { month, availability });
        res.json(row);
    })
);

export default router;
