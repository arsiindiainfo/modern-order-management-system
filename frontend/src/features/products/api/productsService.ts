import { apiClient } from '../../../lib/apiClient';
import type { ListQueryParams, PaginatedResponse } from '../../../lib/pagination';
import type {
  AdjustInventoryValues,
  CreateProductFormValues,
  Inventory,
  Product,
  UpdateProductFormValues,
} from '../types';

interface Envelope<T> {
  success: true;
  data: T;
}

export const productsService = {
  async list(params: ListQueryParams): Promise<PaginatedResponse<Product>> {
    const { data } = await apiClient.get<PaginatedResponse<Product>>('/products', { params });
    return data;
  },

  async getById(id: string): Promise<Product> {
    const { data } = await apiClient.get<Envelope<Product>>(`/products/${id}`);
    return data.data;
  },

  async create(values: CreateProductFormValues): Promise<Product> {
    const { data } = await apiClient.post<Envelope<Product>>('/products', values);
    return data.data;
  },

  async update(id: string, values: UpdateProductFormValues): Promise<Product> {
    const { data } = await apiClient.put<Envelope<Product>>(`/products/${id}`, values);
    return data.data;
  },

  async deactivate(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  async getInventory(id: string): Promise<Inventory> {
    const { data } = await apiClient.get<Envelope<Inventory>>(`/products/${id}/inventory`);
    return data.data;
  },

  async adjustInventory(id: string, values: AdjustInventoryValues): Promise<Inventory> {
    const { data } = await apiClient.put<Envelope<Inventory>>(`/products/${id}/inventory`, values);
    return data.data;
  },
};
