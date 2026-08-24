export interface Product {
  id: string;
  sku: string;
  name: string;
  unitPrice: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export interface Inventory {
  productId: string;
  sku: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderLevel: number;
}

export interface CreateProductFormValues {
  sku: string;
  name: string;
  unitPrice: number;
  currency?: string;
  initialStock?: number;
  reorderLevel?: number;
}

export interface UpdateProductFormValues {
  name: string;
  unitPrice: number;
  currency?: string;
}

export interface AdjustInventoryValues {
  quantityDelta: number;
  reason: string;
}
