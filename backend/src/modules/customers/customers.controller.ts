import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiOkEnvelope,
  ApiOkPaginatedEnvelope,
} from '../../common/decorators/api-ok-envelope.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';
import { ParsePaginationPipe } from '../../common/pipes/parse-pagination.pipe';
import type { PaginationQuery } from '../../common/pipes/parse-pagination.pipe';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard, TenantScopeGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOkPaginatedEnvelope(CustomerResponseDto)
  list(
    @TenantId() tenantId: string,
    @Query(ParsePaginationPipe) query: PaginationQuery,
  ) {
    return this.customersService.list(tenantId, query);
  }

  @Get(':id')
  @ApiOkEnvelope(CustomerResponseDto)
  getById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.customersService.getById(tenantId, id);
  }

  @Post()
  @Roles('TENANT_ADMIN', 'MANAGER')
  @ApiOkEnvelope(CustomerResponseDto)
  create(@TenantId() tenantId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(tenantId, dto);
  }

  @Put(':id')
  @Roles('TENANT_ADMIN', 'MANAGER')
  @ApiOkEnvelope(CustomerResponseDto)
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('TENANT_ADMIN')
  @HttpCode(HttpStatus.OK)
  async deactivate(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.customersService.deactivate(tenantId, id);
    return { deactivated: true };
  }
}
