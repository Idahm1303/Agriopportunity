export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy?: string;
  details?: string;
  createdAt: string;
};

const auditEntries: AuditEntry[] = [];

export function addAuditEntry(input: {
  action: string;
  entityType: string;
  entityId: string;
  performedBy?: string;
  details?: string;
}) {
  const entry: AuditEntry = {
    id: `audit-${Date.now()}`,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    performedBy: input.performedBy,
    details: input.details,
    createdAt: new Date().toISOString(),
  };

  auditEntries.push(entry);
  return entry;
}

export function getAuditEntries() {
  return auditEntries;
}
