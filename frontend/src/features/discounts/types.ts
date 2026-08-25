export type DiscountType = 'PERCENT' | 'FIXED';

export interface Discount {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  startsAt: string;
  endsAt: string;
  usageLimit: number | null;
  timesUsed: number;
  isActive: boolean;
}

export interface CreateDiscountFormValues {
  code: string;
  type: DiscountType;
  value: number;
  startsAt: string;
  endsAt: string;
  usageLimit?: number;
}

export interface DiscountValidationResult {
  code: string;
  type: DiscountType;
  value: number;
  discountAmount: number;
}
