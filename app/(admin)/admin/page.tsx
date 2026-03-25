import Link from "next/link";

import { AdminTabs } from "@/components/admin/admin-tabs";
import type { AdminOrderCard } from "@/components/admin/order-queue";
import { COPY } from "@/lib/copy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types/domain";

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
  const isSuperAdmin = currentRole === "super_admin";

  // --- Report date boundaries ---
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Cut-off for completed/canceled orders shown in kanban (last 24 h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: rawActiveOrders },
    { data: rawRecentDoneOrders },
    { data: rawCategories },
    { data: rawItems },
    { data: rawTodayOrders },
    { data: rawWeekOrders },
    { data: rawWeekOrderItems },
    { data: rawTopItems },
  ] = await Promise.all([
    // Active orders (not terminal)
    supabase
      .from("orders")
      .select("id,status,created_at,pickup_type,payment_method,pickup_time,notes")
      .in("status", ["pendiente", "aceptado", "preparando", "listo"])
      .order("created_at", { ascending: true })
      .limit(100),
    // Recent completed / canceled (last 24 h)
    supabase
      .from("orders")
      .select("id,status,created_at,pickup_type,payment_method,pickup_time,notes")
      .in("status", ["entregado", "cancelado"])
      .gte("created_at", oneDayAgo)
      .order("created_at", { ascending: false })
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
      .select("id")
      .gte("created_at", sevenDaysAgo.toISOString()),
    // Reports: order_items for this week's revenue
    supabase
      .from("order_items")
      .select("order_id, quantity, unit_price")
      .gte("created_at", sevenDaysAgo.toISOString()),
    // Reports: top products last 7 days
    supabase
      .from("order_items")
      .select("quantity, menu_items(name)")
      .gte("created_at", sevenDaysAgo.toISOString()),
  ]);

  type RawOrder = {
    id: string;
    status: OrderStatus;
    created_at: string;
    pickup_type: "ahora" | "agendar" | "al_llegar";
    payment_method: "cash" | "card_pending";
    pickup_time: string | null;
    notes: string | null;
  };

  const allRawOrders = [
    ...((rawActiveOrders ?? []) as unknown as RawOrder[]),
    ...((rawRecentDoneOrders ?? []) as unknown as RawOrder[]),
  ];

  const queueItems: AdminOrderCard[] = allRawOrders.map((order) => ({
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
  type WeekOrderItem = { order_id: string; quantity: number; unit_price: number };
  type TopItemRow = { quantity: number; menu_items: { name: string } | null };

  const todayOrders = (rawTodayOrders ?? []) as unknown as TodayOrder[];
  const weekOrderItems = (rawWeekOrderItems ?? []) as unknown as WeekOrderItem[];
  const topItemRows = (rawTopItems ?? []) as unknown as TopItemRow[];

  const todayOrderCount = todayOrders.length;
  const todayDelivered = todayOrders.filter((o) => o.status === "entregado").length;
  const todayPending = todayOrders.filter((o) => o.status !== "entregado").length;

  const todayOrderIds = new Set(todayOrders.map((o) => o.id));
  const todayRevenue = weekOrderItems
    .filter((item) => todayOrderIds.has(item.order_id))
    .reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0);

  const weekOrderCount = (rawWeekOrders ?? []).length;
  const weekRevenue = weekOrderItems.reduce(
    (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
    0,
  );

  const productTotals = new Map<string, number>();
  for (const row of topItemRows) {
    const name = row.menu_items?.name;
    if (!name) continue;
    productTotals.set(name, (productTotals.get(name) ?? 0) + Number(row.quantity));
  }
  const topProducts = Array.from(productTotals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-12 sm:px-8">
      <h1 className="font-heading text-3xl text-cordero-espresso sm:text-4xl">{COPY.admin.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-cordero-espresso opacity-70">{COPY.admin.description}</p>

      <AdminTabs
        categories={categories}
        isSuperAdmin={isSuperAdmin}
        items={items.map((item) => ({ ...item, price: Number(item.price) }))}
        orders={queueItems}
        reports={{
          todayOrderCount,
          todayRevenue,
          todayDelivered,
          todayPending,
          weekOrderCount,
          weekRevenue,
          topProducts,
        }}
      />

      <Link className="mt-8 inline-block rounded-full border border-cordero px-5 py-2 text-sm" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
