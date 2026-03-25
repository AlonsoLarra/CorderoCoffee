import Link from "next/link";

import { MenuManager } from "@/components/admin/menu-manager";
import { OrderQueue, type AdminOrderCard } from "@/components/admin/order-queue";
import { ReportsPanel } from "@/components/admin/reports-panel";
import { UserManager } from "@/components/admin/user-manager";
import { WalkinOrderForm } from "@/components/admin/walkin-order-form";
import { COPY } from "@/lib/copy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types/domain";

const operationalStatuses: OrderStatus[] = ["pendiente", "aceptado", "preparando", "listo"];

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const currentRole = (currentProfile as unknown as { role?: string } | null)?.role ?? null;

  // --- Report date boundaries ---
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    { data: rawOrders, error },
    { data: rawCategories },
    { data: rawItems },
    { data: rawTodayOrders },
    { data: rawWeekOrders },
    { data: rawWeekOrderItems },
    { data: rawTopItems },
  ] = await Promise.all([
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
    // Reports: today's orders
    supabase
      .from("orders")
      .select("id,status")
      .gte("created_at", todayStart.toISOString()),
    // Reports: this week's orders
    supabase
      .from("orders")
      .select("id,status")
      .gte("created_at", sevenDaysAgo.toISOString()),
    // Reports: order_items for this week's revenue
    supabase
      .from("order_items")
      .select("order_id, quantity, unit_price")
      .gte("created_at", sevenDaysAgo.toISOString()),
    // Reports: top products last 7 days
    supabase
      .from("order_items")
      .select("order_id, quantity, menu_items(name)")
      .gte("created_at", sevenDaysAgo.toISOString()),
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

  // --- Reports data processing ---
  type TodayOrder = { id: string; status: string };
  type WeekOrder = { id: string; status: string };
  type WeekOrderItem = { order_id: string; quantity: number; unit_price: number };
  type TopItemRow = { order_id: string; quantity: number; menu_items: { name: string } | null };

  const todayOrders = (rawTodayOrders ?? []) as unknown as TodayOrder[];
  const weekOrders = (rawWeekOrders ?? []) as unknown as WeekOrder[];
  const weekOrderItems = (rawWeekOrderItems ?? []) as unknown as WeekOrderItem[];
  const topItemRows = (rawTopItems ?? []) as unknown as TopItemRow[];

  const todayDelivered = todayOrders.filter((o) => o.status === "entregado").length;
  const todayPending = todayOrders.filter((o) => o.status !== "entregado").length;
  const todayOrderCount = todayDelivered;

  const todayDeliveredIds = new Set(
    todayOrders.filter((o) => o.status === "entregado").map((o) => o.id),
  );
  const todayRevenue = weekOrderItems
    .filter((item) => todayDeliveredIds.has(item.order_id))
    .reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0);

  const weekDeliveredIds = new Set(
    weekOrders.filter((o) => o.status === "entregado").map((o) => o.id),
  );
  const weekOrderCount = weekDeliveredIds.size;
  const weekRevenue = weekOrderItems
    .filter((item) => weekDeliveredIds.has(item.order_id))
    .reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0);

  const productTotals = new Map<string, number>();
  for (const row of topItemRows) {
    if (!weekDeliveredIds.has(row.order_id)) continue;
    const name = row.menu_items?.name;
    if (!name) continue;
    productTotals.set(name, (productTotals.get(name) ?? 0) + Number(row.quantity));
  }
  const topProducts = Array.from(productTotals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

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

      {currentRole === "super_admin" && <UserManager />}

      <ReportsPanel
        todayOrderCount={todayOrderCount}
        todayRevenue={todayRevenue}
        todayDelivered={todayDelivered}
        todayPending={todayPending}
        weekOrderCount={weekOrderCount}
        weekRevenue={weekRevenue}
        topProducts={topProducts}
      />

      <Link className="mt-8 inline-block rounded-full border border-cordero px-5 py-2 text-sm" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
