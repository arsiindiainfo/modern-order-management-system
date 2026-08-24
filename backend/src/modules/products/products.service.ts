import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import {
  PaginatedResult,
  toPaginatedResult,
} from '../../common/database/paginated-result.util';
import { PaginationQuery } from '../../common/pipes/parse-pagination.pipe';
import {
  InventoryRow,
  ProductListRow,
  ProductRow,
  ProductsRepository,
} from './products.repository';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { InventoryResponseDto } from './dto/inventory-response.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async list(
    tenantId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResult<ProductResponseDto>> {
    const rows = await this.productsRepository.list(tenantId, query);
    const result = toPaginatedResult<ProductListRow>(
      rows,
      query.page,
      query.pageSize,
    );
    return { ...result, data: result.data.map(toProductResponseDto) };
  }

  async getById(tenantId: string, id: string): Promise<ProductResponseDto> {
    const row = await this.productsRepository.getById(tenantId, id);
    if (!row) {
      throw new AppException('RESOURCE_NOT_FOUND', 'Product not found.');
    }
    return toProductResponseDto(row);
  }

  async create(
    tenantId: string,
    dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const row = await this.productsRepository.create(tenantId, dto);
    return toProductResponseDto(row);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const row = await this.productsRepository.update(tenantId, id, dto);
    return toProductResponseDto(row);
  }

  async deactivate(tenantId: string, id: string): Promise<void> {
    await this.productsRepository.deactivate(tenantId, id);
  }

  async getInventory(
    tenantId: string,
    productId: string,
  ): Promise<InventoryResponseDto> {
    const row = await this.productsRepository.getInventory(tenantId, productId);
    if (!row) {
      throw new AppException('RESOURCE_NOT_FOUND', 'Product not found.');
    }
    return toInventoryResponseDto(row);
  }

  async adjustInventory(
    tenantId: string,
    productId: string,
    dto: AdjustInventoryDto,
  ): Promise<InventoryResponseDto> {
    const row = await this.productsRepository.adjustInventory(
      tenantId,
      productId,
      dto.quantityDelta,
      dto.reason,
    );
    if (!row) {
      throw new AppException('RESOURCE_NOT_FOUND', 'Product not found.');
    }
    return toInventoryResponseDto(row);
  }
}

function toProductResponseDto(row: ProductRow): ProductResponseDto {
  return {
    id: row.Id,
    sku: row.Sku,
    name: row.Name,
    unitPrice: Number(row.UnitPrice),
    currency: row.Currency,
    isActive: row.IsActive,
    createdAt: row.CreatedAt,
  };
}

function toInventoryResponseDto(row: InventoryRow): InventoryResponseDto {
  return {
    productId: row.ProductId,
    sku: row.Sku,
    quantityOnHand: row.QuantityOnHand,
    quantityReserved: row.QuantityReserved,
    quantityAvailable: row.QuantityAvailable,
    reorderLevel: row.ReorderLevel,
  };
}
