import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  defaultPlatformSettings,
  platformSettingsSchema,
  type PlatformSettings,
} from "@/lib/platform-settings-schema";

const platformSettingsKey = "platform";

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const record = await prisma.systemSetting.findUnique({ where: { key: platformSettingsKey } });
  if (!record) return defaultPlatformSettings;

  const parsed = platformSettingsSchema.safeParse(record.value);
  if (!parsed.success) throw new Error("Stored platform settings are invalid. Please review them in admin settings.");
  return parsed.data;
}

export async function savePlatformSettings(
  settings: PlatformSettings,
  adminId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const saved = await transaction.systemSetting.upsert({
      where: { key: platformSettingsKey },
      create: {
        key: platformSettingsKey,
        value: settings as Prisma.InputJsonValue,
        updatedBy: adminId,
      },
      update: {
        value: settings as Prisma.InputJsonValue,
        updatedBy: adminId,
      },
    });
    await transaction.auditLog.create({
      data: {
        action: "platform_settings_updated",
        entityType: "system_settings",
        entityId: platformSettingsKey,
        performedBy: adminId,
        details: "Administrator updated platform settings.",
      },
    });
    return saved;
  });
}

function hashEmail(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function isLoginLocked(email: string) {
  const attempt = await prisma.loginAttempt.findUnique({ where: { emailHash: hashEmail(email) } });
  return Boolean(attempt?.lockedUntil && attempt.lockedUntil > new Date());
}

function isRetryableTransactionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" || error.code === "P2002");
}

export async function recordFailedLogin(
  email: string,
  settings: Pick<PlatformSettings, "loginAttemptLimit" | "loginLockoutMinutes">,
) {
  const emailHash = hashEmail(email);
  let lastError: unknown;

  for (let retry = 0; retry < 3; retry += 1) {
    try {
      await prisma.$transaction(async (transaction) => {
        const now = new Date();
        const windowStart = new Date(now.getTime() - settings.loginLockoutMinutes * 60_000);
        const current = await transaction.loginAttempt.findUnique({ where: { emailHash } });
        if (current?.lockedUntil && current.lockedUntil > now) return;

        const withinWindow = current && current.windowStartedAt > windowStart;
        const attempts = withinWindow ? current.attempts + 1 : 1;
        await transaction.loginAttempt.upsert({
          where: { emailHash },
          create: {
            emailHash,
            attempts,
            windowStartedAt: now,
            lockedUntil: attempts >= settings.loginAttemptLimit
              ? new Date(now.getTime() + settings.loginLockoutMinutes * 60_000)
              : null,
          },
          update: {
            attempts,
            windowStartedAt: withinWindow ? current.windowStartedAt : now,
            lockedUntil: attempts >= settings.loginAttemptLimit
              ? new Date(now.getTime() + settings.loginLockoutMinutes * 60_000)
              : null,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return;
    } catch (error) {
      lastError = error;
      if (!isRetryableTransactionError(error) || retry === 2) throw error;
    }
  }

  throw lastError;
}

export async function clearFailedLogins(email: string) {
  await prisma.loginAttempt.deleteMany({ where: { emailHash: hashEmail(email) } });
}
