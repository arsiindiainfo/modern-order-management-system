export interface AuditEntry {
  entityName: string;
  entityId: string;
  action: string;
  changedBy: string | null;
  changedAt: string;
}
