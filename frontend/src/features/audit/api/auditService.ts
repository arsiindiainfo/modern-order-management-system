import { apiClient } from '../../../lib/apiClient';
import type { ListQueryParams, PaginatedResponse } from '../../../lib/pagination';
import type { AuditEntry } from '../types';

export interface AuditListQueryParams extends ListQueryParams {
  entityName?: string;
}

export const auditService = {
  async list(params: AuditListQueryParams): Promise<PaginatedResponse<AuditEntry>> {
    const { data } = await apiClient.get<PaginatedResponse<AuditEntry>>('/audit', { params });
    return data;
  },
};
