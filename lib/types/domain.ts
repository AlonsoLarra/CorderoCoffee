export type Role = "guest" | "customer" | "employee" | "admin" | "super_admin";

export type AdminTabKey = "pedidos" | "alta" | "menu" | "usuarios" | "reportes" | "permisos";

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
