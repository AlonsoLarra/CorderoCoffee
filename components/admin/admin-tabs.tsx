"use client";

import { useMemo, useState } from "react";

import { AdvancedReportsPanel } from "@/components/admin/advanced-reports-panel";
import { DiscountsPanel } from "@/components/admin/discounts-panel";
import { InventoryManager } from "@/components/admin/inventory-manager";
import { InventoryPanel } from "@/components/admin/inventory-panel";
import { MenuManager } from "@/components/admin/menu-manager";
import { OrderQueue, type AdminOrderCard } from "@/components/admin/order-queue";
import { ProductIngredientsManager } from "@/components/admin/product-ingredients-manager";
import { RolePermissionsManager } from "@/components/admin/role-permissions-manager";
import { ShiftPanel } from "@/components/admin/shift-panel";
import { ShiftStatusChip } from "@/components/admin/shift-status-chip";
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

type TabGroup = {
  label: string;
  tabs: TabDef[];
};

const TAB_GROUPS: TabGroup[] = [
  {
    label: "Operación",
    tabs: [
      { key: "pedidos", label: "Pedidos" },
      { key: "alta", label: "Alta manual" },
      { key: "caja", label: "Caja" },
    ],
  },
  {
    label: "Catálogo",
    tabs: [
      { key: "menu", label: "Menú" },
      { key: "inventario", label: "Inventario" },
      { key: "descuentos", label: "Descuentos" },
    ],
  },
  {
    label: "Administración",
    tabs: [
      { key: "usuarios", label: "Usuarios" },
      { key: "permisos", label: "Permisos" },
      { key: "reportes", label: "Reportes" },
      { key: "configuracion", label: "Config" },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  employee: "Empleado",
  customer: "Cliente",
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function isToday(dateIso: string): boolean {
  const d = new Date(dateIso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function AdminTabs({
  orders,
  categories,
  items,
  inventoryItems,
  currentRole,
  allowedTabs,
}: AdminTabsProps) {
  const isSuperAdmin = currentRole === "super_admin";

  const visibleGroups = TAB_GROUPS.map((group) => ({
    ...group,
    tabs: group.tabs.filter((tab) => allowedTabs.has(tab.key)),
  })).filter((group) => group.tabs.length > 0);

  const allVisibleTabs = visibleGroups.flatMap((g) => g.tabs);
  const defaultTab = allVisibleTabs[0]?.key ?? "pedidos";
  const [activeTab, setActiveTab] = useState<AdminTabKey>(defaultTab);

  // If active tab is no longer visible (e.g. after permissions change), fall back
  const resolvedActive = allVisibleTabs.some((t) => t.key === activeTab) ? activeTab : defaultTab;

  const walkinItems = items
    .filter((item) => item.is_active)
    .map((item) => ({ id: item.id, name: item.name, price: item.price, is_active: item.is_active }));

  const { todayCount, todayRevenue } = useMemo(() => {
    const todays = orders.filter((o) => isToday(o.createdAt) && o.status !== "cancelado");
    const revenue = todays.reduce(
      (sum, o) => sum + o.items.reduce((s, item) => s + item.unitPrice * item.quantity, 0),
      0,
    );
    return { todayCount: todays.length, todayRevenue: revenue };
  }, [orders]);

  return (
    <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-[232px] flex-shrink-0 rounded-2xl bg-cordero-card lg:block">
        <nav className="p-3">
          {visibleGroups.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--color-espresso)/0.5)]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`block w-full rounded-[10px] px-3 py-[9px] text-left text-sm transition-colors ${
                      resolvedActive === tab.key
                        ? "bg-cordero-espresso font-medium text-cordero-cream"
                        : "text-cordero-espresso hover:bg-[hsl(var(--color-espresso)/0.06)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 border-t border-[hsl(var(--color-espresso)/0.1)] px-4 py-3.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--color-sand))] text-xs font-semibold text-cordero-espresso">
            {(ROLE_LABELS[currentRole] ?? currentRole).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-cordero-espresso">
              {ROLE_LABELS[currentRole] ?? currentRole}
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile tab bar (collapsed sidebar) */}
      <div className="flex gap-1 overflow-x-auto pb-0 lg:hidden">
        {allVisibleTabs.map((tab) => (
          <button
            key={tab.key}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors ${
              resolvedActive === tab.key
                ? "bg-cordero-espresso font-medium text-cordero-cream"
                : "bg-cordero-card text-cordero-espresso opacity-70"
            }`}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 rounded-2xl bg-cordero-card p-4 sm:p-6">
        {resolvedActive === "pedidos" && (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-[26px] text-cordero-espresso">Cola de pedidos</h2>
                <p className="mt-1 text-[13px] text-[hsl(var(--color-espresso)/0.6)]">
                  Hoy: {todayCount} pedido{todayCount !== 1 ? "s" : ""} · {formatPrice(todayRevenue)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ShiftStatusChip onClick={() => setActiveTab("caja")} />
                {allowedTabs.has("alta") ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("alta")}
                    className="btn-press rounded-full bg-cordero-espresso px-4 py-1.5 text-xs font-semibold text-cordero-cream"
                  >
                    + Pedido en mostrador
                  </button>
                ) : null}
              </div>
            </div>
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
