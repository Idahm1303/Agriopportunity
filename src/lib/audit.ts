import { prisma } from "@/lib/prisma";

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy?: string;
  details?: string;
  createdAt: string;
};

export async function addAuditEntry(input: {
  action: string;
  entityType: string;
  entityId: string;
  performedBy?: string;
  details?: string;
}) {
  return prisma.auditLog.create({ data: input });
}

export async function getAuditEntries(filters?: {
  action?: string;
  entityType?: string;
  performedBy?: string;
}) {
  return prisma.auditLog.findMany({
    where: {
      ...(filters?.action ? { action: filters.action } : {}),
      ...(filters?.entityType ? { entityType: filters.entityType } : {}),
      ...(filters?.performedBy ? { performedBy: filters.performedBy } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}
