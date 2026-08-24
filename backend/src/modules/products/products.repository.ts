import { Injectable } from '@nestjs/common';
import { StoredProcedureRunner } from '../../common/database/stored-procedure-runner.service';
import { PaginationQuery } from '../../common/pipes/parse-pagination.pipe';

export interface ProductRow {
  Id: string;
  Sku: string;
  Name: string;
  UnitPrice: number;
  Currency: string;
  IsActive: boolean;
  CreatedAt: string;
}

export interface ProductListRow extends ProductRow {
  TotalItems: number;
}

export interface InventoryRow {
  ProductId: string;
  Sku: string;
  QuantityOnHand: number;
  QuantityReserved: number;
  QuantityAvailable: number;
  ReorderLevel: number;
}

export interface ProductWriteInput {
  name: string;
  unitPrice: number;
  currency?: string;
}

export interface ProductCreateInput extends ProductWriteInput {
  sku: string;
  initialStock?: number;
  reorderLevel?: number;
}

/** The only class outside src/common/database allowed to call StoredProcedureRunner for the products/inventory domain. */
@Injectable()
export class ProductsRepository {
  constructor(private readonly runner: StoredProcedureRunner) {}

  list(tenantId: string, query: PaginationQuery): Promise<ProductListRow[]> {
    return this.runner.execute<ProductListRow>('usp_Products_List', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'Page', value: query.page },
      { name: 'PageSize', value: query.pageSize },
      { name: 'SortBy', value: query.sortBy ?? null },
      { name: 'SortDir', value: query.sortDir ?? null },
      { name: 'Search', value: query.search ?? null },
    ]);
  }

  async getById(tenantId: string, id: string): Promise<ProductRow | undefined> {
    const rows = await this.runner.execute<ProductRow>('usp_Products_GetById', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'Id', value: id, type: 'uniqueidentifier' },
    ]);
    return rows[0];
  }

  async create(
    tenantId: string,
    input: ProductCreateInput,
  ): Promise<ProductRow> {
    const rows = await this.runner.execute<ProductRow>('usp_Products_Create', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'Sku', value: input.sku },
      { name: 'Name', value: input.name },
      {
        name: 'UnitPrice',
        value: input.unitPrice,
        type: 'decimal',
        typeParams: [12, 2],
      },
      { name: 'Currency', value: input.currency ?? 'USD' },
      { name: 'InitialStock', value: input.initialStock ?? 0 },
      { name: 'ReorderLevel', value: input.reorderLevel ?? 0 },
    ]);
    return rows[0];
  }

  async update(
    tenantId: string,
    id: string,
    input: ProductWriteInput,
  ): Promise<ProductRow> {
    const rows = await this.runner.execute<ProductRow>('usp_Products_Update', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'Id', value: id, type: 'uniqueidentifier' },
      { name: 'Name', value: input.name },
      {
        name: 'UnitPrice',
        value: input.unitPrice,
        type: 'decimal',
        typeParams: [12, 2],
      },
      { name: 'Currency', value: input.currency ?? 'USD' },
    ]);
    return rows[0];
  }

  async deactivate(tenantId: string, id: string): Promise<void> {
    await this.runner.execute('usp_Products_Deactivate', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'Id', value: id, type: 'uniqueidentifier' },
    ]);
  }

  async getInventory(
    tenantId: string,
    productId: string,
  ): Promise<InventoryRow | undefined> {
    const rows = await this.runner.execute<InventoryRow>(
      'usp_Products_GetInventory',
      [
        { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
        { name: 'ProductId', value: productId, type: 'uniqueidentifier' },
      ],
    );
    return rows[0];
  }

  async adjustInventory(
    tenantId: string,
    productId: string,
    quantityDelta: number,
    reason: string,
  ): Promise<InventoryRow | undefined> {
    const rows = await this.runner.execute<InventoryRow>(
      'usp_Inventory_Adjust',
      [
        { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
        { name: 'ProductId', value: productId, type: 'uniqueidentifier' },
        { name: 'QuantityDelta', value: quantityDelta },
        { name: 'Reason', value: reason },
      ],
    );
    return rows[0];
  }
}
