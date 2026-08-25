import { Injectable } from '@nestjs/common';
import { StoredProcedureRunner } from '../../common/database/stored-procedure-runner.service';
import { PaginationQuery } from '../../common/pipes/parse-pagination.pipe';

export interface AuditListRow {
  EntityName: string;
  EntityId: string;
  Action: string;
  ChangedByName: string | null;
  ChangedAt: string;
  TotalItems: number;
}

export interface AuditListQuery extends PaginationQuery {
  entityName?: string;
  entityId?: string;
}

/** The only class outside src/common/database allowed to call StoredProcedureRunner for the audit domain. */
@Injectable()
export class AuditRepository {
  constructor(private readonly runner: StoredProcedureRunner) {}

  list(tenantId: string, query: AuditListQuery): Promise<AuditListRow[]> {
    return this.runner.execute<AuditListRow>('usp_Audit_List', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'Page', value: query.page },
      { name: 'PageSize', value: query.pageSize },
      { name: 'SortBy', value: query.sortBy ?? null },
      { name: 'SortDir', value: query.sortDir ?? null },
      { name: 'EntityName', value: query.entityName ?? null },
      {
        name: 'EntityId',
        value: query.entityId ?? null,
        type: 'uniqueidentifier',
      },
    ]);
  }
}
