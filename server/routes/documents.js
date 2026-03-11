import { Router } from "express";
import { InstallationCategory, DocumentCategory, DocumentStatus, Role, WorkOrderStatus } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";
import { normalizeText, parseEnum, formatBytes, withAsync } from "../lib/helpers.js";
import { uploadDocumentObject, streamDocumentObject } from "../lib/storage.js";
import { authorize } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = Router();

router.get(
    "/",
    withAsync(async (req, res) => {
        const where = {
            category: req.query.category
                ? parseEnum(req.query.category, DocumentCategory, undefined)
                : undefined,
            status: req.query.status ? parseEnum(req.query.status, DocumentStatus, undefined) : undefined,
            categoryFilter: req.query.categoryFilter ? parseEnum(req.query.categoryFilter, InstallationCategory, undefined) : undefined,
            workOrderId: normalizeText(req.query.workOrderId) || undefined,
            workRequestId: normalizeText(req.query.workRequestId) || undefined,
        };

        const rows = await prisma.document.findMany({
            where,
            include: {
                workOrder: { select: { id: true, workOrderNo: true } },
                workRequest: { select: { id: true, requestNo: true } },
                uploadedByUser: { select: { id: true, username: true, displayName: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        res.json(
            rows.map((row) => ({
                ...row,
                sizeLabel: formatBytes(row.size),
            }))
        );
    })
);

router.post(
    "/",
    authorize([
        Role.ONGC_ADMIN,
        Role.ONGC_ENGINEER,
        Role.CMS_COORDINATOR,
        Role.CMS_TECHNICIAN,
        Role.INSTALLATION_MANAGER,
    ]),
    upload.single("file"),
    withAsync(async (req, res) => {
        const category = parseEnum(req.body?.category, DocumentCategory, null);
        if (!category) {
            res.status(400).json({ message: "Valid category is required" });
            return;
        }

        const requestedName = normalizeText(req.body?.name);
        const fileName = requestedName || req.file?.originalname;
        if (!fileName) {
            res.status(400).json({ message: "Document name or file is required" });
            return;
        }

        if (category === DocumentCategory.CALIBRATION) {
            const namingRegex = /^CAL-RPT-[A-Za-z0-9-]+_[A-Za-z0-9-]+_[A-Za-z0-9-]+\.pdf$/;
            if (!namingRegex.test(fileName)) {
                res.status(400).json({
                    message: "Calibration report name must follow CAL-RPT-{JOB-ID}_{TAG}_{SITE}.pdf",
                });
                return;
            }
        }

        const stored = req.file ? await uploadDocumentObject(req.file) : null;

        const created = await prisma.document.create({
            data: {
                name: fileName,
                category,
                status: parseEnum(req.body?.status, DocumentStatus, DocumentStatus.DRAFT),
                categoryFilter: parseEnum(req.body?.categoryFilter, InstallationCategory, null),
                source: normalizeText(req.body?.source) || "Manual Upload",
                mimeType: stored?.mimeType || req.body?.mimeType || null,
                size: stored?.size || null,
                objectKey: stored?.objectKey || null,
                workOrderId: normalizeText(req.body?.workOrderId) || null,
                workRequestId: normalizeText(req.body?.workRequestId) || null,
                uploadedByUserId: req.user.sub,
            },
        });

        if (category === DocumentCategory.CALIBRATION && created.workOrderId) {
            await prisma.workOrder.update({
                where: { id: created.workOrderId },
                data: {
                    reportUploaded: true,
                    status:
                        req.body?.markCompleted === "true"
                            ? WorkOrderStatus.COMPLETED
                            : undefined,
                },
            });
        }

        await logAudit(req.user.sub, "CREATE", "document", created.id, {
            category,
            workOrderId: created.workOrderId,
            workRequestId: created.workRequestId,
        });

        res.status(201).json(created);
    })
);

router.put(
    "/:id/status",
    authorize([Role.ONGC_ADMIN, Role.ONGC_ENGINEER]),
    withAsync(async (req, res) => {
        const status = parseEnum(req.body?.status, DocumentStatus, null);
        if (!status) {
            res.status(400).json({ message: "Valid status is required" });
            return;
        }

        const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ message: "Document not found" });
            return;
        }

        const updated = await prisma.document.update({
            where: { id: req.params.id },
            data: { status },
        });

        await logAudit(req.user.sub, "UPDATE", "document", updated.id, { status });
        res.json(updated);
    })
);

router.get(
    "/:id/download",
    withAsync(async (req, res) => {
        const document = await prisma.document.findUnique({ where: { id: req.params.id } });
        if (!document) {
            res.status(404).json({ message: "Document not found" });
            return;
        }

        await streamDocumentObject(res, document);
    })
);

export default router;
