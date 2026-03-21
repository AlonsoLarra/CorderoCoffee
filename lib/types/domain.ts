export type Role = "guest" | "customer" | "admin" | "super_admin";

export type OrderStatus =
  | "pendiente"
  | "aceptado"
  | "preparando"
  | "listo"
  | "entregado";

export type OrderType = "online" | "walkin";
export type PickupType = "ahora" | "agendar" | "al_llegar";
export type PaymentMethod = "cash" | "card_pending";
