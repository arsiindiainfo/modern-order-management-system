export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'ON_HOLD'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderLine {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  grandTotal: number;
  currency: string;
  version: number;
  placedAt: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  version: number;
  placedAt: string;
}

export interface OrderDetail extends OrderSummary {
  customerName: string;
  lines: OrderLine[];
}

export interface OrderHistoryEntry {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: string | null;
  note: string | null;
  changedAt: string;
}

export interface CreateOrderFormValues {
  customerId: string;
  discountCode?: string;
  lines: { productId: string; quantity: number }[];
}

export interface RecordPaymentValues {
  provider: string;
  amount: number;
  currency: string;
  transactionRef: string;
}

export interface RecordShipmentValues {
  version: number;
  carrier: string;
  trackingNumber: string;
}

export interface OrderRef {
  id: string;
  status: OrderStatus;
  version: number;
}

export interface PaymentResult {
  paymentId: string;
  status: string;
  order: OrderRef;
}

export interface ShipmentResult {
  shipmentId: string;
  carrier: string;
  trackingNumber: string;
  order: OrderRef;
}

export interface HoldOrderValues {
  version: number;
  reason: string;
}

export interface OrderStatusActionValues {
  version: number;
  note?: string;
}
