"use client";

import { useState } from "react";

import { AdvancedReportsPanel } from "@/components/admin/advanced-reports-panel";
import { DiscountsPanel } from "@/components/admin/discounts-panel";
import { InventoryManager } from "@/components/admin/inventory-manager";
import { InventoryPanel } from "@/components/admin/inventory-panel";
import { MenuManager } from "@/components/admin/menu-manager";
import { OrderQueue, type AdminOrderCard } from "@/components/admin/order-queue";
import { ProductIngredientsManager } from "@/components/admin/product-ingredients-manager";
import { RolePermissionsManager } from "@/components/admin/role-permissions-manager";
import { ShiftPanel } from "@/components/admin/shift-panel";
import { StoreSettingsPanel } from "@/components/admin/store-settings-panel";
import { UserManager } from "@/components/admin/user-manager";
import { WalkinOrderForm } from "@/components/admin/walkin-order-form";
import type { AdminTabKey, InventoryItem } from "@/lib/types/domain";

type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type MenuItem = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  sort_order: number;
  track_stock: boolean;
  stock_quantity: number | null;
  low_stock_alert: number;
};

type TopProduct = {
  name: string;
  total: number;
};

type AdminTabsProps = {
  orders: AdminOrderCard[];
  categories: Category[];
  items: MenuItem[];
  inventoryItems: InventoryItem[];
  currentRole: string;
  /** Set of tab keys this user is allowed to see (comes from DB or hardcoded for super_admin) */
  allowedTabs: Set<AdminTabKey>;
  reports?: {
    todayOrderCount: number;
    todayRevenue: number;
    todayDelivered: number;
    todayPending: number;
    weekOrderCount: number;
    weekRevenue: number;
    topProducts: TopProduct[];
  };
};

type TabDef = {
  key: AdminTabKey;
  label: string;
};

const ALL_TABS: TabDef[] = [
  { key: "pedidos", label: "Pedidos" },
  { key: "alta", label: "Alta manual" },
  { key: "menu", label: "Menú" },
  { key: "inventario", label: "Inventario" },
  { key: "caja", label: "Caja" },
  { key: "usuarios", label: "Usuarios" },
  { key: "reportes", label: "Reportes" },
  { key: "descuentos", label: "Descuentos" },
  { key: "permisos", label: "Permisos" },
  { key: "configuracion", label: "Config" },
];

export function AdminTabs({
  orders,
  categories,
  items,
  inventoryItems,
  currentRole,
  allowedTabs,
}: AdminTabsProps) {
  const isSuperAdmin = currentRole === "super_admin";

  const visibleTabs = ALL_TABS.filter((tab) => allowedTabs.has(tab.key));
  const defaultTab = visibleTabs[0]?.key ?? "pedidos";
  const [activeTab, setActiveTab] = useState<AdminTabKey>(defaultTab);

  // If active tab is no longer visible (e.g. after permissions change), fall back
  const resolvedActive = visibleTabs.some((t) => t.key === activeTab) ? activeTab : defaultTab;

  const walkinItems = items
    .filter((item) => item.is_active)
    .map((item) => ({ id: item.id, name: item.name, price: item.price, is_active: item.is_active }));

  return (
    <div className="mt-8">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-cordero pb-0">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            className={`whitespace-nowrap rounded-t-xl px-4 py-2 text-sm transition-colors ${
              resolvedActive === tab.key
                ? "border border-b-0 border-cordero bg-cordero-card font-medium text-cordero-espresso"
                : "text-cordero-espresso opacity-60 hover:opacity-80"
            }`}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-b-2xl rounded-tr-2xl border border-t-0 border-cordero bg-cordero-card p-4 sm:p-6">
        {resolvedActive === "pedidos" && (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Visualiza y mueve pedidos por estado. Los pedidos avanzan de izquierda a derecha.
            </p>
            <OrderQueue orders={orders} />
          </div>
        )}

        {resolvedActive === "alta" && (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Crea un pedido manual para clientes en mostrador.
            </p>
            <WalkinOrderForm items={walkinItems} />
          </div>
        )}

        {resolvedActive === "menu" && (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Administra categorías y productos del menú activo.
            </p>
            <MenuManager categories={categories} items={items} inventoryItems={inventoryItems} />
          </div>
        )}

        {resolvedActive === "inventario" && (
          <div className="space-y-8">
            <div>
              <p className="text-sm text-cordero-espresso opacity-70">
                Controla el stock de cada producto. Los ítems agotados no se mostrarán a los clientes.
              </p>
              <InventoryPanel
                items={items.map((i) => ({
                  id: i.id,
                  name: i.name,
                  track_stock: i.track_stock,
                  stock_quantity: i.stock_quantity,
                  low_stock_alert: i.low_stock_alert,
                  is_active: i.is_active,
                }))}
              />
            </div>
            <div>
              <p className="text-sm text-cordero-espresso opacity-70">
                Define la relacion entre productos e insumos desde este bloque: crea categorias, crea productos y establece cantidades por producto.
              </p>
              <ProductIngredientsManager categories={categories} inventoryItems={inventoryItems} items={items} />
            </div>
            <div>
              <p className="text-sm text-cordero-espresso opacity-70">
                Gestiona el stock de insumos y revisa en que productos se usan.
              </p>
              <InventoryManager items={inventoryItems} />
            </div>
          </div>
        )}

        {resolvedActive === "usuarios" && isSuperAdmin && (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Asigna o revoca roles de administrador en la plataforma.
            </p>
            <UserManager />
          </div>
        )}

        {resolvedActive === "caja" && (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Abre y cierra turnos de caja. Registra el efectivo al inicio y al final de cada turno.
            </p>
            <ShiftPanel />
          </div>
        )}

        {resolvedActive === "reportes" && (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Consulta ventas por período, distribución horaria, métodos de pago y exporta CSV.
            </p>
            <AdvancedReportsPanel />
          </div>
        )}

        {resolvedActive === "descuentos" && (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Crea y gestiona códigos de descuento para clientes.
            </p>
            <DiscountsPanel />
          </div>
        )}

        {resolvedActive === "permisos" && (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Controla qué secciones puede ver cada rol. Los cambios aplican de inmediato.
            </p>
            <RolePermissionsManager isSuperAdmin={isSuperAdmin} />
          </div>
        )}

        {resolvedActive === "configuracion" && (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Configura los parámetros de caja, horarios y umbrales de la tienda.
            </p>
            <StoreSettingsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
