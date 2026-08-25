import { Injectable } from '@nestjs/common';
import { StoredProcedureRunner } from '../../common/database/stored-procedure-runner.service';
import { PaginationQuery } from '../../common/pipes/parse-pagination.pipe';

export interface DiscountRow {
  Id: string;
  Code: string;
  Type: string;
  Value: number;
  StartsAt: string;
  EndsAt: string;
  UsageLimit: number | null;
  TimesUsed: number;
  IsActive: boolean;
}

export interface DiscountListRow extends DiscountRow {
  TotalItems: number;
}

export interface DiscountValidationRow {
  Code: string;
  Type: string;
  Value: number;
  DiscountAmount: number;
}

export interface CreateDiscountInput {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  startsAt: string;
  endsAt: string;
  usageLimit?: number;
}

/** The only class outside src/common/database allowed to call StoredProcedureRunner for the discounts domain. */
@Injectable()
export class DiscountsRepository {
  constructor(private readonly runner: StoredProcedureRunner) {}

  list(tenantId: string, query: PaginationQuery): Promise<DiscountListRow[]> {
    return this.runner.execute<DiscountListRow>('usp_Discounts_List', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'Page', value: query.page },
      { name: 'PageSize', value: query.pageSize },
      { name: 'SortBy', value: query.sortBy ?? null },
      { name: 'SortDir', value: query.sortDir ?? null },
      { name: 'Search', value: query.search ?? null },
    ]);
  }

  async create(
    tenantId: string,
    actorUserId: string,
    input: CreateDiscountInput,
  ): Promise<DiscountRow> {
    const rows = await this.runner.execute<DiscountRow>(
      'usp_Discounts_Create',
      [
        { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
        { name: 'ActorUserId', value: actorUserId, type: 'uniqueidentifier' },
        { name: 'Code', value: input.code },
        { name: 'Type', value: input.type },
        {
          name: 'Value',
          value: input.value,
          type: 'decimal',
          typeParams: [12, 2],
        },
        {
          name: 'StartsAt',
          value: new Date(input.startsAt),
          type: 'datetime2',
          typeParams: [3],
        },
        {
          name: 'EndsAt',
          value: new Date(input.endsAt),
          type: 'datetime2',
          typeParams: [3],
        },
        { name: 'UsageLimit', value: input.usageLimit ?? null },
      ],
    );
    return rows[0];
  }

  async validate(
    tenantId: string,
    code: string,
    subtotal: number,
  ): Promise<DiscountValidationRow | undefined> {
    const rows = await this.runner.execute<DiscountValidationRow>(
      'usp_Discounts_Validate',
      [
        { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
        { name: 'Code', value: code },
        {
          name: 'Subtotal',
          value: subtotal,
          type: 'decimal',
          typeParams: [12, 2],
        },
      ],
    );
    return rows[0];
  }
}
