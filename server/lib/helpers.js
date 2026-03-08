import {
    WorkRequestStatus,
    WorkOrderStatus,
    Role,
} from "@prisma/client";
import prisma from "./prisma.js";

export function toIsoDate(value = new Date()) {
    return new Date(value).toISOString().slice(0, 10);
}

export function parseDateInput(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

export function normalizeText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

export function parseBool(value, fallback = false) {
    if (value === undefined || value === null || value === "") return fallback;
    if (value === true || value === false) return value;
    const text = String(value).toLowerCase();
    return ["true", "1", "yes", "y"].includes(text);
}

export function parseEnum(value, enumObj, fallback) {
    if (!value) return fallback;
    const normalized = String(value).toUpperCase().replace(/\s+/g, "_");
    if (enumObj[normalized]) return enumObj[normalized];
    return fallback;
}

export const OPEN_REQUEST_STATUSES = [
    WorkRequestStatus.DRAFT,
    WorkRequestStatus.SUBMITTED,
    WorkRequestStatus.REVIEWED,
];

export const OPEN_ORDER_STATUSES = [
    WorkOrderStatus.REQUESTED,
    WorkOrderStatus.ASSIGNED,
    WorkOrderStatus.DEPLOYED,
    WorkOrderStatus.WORK_DONE,
    WorkOrderStatus.REPORT_SUBMITTED,
];

export function inferRequestOrigin(row) {
    if (!row) return "MANUAL";
    const title = normalizeText(row.title).toUpperCase();
    const remarks = normalizeText(row.remarks).toUpperCase();
    if (title.startsWith("AUTO:") || remarks.includes("[AUTO]")) {
        return "AUTO_GENERATED";
    }
    if (row.createdByUser?.role === Role.INSTALLATION_MANAGER) {
        return "INSTALLATION_MANAGER";
    }
    if (!row.createdByUserId && row.requestedByManagerId) {
        return "INSTALLATION_MANAGER";
    }
    return "MANUAL";
}

export function decorateWorkRequest(row) {
    return {
        ...row,
        requestOrigin: inferRequestOrigin(row),
    };
}

export function formatBytes(size) {
    if (!size && size !== 0) return "-";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export async function nextCode(modelName, fieldName, prefix, digits = 4) {
    const rows = await prisma[modelName].findMany({
        where: {
            [fieldName]: {
                startsWith: `${prefix}-`,
            },
        },
        select: { [fieldName]: true },
        orderBy: { createdAt: "desc" },
        take: 500,
    });

    let max = 0;
    rows.forEach((row) => {
        const value = row[fieldName];
        const match = String(value).match(/-(\d+)$/);
        if (match) {
            max = Math.max(max, Number(match[1]));
        }
    });

    return `${prefix}-${String(max + 1).padStart(digits, "0")}`;
}

export function withAsync(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}
