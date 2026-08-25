import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersService, type OrdersListQueryParams } from '../api/ordersService';
import type {
  CreateOrderFormValues,
  HoldOrderValues,
  OrderDetail,
  OrderStatus,
  OrderStatusActionValues,
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
