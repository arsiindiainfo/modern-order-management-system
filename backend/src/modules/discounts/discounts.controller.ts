import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiOkEnvelope,
  ApiOkPaginatedEnvelope,
} from '../../common/decorators/api-ok-envelope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';
import { ParsePaginationPipe } from '../../common/pipes/parse-pagination.pipe';
import type { PaginationQuery } from '../../common/pipes/parse-pagination.pipe';
import type { AuthUser } from '../../common/types/auth-user.interface';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { DiscountResponseDto } from './dto/discount-response.dto';
import { DiscountValidationResponseDto } from './dto/discount-validation-response.dto';
import { ValidateDiscountDto } from './dto/validate-discount.dto';

@ApiTags('discounts')
@Controller('discounts')
@UseGuards(JwtAuthGuard, RolesGuard, TenantScopeGuard)
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get()
  @Roles('TENANT_ADMIN', 'MANAGER')
  @ApiOkPaginatedEnvelope(DiscountResponseDto)
  list(
    @TenantId() tenantId: string,
    @Query(ParsePaginationPipe) query: PaginationQuery,
  ) {
    return this.discountsService.list(tenantId, query);
  }

  @Post()
  @Roles('TENANT_ADMIN')
  @ApiOkEnvelope(DiscountResponseDto)
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDiscountDto,
  ) {
    return this.discountsService.create(tenantId, user.userId, dto);
  }

  @Post('validate')
  @ApiOkEnvelope(DiscountValidationResponseDto)
  validate(@TenantId() tenantId: string, @Body() dto: ValidateDiscountDto) {
    return this.discountsService.validate(tenantId, dto.code, dto.subtotal);
  }
}
