export type Role = "guest" | "customer" | "employee" | "admin" | "super_admin";

export type AdminTabKey = "pedidos" | "alta" | "menu" | "usuarios" | "reportes" | "permisos" | "inventario" | "caja" | "descuentos";

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
