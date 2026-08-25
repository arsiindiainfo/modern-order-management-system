import { apiClient } from '../../../lib/apiClient';
import type { ListQueryParams, PaginatedResponse } from '../../../lib/pagination';
import type { CreateDiscountFormValues, Discount, DiscountValidationResult } from '../types';

interface Envelope<T> {
  success: true;
  data: T;
}

export const discountsService = {
  async list(params: ListQueryParams): Promise<PaginatedResponse<Discount>> {
    const { data } = await apiClient.get<PaginatedResponse<Discount>>('/discounts', { params });
    return data;
  },

  async create(values: CreateDiscountFormValues): Promise<Discount> {
    const { data } = await apiClient.post<Envelope<Discount>>('/discounts', values);
    return data.data;
  },

  async validate(code: string, subtotal: number): Promise<DiscountValidationResult> {
    const { data } = await apiClient.post<Envelope<DiscountValidationResult>>('/discounts/validate', {
      code,
      subtotal,
    });
    return data.data;
  },
};
