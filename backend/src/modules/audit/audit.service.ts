import { Injectable } from '@nestjs/common';
import {
  PaginatedResult,
  toPaginatedResult,
} from '../../common/database/paginated-result.util';
import { AuditEntryResponseDto } from './dto/audit-entry-response.dto';
import {
  AuditListQuery,
  AuditListRow,
  AuditRepository,
} from './audit.repository';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async list(
    tenantId: string,
    query: AuditListQuery,
  ): Promise<PaginatedResult<AuditEntryResponseDto>> {
    const rows = await this.auditRepository.list(tenantId, query);
    const result = toPaginatedResult<AuditListRow>(
      rows,
      query.page,
      query.pageSize,
    );
    return { ...result, data: result.data.map(toAuditEntryResponseDto) };
  }
}

function toAuditEntryResponseDto(
  row: Omit<AuditListRow, 'TotalItems'>,
): AuditEntryResponseDto {
  return {
    entityName: row.EntityName,
    entityId: row.EntityId,
    action: row.Action,
    changedBy: row.ChangedByName,
    changedAt: row.ChangedAt,
  };
}
