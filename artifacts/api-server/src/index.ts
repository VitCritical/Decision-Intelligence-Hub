import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { metricsTable } from "@workspace/db";
import { seedDatabase } from "./lib/seed";

const rawPort = process.env["API_PORT"] || "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function bootstrap() {
  // Auto-seed if database is empty
  try {
    const existing = await db.select().from(metricsTable).limit(1);
    if (existing.length === 0) {
      logger.info("Empty database detected — seeding with demo data...");
      await seedDatabase();
      logger.info("Seed complete");
    }
  } catch (err) {
    logger.error({ err }, "Failed to check/seed database — continuing anyway");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

bootstrap();
