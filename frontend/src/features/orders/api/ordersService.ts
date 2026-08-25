import { apiClient } from '../../../lib/apiClient';
import type { ListQueryParams, PaginatedResponse } from '../../../lib/pagination';
import type {
  CreateOrderFormValues,
  HoldOrderValues,
  OrderDetail,
  OrderHistoryEntry,
  OrderListItem,
  OrderStatusActionValues,
  OrderSummary,
  PaymentResult,
  RecordPaymentValues,
  RecordShipmentValues,
  ShipmentResult,
} from '../types';

interface Envelope<T> {
  success: true;
  data: T;
}

export interface OrdersListQueryParams extends ListQueryParams {
  status?: string;
}

export const ordersService = {
  async list(params: OrdersListQueryParams): Promise<PaginatedResponse<OrderListItem>> {
    const { data } = await apiClient.get<PaginatedResponse<OrderListItem>>('/orders', { params });
    return data;
  },

  async getById(id: string): Promise<OrderDetail> {
    const { data } = await apiClient.get<Envelope<OrderDetail>>(`/orders/${id}`);
    return data.data;
  },

  async getHistory(id: string): Promise<OrderHistoryEntry[]> {
    const { data } = await apiClient.get<Envelope<OrderHistoryEntry[]>>(`/orders/${id}/history`);
    return data.data;
  },

  async create(values: CreateOrderFormValues): Promise<OrderSummary> {
    const { data } = await apiClient.post<Envelope<OrderSummary>>('/orders', values);
    return data.data;
  },

  async hold(id: string, values: HoldOrderValues): Promise<OrderSummary> {
    const { data } = await apiClient.post<Envelope<OrderSummary>>(`/orders/${id}/hold`, values);
    return data.data;
  },

  async resume(id: string, values: OrderStatusActionValues): Promise<OrderSummary> {
    const { data } = await apiClient.post<Envelope<OrderSummary>>(`/orders/${id}/resume`, values);
    return data.data;
  },

  async cancel(id: string, values: OrderStatusActionValues): Promise<OrderSummary> {
    const { data } = await apiClient.post<Envelope<OrderSummary>>(`/orders/${id}/cancel`, values);
    return data.data;
  },

  async recordPayment(id: string, values: RecordPaymentValues): Promise<PaymentResult> {
    const { data } = await apiClient.post<Envelope<PaymentResult>>(`/orders/${id}/payment`, values);
    return data.data;
  },

  async recordShipment(id: string, values: RecordShipmentValues): Promise<ShipmentResult> {
    const { data } = await apiClient.post<Envelope<ShipmentResult>>(`/orders/${id}/ship`, values);
    return data.data;
  },
};
