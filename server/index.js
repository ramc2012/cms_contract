/* global process */
import { PORT, AUTO_SEED, validateEnv } from "./config.js";
import app from "./app.js";
import prisma from "./lib/prisma.js";
import { ensureBucketIfNeeded } from "./lib/storage.js";
import { seedDatabase } from "./seed.js";

validateEnv();

async function bootstrap() {
  if (AUTO_SEED) {
    await seedDatabase(prisma, {
      reset: false,
      logger: console,
    }).catch((error) => {
      console.warn("Seed skipped/failed during bootstrap:", error.message);
    });
  }

  await ensureBucketIfNeeded();

  const server = app.listen(PORT, () => {
    console.log(`FMS Track API running on http://localhost:${PORT}`);
  });

  /* ── Graceful shutdown ── */
  const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log("Server closed, database disconnected.");
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((error) => {
  console.error("Startup failed:", error);
  process.exit(1);
});
