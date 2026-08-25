import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersService, type OrdersListQueryParams } from '../api/ordersService';
import type {
  CreateOrderFormValues,
  HoldOrderValues,
  OrderDetail,
  OrderStatus,
  OrderStatusActionValues,
  RecordPaymentValues,
  RecordShipmentValues,
} from '../types';

const ORDERS_KEY = 'orders';
const ORDER_HISTORY_KEY = 'order-history';

export function useOrders(params: OrdersListQueryParams) {
  return useQuery({
    queryKey: [ORDERS_KEY, params],
    queryFn: () => ordersService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: [ORDERS_KEY, id],
    queryFn: () => ordersService.getById(id!),
    enabled: !!id,
  });
}

export function useOrderHistory(id: string | undefined) {
  return useQuery({
    queryKey: [ORDER_HISTORY_KEY, id],
    queryFn: () => ordersService.getHistory(id!),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateOrderFormValues) => ordersService.create(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}

/**
 * Shared by hold/resume/cancel — the one place (§21) the frontend must
 * optimistically flip the order's status/version in the React Query cache
 * before the network round trip resolves, rolling back on failure (e.g. a
 * stale version losing the race to another user's concurrent change).
 */
function useOrderStatusMutation<TValues>(
  id: string,
  targetStatus: OrderStatus,
  mutationFn: (id: string, values: TValues) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  const queryKey = [ORDERS_KEY, id];

  return useMutation({
    mutationFn: (values: TValues) => mutationFn(id, values),
    onMutate: async (values: TValues) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<OrderDetail>(queryKey);
      const versionedValues = values as { version: number };
      if (previous) {
        queryClient.setQueryData<OrderDetail>(queryKey, {
          ...previous,
          status: targetStatus,
          version: versionedValues.version + 1,
        });
      }
      return { previous };
    },
    onError: (_err, _values, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      void queryClient.invalidateQueries({ queryKey: [ORDER_HISTORY_KEY, id] });
    },
  });
}

export function useHoldOrder(id: string) {
  return useOrderStatusMutation<HoldOrderValues>(id, 'ON_HOLD', ordersService.hold);
}

export function useResumeOrder(id: string) {
  return useOrderStatusMutation<OrderStatusActionValues>(id, 'PENDING', ordersService.resume);
}

export function useCancelOrder(id: string) {
  return useOrderStatusMutation<OrderStatusActionValues>(id, 'CANCELLED', ordersService.cancel);
}

/**
 * Payment/shipment aren't a fixed-target status flip (payment only
 * advances status once fully paid; shipment always requires its own
 * @ExpectedVersion) — no optimistic update here, §21 only calls for that
 * on hold/resume/cancel. Just invalidate on settle.
 */
export function useRecordPayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: RecordPaymentValues) => ordersService.recordPayment(id, values),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, id] });
      void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      void queryClient.invalidateQueries({ queryKey: [ORDER_HISTORY_KEY, id] });
    },
  });
}

export function useRecordShipment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: RecordShipmentValues) => ordersService.recordShipment(id, values),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, id] });
      void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      void queryClient.invalidateQueries({ queryKey: [ORDER_HISTORY_KEY, id] });
    },
  });
}
