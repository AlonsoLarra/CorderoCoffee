"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type LocalOrder = {
  orderId: string;
  createdAt: string;
  total: number;
  itemCount: number;
};

const LOCAL_ORDERS_KEY = "cordero.localOrders.v1";

export function saveLocalOrder(order: LocalOrder): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LOCAL_ORDERS_KEY);
    const existing: LocalOrder[] = raw ? (JSON.parse(raw) as LocalOrder[]) : [];
    const updated = [order, ...existing].slice(0, 10);
    window.localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
  } catch {
    // ignore write errors
  }
}

function loadLocalOrders(): LocalOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function LocalOrdersPanel() {
  const [orders, setOrders] = useState<LocalOrder[]>([]);

  useEffect(() => {
    setOrders(loadLocalOrders());
  }, []);

  if (orders.length === 0) return null;

  function dismissOrder(orderId: string) {
    const updated = orders.filter((o) => o.orderId !== orderId);
    setOrders(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
    }
  }

  function clearAll() {
    setOrders([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LOCAL_ORDERS_KEY);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-cordero bg-cordero-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl text-cordero-espresso">
          Pedidos en este dispositivo
        </h2>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-cordero-espresso opacity-50 hover:opacity-80"
        >
          Limpiar todo
        </button>
      </div>
      <p className="mt-1 text-xs text-cordero-espresso opacity-70">
        Pedidos enviados desde este navegador. Inicia sesión para ver estado en tiempo real.
      </p>

      <ul className="mt-4 space-y-3">
        {orders.map((order) => (
          <li
            key={order.orderId}
            className="flex items-center justify-between gap-3 rounded-xl border border-cordero px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-mono text-xs text-cordero-espresso opacity-60">
                #{order.orderId.slice(0, 8)}
              </p>
              <p className="mt-0.5 text-xs text-cordero-espresso opacity-75">
                {formatDate(order.createdAt)} · {order.itemCount}{" "}
                {order.itemCount === 1 ? "producto" : "productos"} ·{" "}
                {formatPrice(order.total)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/pedido/estado/${order.orderId}`}
                className="rounded-full border border-cordero px-3 py-1 text-xs text-cordero-espresso"
              >
                Ver estado
              </Link>
              <button
                type="button"
                onClick={() => dismissOrder(order.orderId)}
                className="text-sm text-cordero-espresso opacity-40 hover:opacity-70"
                aria-label="Descartar"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
