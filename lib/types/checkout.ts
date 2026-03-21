import type { PaymentMethod, PickupType } from "@/lib/types/domain";

export type CheckoutLineInput = {
  itemId: string;
  quantity: number;
};

export type CreateOrderRequest = {
  lines: CheckoutLineInput[];
  pickupType: PickupType;
  paymentMethod: PaymentMethod;
  notes?: string;
  scheduledPickupAt?: string;
};

export type CreateOrderResponse = {
  orderId: string;
  status: string;
};
