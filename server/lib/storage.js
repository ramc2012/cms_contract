import {
    S3Client,
    CreateBucketCommand,
    GetObjectCommand,
    HeadBucketCommand,
    PutObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { STORAGE_MODE, S3_BUCKET, S3_CONFIG } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const LOCAL_UPLOAD_DIR = path.join(ROOT_DIR, "uploads");

let s3Client = null;

if (STORAGE_MODE === "s3") {
    s3Client = new S3Client({
        region: S3_CONFIG.region,
        endpoint: S3_CONFIG.endpoint,
        forcePathStyle: true,
        credentials: {
            accessKeyId: S3_CONFIG.accessKeyId,
            secretAccessKey: S3_CONFIG.secretAccessKey,
        },
    });
}

fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });

export async function ensureBucketIfNeeded() {
    if (!s3Client) return;
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    } catch {
        await s3Client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    }
}

export async function uploadDocumentObject(file) {
    const objectKey = `${Date.now()}-${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "-")}`;

    if (s3Client) {
        await s3Client.send(
            new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: objectKey,
                Body: file.buffer,
                ContentType: file.mimetype,
            })
        );
        return { objectKey, size: file.size, mimeType: file.mimetype };
    }

    const target = path.join(LOCAL_UPLOAD_DIR, objectKey);
    await fs.promises.writeFile(target, file.buffer);
    return { objectKey, size: file.size, mimeType: file.mimetype };
}

export async function streamDocumentObject(res, document) {
    if (!document.objectKey) {
        res.status(404).json({ message: "No file attached" });
        return;
    }

    res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(document.name)}"`);

    if (s3Client) {
        const result = await s3Client.send(
            new GetObjectCommand({ Bucket: S3_BUCKET, Key: document.objectKey })
        );
        result.Body.pipe(res);
        return;
    }

    const localPath = path.join(LOCAL_UPLOAD_DIR, document.objectKey);
    if (!fs.existsSync(localPath)) {
        res.status(404).json({ message: "Stored file not found" });
        return;
    }

    fs.createReadStream(localPath).pipe(res);
}
