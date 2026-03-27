export type Role = "guest" | "customer" | "employee" | "admin" | "super_admin";

export type AdminTabKey = "pedidos" | "alta" | "menu" | "usuarios" | "reportes" | "permisos" | "inventario" | "caja" | "descuentos" | "configuracion";

export type TabPermission = {
  tab_key: AdminTabKey;
  allowed: boolean;
};

export type RolePermissions = {
  role: string;
  permissions: TabPermission[];
};

export type OrderStatus =
  | "pendiente"
  | "aceptado"
  | "preparando"
  | "listo"
  | "entregado"
  | "cancelado";

export type OrderType = "online" | "walkin";
export type PickupType = "ahora" | "agendar" | "al_llegar";
export type PaymentMethod = "cash" | "card_pending" | "card_online";

export type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  minimum_stock: number | null;
  created_at: string;
  updated_at: string;
};

export type MenuItemIngredient = {
  id: string;
  menu_item_id: string;
  inventory_item_id: string;
  quantity: number;
  inventory_item: InventoryItem;
};

// ── Shift & Cash Management ──

export type Shift = {
  id: string;
  opened_by: string;
  closed_by: string | null;
  opening_cash: number;
  closing_cash: number | null;
  status: "open" | "closed";
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  expected_opening_cash: number | null;
  actual_opening_cash: number | null;
  opening_discrepancy: number | null;
  opening_confirmed_at: string | null;
  expected_closing_cash: number | null;
  actual_closing_cash: number | null;
  closing_discrepancy: number | null;
  handoff_to: string | null;
  cash_sales_total: number;
  card_sales_total: number;
  total_cash_drops: number;
  orders_since_threshold: number;
};

export type CashMovementType = "opening" | "sale" | "cash_drop" | "adjustment" | "closing";

export type CashMovement = {
  id: string;
  shift_id: string;
  type: CashMovementType;
  amount: number;
  balance_after: number;
  order_id: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
};

export type CashDropStatus = "suggested" | "confirmed" | "skipped";

export type CashDrop = {
  id: string;
  shift_id: string;
  suggested_amount: number;
  actual_amount: number | null;
  remaining_in_drawer: number | null;
  performed_by: string | null;
  status: CashDropStatus;
  notes: string | null;
  created_at: string;
  confirmed_at: string | null;
};

export type DailyClosingStatus = "open" | "closed";

export type DailyClosing = {
  id: string;
  date: string;
  closed_by: string | null;
  total_shifts: number;
  total_orders: number;
  total_cash_sales: number;
  total_card_sales: number;
  total_cash_drops: number;
  expected_final_cash: number | null;
  actual_final_cash: number | null;
  discrepancy: number | null;
  status: DailyClosingStatus;
  top_products: unknown;
  hourly_sales: unknown;
  notes: string | null;
  closed_at: string | null;
  created_at: string;
};

export type StoreSettings = {
  minimum_cash_in_drawer: number;
  cash_drop_threshold: number;
  max_orders_after_threshold: number;
  store_open_time: string;
  store_close_time: string;
  blind_close_enabled: boolean;
};
