import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../api/productsService';
import type { ListQueryParams } from '../../../lib/pagination';
import type { AdjustInventoryValues, CreateProductFormValues, UpdateProductFormValues } from '../types';

const PRODUCTS_KEY = 'products';
const INVENTORY_KEY = 'product-inventory';

export function useProducts(params: ListQueryParams) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, params],
    queryFn: () => productsService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, id],
    queryFn: () => productsService.getById(id!),
    enabled: !!id,
  });
}

export function useProductInventory(id: string | undefined) {
  return useQuery({
    queryKey: [INVENTORY_KEY, id],
    queryFn: () => productsService.getInventory(id!),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateProductFormValues) => productsService.create(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: UpdateProductFormValues) => productsService.update(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}

export function useDeactivateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsService.deactivate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}

export function useAdjustInventory(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: AdjustInventoryValues) => productsService.adjustInventory(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY, id] });
      void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}
