import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiOkPaginatedEnvelope } from '../../common/decorators/api-ok-envelope.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';
import { ParsePaginationPipe } from '../../common/pipes/parse-pagination.pipe';
import type { AuditListQuery } from './audit.repository';
import { AuditService } from './audit.service';
import { AuditEntryResponseDto } from './dto/audit-entry-response.dto';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard, TenantScopeGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('TENANT_ADMIN')
  @ApiOkPaginatedEnvelope(AuditEntryResponseDto)
  list(
    @TenantId() tenantId: string,
    @Query(ParsePaginationPipe) query: AuditListQuery,
  ) {
    return this.auditService.list(tenantId, query);
  }
}
