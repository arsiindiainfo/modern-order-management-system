import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersService } from '../api/customersService';
import type { ListQueryParams } from '../../../lib/pagination';
import type { CustomerFormValues } from '../types';

const CUSTOMERS_KEY = 'customers';

export function useCustomers(params: ListQueryParams) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, params],
    queryFn: () => customersService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, id],
    queryFn: () => customersService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CustomerFormValues) => customersService.create(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
    },
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CustomerFormValues) => customersService.update(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
    },
  });
}

export function useDeactivateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersService.deactivate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
    },
  });
}
