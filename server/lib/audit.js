import prisma from "./prisma.js";

export async function logAudit(userId, action, entity, entityId, payload = {}) {
    await prisma.auditLog.create({
        data: {
            userId: userId || null,
            action,
            entity,
            entityId: entityId || null,
            payload,
        },
    });
}
