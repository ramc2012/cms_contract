import { Router } from "express";
import { DocumentCategory, DocumentStatus, Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { withAsync } from "../lib/helpers.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

// GET /api/reports/billing?month=YYYY-MM
router.get(
    "/billing",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER, Role.ONGC_VIEWER, Role.CMS_COORDINATOR]),
    withAsync(async (req, res) => {
        const monthStr = req.query.month; // e.g. "2026-03"
        if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
            res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
            return;
        }

        const [year, month] = monthStr.split("-").map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        const rows = await prisma.document.findMany({
            where: {
                category: DocumentCategory.CALIBRATION,
                status: DocumentStatus.APPROVED,
                createdAt: {
                    gte: startDate,
                    lt: endDate,
                },
            },
            include: {
                workOrder: {
                    include: {
                        installation: true,
                        instrument: true,
                        sourceRequest: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Generate summary statistics
        let totalCategories = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
        rows.forEach(r => {
            if (r.workOrder?.category) {
                totalCategories[r.workOrder.category] = (totalCategories[r.workOrder.category] || 0) + 1;
            }
        });

        const summary = {
            totalApproved: rows.length,
            breakdown: totalCategories,
            data: rows.map(r => ({
                id: r.id,
                name: r.name,
                createdAt: r.createdAt,
                workOrderNo: r.workOrder?.workOrderNo,
                category: r.workOrder?.category,
                installation: r.workOrder?.installation?.name,
                instrumentTag: r.workOrder?.instrument?.tagNo,
                sourceRequestNo: r.workOrder?.sourceRequest?.requestNo,
            }))
        };

        res.json(summary);
    })
);

export default router;
