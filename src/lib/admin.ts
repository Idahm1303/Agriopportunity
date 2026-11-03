import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getAdminSystemHealth() {
  const startedAt = Date.now();
  let database: "available" | "unavailable" = "available";

  try {
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
  } catch {
    database = "unavailable";
    console.error("Administrator database health check failed.");
  }

  const storageConfigured = Boolean(
    process.env.AWS_S3_BUCKET &&
      process.env.AWS_ENDPOINT_URL_S3 &&
      process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );

  return {
    database,
    databaseResponseTimeMs: Date.now() - startedAt,
    storageConfigured,
    checkedAt: new Date(),
  };
}
