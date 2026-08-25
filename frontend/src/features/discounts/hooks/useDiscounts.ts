import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { discountsService } from '../api/discountsService';
import type { ListQueryParams } from '../../../lib/pagination';
import type { CreateDiscountFormValues } from '../types';

const DISCOUNTS_KEY = 'discounts';

export function useDiscounts(params: ListQueryParams) {
  return useQuery({
    queryKey: [DISCOUNTS_KEY, params],
    queryFn: () => discountsService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateDiscountFormValues) => discountsService.create(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DISCOUNTS_KEY] });
    },
  });
}

/** No caching — a discount preview must always reflect the current subtotal/date, never a stale cached validation. */
export function useValidateDiscount() {
  return useMutation({
    mutationFn: ({ code, subtotal }: { code: string; subtotal: number }) =>
      discountsService.validate(code, subtotal),
  });
}
