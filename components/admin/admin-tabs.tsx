"use client";

import { useState } from "react";

import { MenuManager } from "@/components/admin/menu-manager";
import { OrderQueue, type AdminOrderCard } from "@/components/admin/order-queue";
import { ReportsPanel } from "@/components/admin/reports-panel";
import { UserManager } from "@/components/admin/user-manager";
import { WalkinOrderForm } from "@/components/admin/walkin-order-form";

type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  sort_order: number;
};

type TopProduct = {
  name: string;
  total: number;
};

type AdminTabsProps = {
  orders: AdminOrderCard[];
  categories: Category[];
  items: MenuItem[];
  isSuperAdmin: boolean;
  reports: {
    todayOrderCount: number;
    todayRevenue: number;
    todayDelivered: number;
    todayPending: number;
    weekOrderCount: number;
    weekRevenue: number;
    topProducts: TopProduct[];
  };
};

type TabKey = "pedidos" | "alta" | "menu" | "usuarios" | "reportes";

type TabDef = {
  key: TabKey;
  label: string;
  adminOnly?: boolean;
};

const TABS: TabDef[] = [
  { key: "pedidos", label: "Pedidos" },
  { key: "alta", label: "Alta manual" },
  { key: "menu", label: "Menú" },
  { key: "usuarios", label: "Usuarios", adminOnly: true },
  { key: "reportes", label: "Reportes" },
];

export function AdminTabs({ orders, categories, items, isSuperAdmin, reports }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("pedidos");

  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || isSuperAdmin);

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
              activeTab === tab.key
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
        {activeTab === "pedidos" ? (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Visualiza y mueve pedidos por estado. Los pedidos avanzan de izquierda a derecha.
            </p>
            <OrderQueue orders={orders} />
          </div>
        ) : null}

        {activeTab === "alta" ? (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Crea un pedido manual para clientes en mostrador.
            </p>
            <WalkinOrderForm items={walkinItems} />
          </div>
        ) : null}

        {activeTab === "menu" ? (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Administra categorías y productos del menú activo.
            </p>
            <MenuManager categories={categories} items={items} />
          </div>
        ) : null}

        {activeTab === "usuarios" && isSuperAdmin ? (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Asigna o revoca roles de administrador en la plataforma.
            </p>
            <UserManager />
          </div>
        ) : null}

        {activeTab === "reportes" ? (
          <div>
            <p className="text-sm text-cordero-espresso opacity-70">
              Métricas de ventas de hoy y los últimos 7 días.
            </p>
            <ReportsPanel
              todayOrderCount={reports.todayOrderCount}
              todayRevenue={reports.todayRevenue}
              todayDelivered={reports.todayDelivered}
              todayPending={reports.todayPending}
              weekOrderCount={reports.weekOrderCount}
              weekRevenue={reports.weekRevenue}
              topProducts={reports.topProducts}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
