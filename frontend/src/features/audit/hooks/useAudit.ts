import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { auditService, type AuditListQueryParams } from '../api/auditService';

const AUDIT_KEY = 'audit';

export function useAudit(params: AuditListQueryParams) {
  return useQuery({
    queryKey: [AUDIT_KEY, params],
    queryFn: () => auditService.list(params),
    placeholderData: keepPreviousData,
  });
}
