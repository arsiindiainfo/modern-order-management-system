export interface Address {
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  billingAddress: Address | null;
  shippingAddress: Address | null;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerFormValues {
  name: string;
  email: string;
  phone?: string;
  billingAddress?: Address;
}
