import { apiClient } from '../../../lib/apiClient';
import type { ListQueryParams, PaginatedResponse } from '../../../lib/pagination';
import type { Customer, CustomerFormValues } from '../types';

interface Envelope<T> {
  success: true;
  data: T;
}

export const customersService = {
  async list(params: ListQueryParams): Promise<PaginatedResponse<Customer>> {
    const { data } = await apiClient.get<PaginatedResponse<Customer>>('/customers', { params });
    return data;
  },

  async getById(id: string): Promise<Customer> {
    const { data } = await apiClient.get<Envelope<Customer>>(`/customers/${id}`);
    return data.data;
  },

  async create(values: CustomerFormValues): Promise<Customer> {
    const { data } = await apiClient.post<Envelope<Customer>>('/customers', values);
    return data.data;
  },

  async update(id: string, values: CustomerFormValues): Promise<Customer> {
    const { data } = await apiClient.put<Envelope<Customer>>(`/customers/${id}`, values);
    return data.data;
  },

  async deactivate(id: string): Promise<void> {
    await apiClient.delete(`/customers/${id}`);
  },
};
