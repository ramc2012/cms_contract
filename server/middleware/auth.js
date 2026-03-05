/* global process */
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import { JWT_SECRET } from "../config.js";

export function authMiddleware(req, res, next) {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
        res.status(401).json({ message: "Missing bearer token" });
        return;
    }

    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch {
        res.status(401).json({ message: "Invalid or expired token" });
    }
}

export function authorize(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ message: "Forbidden" });
            return;
        }
        next();
    };
}

/** Brute-force protection: max 10 login attempts per 15 minutes per IP */
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many login attempts. Please try again in 15 minutes." },
    skip: () => process.env.NODE_ENV === "test",
});

/** General API rate limiter: 300 req/min per IP to prevent abuse */
export const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests. Please slow down." },
    skip: () => process.env.NODE_ENV === "test",
});
