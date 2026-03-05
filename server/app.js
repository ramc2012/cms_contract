/* global process */
import cors from "cors";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import { randomUUID } from "crypto";
import { authMiddleware, apiRateLimiter } from "./middleware/auth.js";

// Route modules
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import servicesRoutes from "./routes/services.js";
import installationsRoutes from "./routes/installations.js";
import instrumentsRoutes from "./routes/instruments.js";
import personnelRoutes from "./routes/personnel.js";
import workRequestsRoutes from "./routes/workRequests.js";
import workOrdersRoutes from "./routes/workOrders.js";
import attendanceRoutes from "./routes/attendance.js";
import documentsRoutes from "./routes/documents.js";
import slaRoutes from "./routes/sla.js";
import auditLogsRoutes from "./routes/auditLogs.js";

const app = express();

/* ── Security headers ── */
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
        crossOriginEmbedderPolicy: false, // Allow MinIO presigned URL downloads
    })
);

/* ── CORS ── */
const allowedOrigins =
    process.env.NODE_ENV === "production"
        ? (process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean)
        : true; // Allow all in dev

app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Authorization", "Content-Type", "X-Request-ID"],
        exposedHeaders: ["X-Request-ID"],
        credentials: true,
        maxAge: 86400, // 24h preflight cache
    })
);

/* ── Request ID middleware (correlation IDs for tracing) ── */
app.use((req, res, next) => {
    const requestId = req.headers["x-request-id"] || randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
});

/* ── Structured request logging ── */
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";
        const entry = {
            ts: new Date().toISOString(),
            level,
            method: req.method,
            path: req.path,
            status: res.statusCode,
            ms: duration,
            reqId: req.requestId,
        };
        if (req.user?.username) entry.user = req.user.username;
        if (process.env.LOG_FORMAT === "json") {
            process.stdout.write(JSON.stringify(entry) + "\n");
        } else {
            const color = res.statusCode >= 500 ? "\x1b[31m" : res.statusCode >= 400 ? "\x1b[33m" : "\x1b[32m";
            console.log(
                `${color}[${entry.level}]\x1b[0m ${entry.method} ${entry.path} ${entry.status} ${entry.ms}ms [${entry.reqId?.slice(0, 8)}]`
            );
        }
    });
    next();
});

/* ── General API rate limiting ── */
app.use("/api", apiRateLimiter);

/* ── Body parsers ── */
app.use(express.json({ limit: "10mb" }));

/* ── Public routes (no auth) ── */
app.use("/api/auth", authRoutes);

/* ── Health check (public, from dashboard routes) ── */
app.use("/api", dashboardRoutes);

/* ── Auth wall: all remaining /api/* routes require a valid JWT ── */
app.use("/api", (req, res, next) => {
    if (req.path === "/health" || req.path.startsWith("/auth/")) {
        next();
        return;
    }
    authMiddleware(req, res, next);
});

/* ── Protected routes ── */
app.use("/api/services", servicesRoutes);
app.use("/api/installations", installationsRoutes);
app.use("/api/instruments", instrumentsRoutes);
app.use("/api", personnelRoutes); // mounts /contract-personnel, /ongc-personnel, /installation-managers
app.use("/api/work-requests", workRequestsRoutes);
app.use("/api/work-orders", workOrdersRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/sla", slaRoutes);
app.use("/api/audit-logs", auditLogsRoutes);

/* ── 404 handler ── */
app.use((req, res) => {
    res.status(404).json({ message: "Endpoint not found", path: req.path, reqId: req.requestId });
});

/* ── Global error handler ── */
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    const reqId = req.requestId;
    if (error.code === "P2002") {
        res.status(409).json({ message: "Unique constraint violation", meta: error.meta, reqId });
        return;
    }
    if (error instanceof multer.MulterError) {
        res.status(400).json({ message: `Upload error: ${error.message}`, reqId });
        return;
    }
    if (error.status === 429) {
        res.status(429).json({ message: error.message, reqId });
        return;
    }

    // Log the full error server-side but never expose stack traces to client
    console.error(`[ERROR] reqId=${reqId}`, error);
    res.status(error.status || 500).json({
        message: process.env.NODE_ENV === "production" ? "Internal server error" : (error.message || "Internal server error"),
        reqId,
    });
});

export default app;
