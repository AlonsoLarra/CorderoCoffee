import Link from "next/link";

import { MenuManager } from "@/components/admin/menu-manager";
import { OrderQueue, type AdminOrderCard } from "@/components/admin/order-queue";
import { WalkinOrderForm } from "@/components/admin/walkin-order-form";
import { COPY } from "@/lib/copy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types/domain";

const operationalStatuses: OrderStatus[] = ["pendiente", "aceptado", "preparando", "listo"];

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createSupabaseServerClient();

  const [{ data: rawOrders, error }, { data: rawCategories }, { data: rawItems }] = await Promise.all([
    supabase
      .from("orders")
      .select("id,status,created_at,pickup_type,payment_method,pickup_time,notes")
      .in("status", operationalStatuses)
      .order("created_at", { ascending: true })
      .limit(50),
    supabase.from("menu_categories").select("id,name,sort_order,is_active").order("sort_order", { ascending: true }),
    supabase
      .from("menu_items")
      .select("id,category_id,name,description,price,is_active,sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  const orders = (rawOrders ?? []) as unknown as Array<{
    id: string;
    status: OrderStatus;
    created_at: string;
    pickup_type: "ahora" | "agendar" | "al_llegar";
    payment_method: "cash" | "card_pending";
    pickup_time: string | null;
    notes: string | null;
  }>;

  const queueItems: AdminOrderCard[] = orders.map((order) => ({
    id: order.id,
    status: order.status,
    createdAt: order.created_at,
    pickupType: order.pickup_type,
    paymentMethod: order.payment_method,
    pickupTime: order.pickup_time,
    notes: order.notes,
  }));

  const categories = (rawCategories ?? []) as unknown as Array<{
    id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
  }>;

  const items = (rawItems ?? []) as unknown as Array<{
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: number;
    is_active: boolean;
    sort_order: number;
  }>;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16 sm:px-10">
      <h1 className="font-heading text-3xl text-cordero-espresso sm:text-4xl">{COPY.admin.title}</h1>

      <p className="mt-3 max-w-2xl text-cordero-espresso opacity-80">{COPY.admin.description}</p>

      <h2 className="mt-8 font-heading text-2xl text-cordero-espresso">{COPY.admin.queueTitle}</h2>
      <p className="mt-2 text-sm text-cordero-espresso opacity-80">{COPY.admin.queueDescription}</p>

      {error ? (
        <div className="mt-8 rounded-2xl border border-cordero bg-cordero-card p-6">
          <p className="text-sm text-cordero-espresso opacity-75">
            No pudimos cargar la cola de pedidos.
          </p>
        </div>
      ) : queueItems.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-cordero bg-cordero-card p-6">
          <p className="text-sm text-cordero-espresso opacity-75">{COPY.admin.emptyQueue}</p>
        </div>
      ) : (
        <OrderQueue orders={queueItems} />
      )}

      <WalkinOrderForm
        items={items.map((item) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          is_active: item.is_active,
        }))}
      />

      <MenuManager categories={categories} items={items.map((item) => ({ ...item, price: Number(item.price) }))} />

      <Link className="mt-8 inline-block rounded-full border border-cordero px-5 py-2 text-sm" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
