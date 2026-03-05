/* global process */
import dotenv from "dotenv";
dotenv.config();

export const PORT = Number(process.env.PORT || 4000);
export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_PROD = NODE_ENV === "production";

// JWT — fail fast in production if not set or left as the example value
export const JWT_SECRET = process.env.JWT_SECRET || (IS_PROD ? null : "dev-only-insecure-secret");

export const AUTO_SEED = (process.env.AUTO_SEED || "true").toLowerCase() === "true";
export const STORAGE_MODE = process.env.STORAGE_MODE || (process.env.S3_ENDPOINT ? "s3" : "local");
export const S3_BUCKET = process.env.S3_BUCKET || "fms-track-docs";

export const S3_CONFIG = {
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY || (IS_PROD ? null : "minioadmin"),
    secretAccessKey: process.env.S3_SECRET_KEY || (IS_PROD ? null : "minioadmin"),
};

export const CONTRACT_CONTEXT = {
    contractNumber: "GEMC-511687740481810",
    bidNumber: "GEM/2025/B/6913774",
    contractDate: "2026-01-30",
    startDate: "2026-02-06",
    endDate: "2029-03-20",
    durationMonths: 37,
    billingCycle: "Monthly",
    pricingModel: "Project/Lumpsum",
    epbgPercentage: 3,
    optionClause: "+/- 25%",
    uptimeThreshold: 99.5,
    milestonePenaltyPerWeek: 1,
    availabilityPenaltyPerMonth: 0.5,
    cumulativePenaltyCap: 10,
};

/** Validate critical environment variables and exit if critical ones are missing in production. */
export function validateEnv() {
    const errors = [];
    const warnings = [];

    if (!process.env.DATABASE_URL) {
        errors.push("DATABASE_URL is required");
    }

    if (IS_PROD) {
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "change-me" || process.env.JWT_SECRET === "dev-only-insecure-secret") {
            errors.push("JWT_SECRET must be set to a strong random secret in production (min 32 chars)");
        } else if (process.env.JWT_SECRET.length < 32) {
            warnings.push("JWT_SECRET is shorter than 32 characters — consider using a longer secret");
        }

        if (!process.env.S3_ACCESS_KEY || process.env.S3_ACCESS_KEY === "minioadmin") {
            errors.push("S3_ACCESS_KEY must be set to a real credential in production");
        }
        if (!process.env.S3_SECRET_KEY || process.env.S3_SECRET_KEY === "minioadmin") {
            errors.push("S3_SECRET_KEY must be set to a real credential in production");
        }
        if (!process.env.ALLOWED_ORIGINS) {
            warnings.push("ALLOWED_ORIGINS not set — CORS will block all cross-origin requests in production");
        }
    } else {
        // Development warnings only
        if (!process.env.JWT_SECRET) {
            warnings.push("JWT_SECRET not set — using insecure dev default. Set it before going to production.");
        }
    }

    if (warnings.length > 0) {
        console.warn("[CONFIG] Environment warnings:");
        warnings.forEach((w) => console.warn(`  ⚠  ${w}`));
    }

    if (errors.length > 0) {
        console.error("[CONFIG] Environment validation FAILED:");
        errors.forEach((e) => console.error(`  ✖  ${e}`));
        if (IS_PROD) {
            process.exit(1);
        }
    } else {
        console.log(`[CONFIG] Environment validated. mode=${NODE_ENV} port=${PORT} storage=${STORAGE_MODE}`);
    }
}
