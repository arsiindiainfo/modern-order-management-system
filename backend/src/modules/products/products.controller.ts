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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';
import { ParsePaginationPipe } from '../../common/pipes/parse-pagination.pipe';
import type { PaginationQuery } from '../../common/pipes/parse-pagination.pipe';
import type { AuthUser } from '../../common/types/auth-user.interface';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { InventoryResponseDto } from './dto/inventory-response.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard, TenantScopeGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOkPaginatedEnvelope(ProductResponseDto)
  list(
    @TenantId() tenantId: string,
    @Query(ParsePaginationPipe) query: PaginationQuery,
  ) {
    return this.productsService.list(tenantId, query);
  }

  @Get(':id')
  @ApiOkEnvelope(ProductResponseDto)
  getById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.productsService.getById(tenantId, id);
  }

  @Post()
  @Roles('TENANT_ADMIN', 'MANAGER')
  @ApiOkEnvelope(ProductResponseDto)
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(tenantId, user.userId, dto);
  }

  @Put(':id')
  @Roles('TENANT_ADMIN', 'MANAGER')
  @ApiOkEnvelope(ProductResponseDto)
  update(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(tenantId, user.userId, id, dto);
  }

  @Delete(':id')
  @Roles('TENANT_ADMIN')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    await this.productsService.deactivate(tenantId, user.userId, id);
    return { deactivated: true };
  }

  @Get(':id/inventory')
  @ApiOkEnvelope(InventoryResponseDto)
  getInventory(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.productsService.getInventory(tenantId, id);
  }

  @Put(':id/inventory')
  @Roles('TENANT_ADMIN', 'MANAGER')
  @ApiOkEnvelope(InventoryResponseDto)
  adjustInventory(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.productsService.adjustInventory(tenantId, user.userId, id, dto);
  }
}
