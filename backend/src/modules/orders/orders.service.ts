import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import {
  PaginatedResult,
  toPaginatedResult,
} from '../../common/database/paginated-result.util';
import { CreateOrderDto } from './dto/create-order.dto';
import { HoldOrderDto } from './dto/hold-order.dto';
import { OrderDetailResponseDto } from './dto/order-detail-response.dto';
import { OrderHistoryEntryResponseDto } from './dto/order-history-entry-response.dto';
import { OrderListItemResponseDto } from './dto/order-list-item-response.dto';
import { OrderStatusActionDto } from './dto/order-status-action.dto';
import { OrderSummaryResponseDto } from './dto/order-summary-response.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  OrderDetailHeaderRow,
  OrderHistoryRow,
  OrderLineRow,
  OrderListItemRow,
  OrderListRow,
  OrderRow,
  OrdersListQuery,
  OrdersRepository,
} from './orders.repository';

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async list(
    tenantId: string,
    query: OrdersListQuery,
  ): Promise<PaginatedResult<OrderListItemResponseDto>> {
    const rows = await this.ordersRepository.list(tenantId, query);
    const result = toPaginatedResult<OrderListRow>(
      rows,
      query.page,
      query.pageSize,
    );
    return { ...result, data: result.data.map(toOrderListItemResponseDto) };
  }

  async getById(tenantId: string, id: string): Promise<OrderDetailResponseDto> {
    const found = await this.ordersRepository.getById(tenantId, id);
    if (!found) {
      throw new AppException('RESOURCE_NOT_FOUND', 'Order not found.');
    }
    return toOrderDetailResponseDto(found.header, found.lines);
  }

  async create(
    tenantId: string,
    actorUserId: string,
    dto: CreateOrderDto,
  ): Promise<OrderSummaryResponseDto> {
    const row = await this.ordersRepository.create(
      tenantId,
      actorUserId,
      dto.customerId,
      dto.lines,
    );
    return toOrderSummaryResponseDto(row);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateOrderDto,
  ): Promise<OrderSummaryResponseDto> {
    const row = await this.ordersRepository.update(
      tenantId,
      id,
      dto.version,
      dto.customerId,
    );
    return toOrderSummaryResponseDto(row as OrderRow);
  }

  async hold(
    tenantId: string,
    actorUserId: string,
    id: string,
    dto: HoldOrderDto,
  ): Promise<OrderSummaryResponseDto> {
    const row = await this.ordersRepository.updateStatus(
      tenantId,
      actorUserId,
      id,
      dto.version,
      'ON_HOLD',
      dto.reason,
    );
    return toOrderSummaryResponseDto(row as OrderRow);
  }

  /**
   * Fixed to PENDING: every order this phase can produce starts (and can
   * only be held from) PENDING, since CONFIRMED/PROCESSING aren't reachable
   * without Phase 4's payment/shipping flows. dbo.ufn_LegalOrderTransitions()
   * already has an ON_HOLD -> PROCESSING edge too (§8's diagram) for when
   * Phase 4 needs it — at that point this method will need to look up
   * what the order's status was before the hold (from OrderStatusHistory)
   * rather than assume a single fixed target.
   */
  async resume(
    tenantId: string,
    actorUserId: string,
    id: string,
    dto: OrderStatusActionDto,
  ): Promise<OrderSummaryResponseDto> {
    const row = await this.ordersRepository.updateStatus(
      tenantId,
      actorUserId,
      id,
      dto.version,
      'PENDING',
      dto.note,
    );
    return toOrderSummaryResponseDto(row as OrderRow);
  }

  async cancel(
    tenantId: string,
    actorUserId: string,
    id: string,
    dto: OrderStatusActionDto,
  ): Promise<OrderSummaryResponseDto> {
    const row = await this.ordersRepository.updateStatus(
      tenantId,
      actorUserId,
      id,
      dto.version,
      'CANCELLED',
      dto.note,
    );
    return toOrderSummaryResponseDto(row as OrderRow);
  }

  async getHistory(
    tenantId: string,
    id: string,
  ): Promise<OrderHistoryEntryResponseDto[]> {
    const rows = await this.ordersRepository.getHistory(tenantId, id);
    return rows.map(toOrderHistoryEntryResponseDto);
  }
}

function toOrderSummaryResponseDto(row: OrderRow): OrderSummaryResponseDto {
  return {
    id: row.Id,
    orderNumber: row.OrderNumber,
    customerId: row.CustomerId,
    status: row.Status,
    currency: row.Currency,
    subtotal: Number(row.Subtotal),
    discountTotal: Number(row.DiscountTotal),
    taxTotal: Number(row.TaxTotal),
    shippingTotal: Number(row.ShippingTotal),
    grandTotal: Number(row.GrandTotal),
    version: row.Version,
    placedAt: row.PlacedAt,
  };
}

function toOrderListItemResponseDto(
  row: OrderListItemRow,
): OrderListItemResponseDto {
  return {
    id: row.Id,
    orderNumber: row.OrderNumber,
    customerName: row.CustomerName,
    status: row.Status,
    grandTotal: Number(row.GrandTotal),
    currency: row.Currency,
    version: row.Version,
    placedAt: row.PlacedAt,
  };
}

function toOrderDetailResponseDto(
  header: OrderDetailHeaderRow,
  lines: OrderLineRow[],
): OrderDetailResponseDto {
  return {
    ...toOrderSummaryResponseDto(header),
    customerName: header.CustomerName,
    lines: lines.map((line) => ({
      id: line.Id,
      productId: line.ProductId,
      productName: line.ProductName,
      unitPrice: Number(line.UnitPrice),
      quantity: line.Quantity,
      lineTotal: Number(line.LineTotal),
    })),
  };
}

function toOrderHistoryEntryResponseDto(
  row: OrderHistoryRow,
): OrderHistoryEntryResponseDto {
  return {
    fromStatus: row.FromStatus,
    toStatus: row.ToStatus,
    changedBy: row.ChangedByName,
    note: row.Note,
    changedAt: row.ChangedAt,
  };
}
