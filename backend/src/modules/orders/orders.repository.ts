import { Injectable } from '@nestjs/common';
import * as mssql from 'mssql';
import { StoredProcedureRunner } from '../../common/database/stored-procedure-runner.service';
import { PaginationQuery } from '../../common/pipes/parse-pagination.pipe';

export interface OrderRow {
  Id: string;
  OrderNumber: string;
  CustomerId: string;
  Status: string;
  Currency: string;
  Subtotal: number;
  DiscountTotal: number;
  TaxTotal: number;
  ShippingTotal: number;
  GrandTotal: number;
  Version: number;
  PlacedAt: string;
}

export interface OrderDetailHeaderRow extends OrderRow {
  CustomerName: string;
}

export interface OrderLineRow {
  Id: string;
  ProductId: string;
  ProductName: string;
  UnitPrice: number;
  Quantity: number;
  LineTotal: number;
}

export interface OrderListItemRow {
  Id: string;
  OrderNumber: string;
  CustomerName: string;
  Status: string;
  GrandTotal: number;
  Currency: string;
  Version: number;
  PlacedAt: string;
}

export interface OrderListRow extends OrderListItemRow {
  TotalItems: number;
}

export interface PaymentResultRow {
  PaymentId: string;
  PaymentStatus: string;
  OrderId: string;
  OrderStatus: string;
  OrderVersion: number;
}

export interface ShipmentResultRow {
  ShipmentId: string;
  Carrier: string;
  TrackingNumber: string;
  OrderId: string;
  OrderStatus: string;
  OrderVersion: number;
}

export interface OrderHistoryRow {
  FromStatus: string | null;
  ToStatus: string;
  ChangedByName: string | null;
  Note: string | null;
  ChangedAt: string;
}

export interface OrderLineInput {
  productId: string;
  quantity: number;
}

export interface OrdersListQuery extends PaginationQuery {
  status?: string;
}

/** Builds the Pattern B (§6.3) table-valued parameter for usp_Orders_Create's @Lines. */
function buildOrderLinesTable(lines: OrderLineInput[]): mssql.Table {
  const table = new mssql.Table('dbo.OrderLineInput');
  table.columns.add('ProductId', mssql.UniqueIdentifier);
  table.columns.add('Quantity', mssql.Int);
  for (const line of lines) {
    table.rows.add(line.productId, line.quantity);
  }
  return table;
}

/** The only class outside src/common/database allowed to call StoredProcedureRunner for the orders domain. */
@Injectable()
export class OrdersRepository {
  constructor(private readonly runner: StoredProcedureRunner) {}

  list(tenantId: string, query: OrdersListQuery): Promise<OrderListRow[]> {
    return this.runner.execute<OrderListRow>('usp_Orders_List', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'Page', value: query.page },
      { name: 'PageSize', value: query.pageSize },
      { name: 'SortBy', value: query.sortBy ?? null },
      { name: 'SortDir', value: query.sortDir ?? null },
      { name: 'Search', value: query.search ?? null },
      { name: 'Status', value: query.status ?? null },
    ]);
  }

  async getById(
    tenantId: string,
    id: string,
  ): Promise<
    { header: OrderDetailHeaderRow; lines: OrderLineRow[] } | undefined
  > {
    const [headerRows, lineRows] = await this.runner.executeMultiple<
      Record<string, unknown>
    >('usp_Orders_GetById', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'Id', value: id, type: 'uniqueidentifier' },
    ]);
    const header = headerRows[0] as unknown as OrderDetailHeaderRow | undefined;
    if (!header) return undefined;
    return { header, lines: lineRows as unknown as OrderLineRow[] };
  }

  async create(
    tenantId: string,
    actorUserId: string,
    customerId: string,
    lines: OrderLineInput[],
    discountCode?: string,
  ): Promise<OrderRow> {
    const rows = await this.runner.execute<OrderRow>('usp_Orders_Create', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'ActorUserId', value: actorUserId, type: 'uniqueidentifier' },
      { name: 'CustomerId', value: customerId, type: 'uniqueidentifier' },
      { name: 'DiscountCode', value: discountCode ?? null },
      { name: 'Lines', value: buildOrderLinesTable(lines) },
    ]);
    return rows[0];
  }

  async update(
    tenantId: string,
    actorUserId: string,
    id: string,
    expectedVersion: number,
    customerId: string,
  ): Promise<OrderRow | undefined> {
    const rows = await this.runner.execute<OrderRow>('usp_Orders_Update', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'ActorUserId', value: actorUserId, type: 'uniqueidentifier' },
      { name: 'Id', value: id, type: 'uniqueidentifier' },
      { name: 'ExpectedVersion', value: expectedVersion },
      { name: 'CustomerId', value: customerId, type: 'uniqueidentifier' },
    ]);
    return rows[0];
  }

  async updateStatus(
    tenantId: string,
    actorUserId: string,
    orderId: string,
    expectedVersion: number,
    toStatus: string,
    note?: string,
  ): Promise<OrderRow | undefined> {
    const rows = await this.runner.execute<OrderRow>(
      'usp_Orders_UpdateStatus',
      [
        { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
        { name: 'ActorUserId', value: actorUserId, type: 'uniqueidentifier' },
        { name: 'OrderId', value: orderId, type: 'uniqueidentifier' },
        { name: 'ExpectedVersion', value: expectedVersion },
        { name: 'ToStatus', value: toStatus },
        { name: 'Note', value: note ?? null },
      ],
    );
    return rows[0];
  }

  async recordPayment(
    tenantId: string,
    actorUserId: string,
    orderId: string,
    provider: string,
    amount: number,
    currency: string,
    transactionRef: string,
  ): Promise<PaymentResultRow> {
    const rows = await this.runner.execute<PaymentResultRow>(
      'usp_Orders_RecordPayment',
      [
        { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
        { name: 'ActorUserId', value: actorUserId, type: 'uniqueidentifier' },
        { name: 'OrderId', value: orderId, type: 'uniqueidentifier' },
        { name: 'Provider', value: provider },
        {
          name: 'Amount',
          value: amount,
          type: 'decimal',
          typeParams: [12, 2],
        },
        { name: 'Currency', value: currency },
        { name: 'TransactionRef', value: transactionRef },
      ],
    );
    return rows[0];
  }

  async recordShipment(
    tenantId: string,
    actorUserId: string,
    orderId: string,
    expectedVersion: number,
    carrier: string,
    trackingNumber: string,
  ): Promise<ShipmentResultRow> {
    const rows = await this.runner.execute<ShipmentResultRow>(
      'usp_Orders_RecordShipment',
      [
        { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
        { name: 'ActorUserId', value: actorUserId, type: 'uniqueidentifier' },
        { name: 'OrderId', value: orderId, type: 'uniqueidentifier' },
        { name: 'ExpectedVersion', value: expectedVersion },
        { name: 'Carrier', value: carrier },
        { name: 'TrackingNumber', value: trackingNumber },
      ],
    );
    return rows[0];
  }

  getHistory(tenantId: string, orderId: string): Promise<OrderHistoryRow[]> {
    return this.runner.execute<OrderHistoryRow>('usp_Orders_GetHistory', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'OrderId', value: orderId, type: 'uniqueidentifier' },
    ]);
  }
}
