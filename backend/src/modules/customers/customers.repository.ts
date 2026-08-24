import { Injectable } from '@nestjs/common';
import { StoredProcedureRunner } from '../../common/database/stored-procedure-runner.service';
import { PaginationQuery } from '../../common/pipes/parse-pagination.pipe';

export interface CustomerRow {
  Id: string;
  Name: string;
  Email: string;
  Phone: string | null;
  BillingAddress: string | null;
  ShippingAddress: string | null;
  IsActive: boolean;
  CreatedAt: string;
}

export interface CustomerListRow extends CustomerRow {
  TotalItems: number;
}

export interface CustomerWriteInput {
  name: string;
  email: string;
  phone?: string;
  billingAddress?: unknown;
  shippingAddress?: unknown;
}

/** The only class outside src/common/database allowed to call StoredProcedureRunner for the customers domain. */
@Injectable()
export class CustomersRepository {
  constructor(private readonly runner: StoredProcedureRunner) {}

  list(tenantId: string, query: PaginationQuery): Promise<CustomerListRow[]> {
    return this.runner.execute<CustomerListRow>('usp_Customers_List', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'Page', value: query.page },
      { name: 'PageSize', value: query.pageSize },
      { name: 'SortBy', value: query.sortBy ?? null },
      { name: 'SortDir', value: query.sortDir ?? null },
      { name: 'Search', value: query.search ?? null },
    ]);
  }

  async getById(
    tenantId: string,
    id: string,
  ): Promise<CustomerRow | undefined> {
    const rows = await this.runner.execute<CustomerRow>(
      'usp_Customers_GetById',
      [
        { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
        { name: 'Id', value: id, type: 'uniqueidentifier' },
      ],
    );
    return rows[0];
  }

  async create(
    tenantId: string,
    input: CustomerWriteInput,
  ): Promise<CustomerRow> {
    const rows = await this.runner.execute<CustomerRow>(
      'usp_Customers_Create',
      [
        { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
        { name: 'Name', value: input.name },
        { name: 'Email', value: input.email },
        { name: 'Phone', value: input.phone ?? null },
        {
          name: 'BillingAddress',
          value: serializeAddress(input.billingAddress),
        },
        {
          name: 'ShippingAddress',
          value: serializeAddress(input.shippingAddress),
        },
      ],
    );
    return rows[0];
  }

  async update(
    tenantId: string,
    id: string,
    input: CustomerWriteInput,
  ): Promise<CustomerRow> {
    const rows = await this.runner.execute<CustomerRow>(
      'usp_Customers_Update',
      [
        { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
        { name: 'Id', value: id, type: 'uniqueidentifier' },
        { name: 'Name', value: input.name },
        { name: 'Email', value: input.email },
        { name: 'Phone', value: input.phone ?? null },
        {
          name: 'BillingAddress',
          value: serializeAddress(input.billingAddress),
        },
        {
          name: 'ShippingAddress',
          value: serializeAddress(input.shippingAddress),
        },
      ],
    );
    return rows[0];
  }

  async deactivate(tenantId: string, id: string): Promise<void> {
    await this.runner.execute('usp_Customers_Deactivate', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'Id', value: id, type: 'uniqueidentifier' },
    ]);
  }
}

function serializeAddress(address: unknown): string | null {
  return address ? JSON.stringify(address) : null;
}
