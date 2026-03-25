export type Role = 'guest' | 'customer' | 'admin' | 'super_admin';

export type OrderStatus =
  | 'pendiente'
  | 'aceptado'
  | 'preparando'
  | 'listo'
  | 'entregado';

export type OrderType = 'online' | 'walkin';
export type PickupType = 'ahora' | 'agendar' | 'al_llegar';
export type PaymentMethod = 'cash' | 'card_pending';

export interface MenuItemLite {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
  items: MenuItemLite[];
}

export interface CartLine {
  itemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
}

export interface CreateOrderRequest {
  lines: { itemId: string; quantity: number }[];
  pickupType: PickupType;
  paymentMethod: PaymentMethod;
  notes?: string;
  scheduledPickupAt?: string;
}

export interface CreateOrderResponse {
  orderId: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  order_type: OrderType;
  pickup_type: PickupType;
  payment_method: PaymentMethod;
  notes: string | null;
  total_amount: number;
  created_at: string;
  items?: OrderItemRow[];
}

export interface OrderItemRow {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
}
