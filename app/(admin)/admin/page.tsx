import Link from "next/link";

import { AdminTabs } from "@/components/admin/admin-tabs";
import type { AdminOrderCard } from "@/components/admin/order-queue";
import { COPY } from "@/lib/copy";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminTabKey, InventoryItem, OrderStatus } from "@/lib/types/domain";

// All tabs super_admin can always access
const SUPER_ADMIN_TABS = new Set<AdminTabKey>(["pedidos", "alta", "menu", "inventario", "caja", "usuarios", "reportes", "descuentos", "permisos", "configuracion"]);

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const currentRole = (currentProfile as unknown as { role?: string } | null)?.role ?? "customer";
  const isSuperAdmin = currentRole === "super_admin";

  // Determine which tabs this user can access
  let allowedTabs: Set<AdminTabKey>;
  if (isSuperAdmin) {
    allowedTabs = SUPER_ADMIN_TABS;
  } else {
    // Load from DB for admin and employee
    const { data: permRows } = await supabase
      .from("role_permissions")
      .select("tab_key, allowed")
      .eq("role", currentRole)
      .eq("allowed", true);

    type PermRow = { tab_key: string; allowed: boolean };
    const rows = (permRows ?? []) as unknown as PermRow[];
    allowedTabs = new Set<AdminTabKey>(rows.map((r) => r.tab_key as AdminTabKey));
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const [
    { data: rawActiveOrders },
    { data: rawRecentDoneOrders },
    { data: rawCategories },
    { data: rawItems },
    { data: rawInventoryItems },
  ] = await Promise.all([
    // Active orders (not terminal)
    supabase
      .from("orders")
      .select("id,status,created_at,pickup_type,payment_method,pickup_time,notes,order_items(quantity,modifiers,menu_items(name))")
      .in("status", ["pendiente", "aceptado", "preparando", "listo"])
      .order("created_at", { ascending: true })
      .limit(100),
    // Delivered / canceled orders from today only (current shift)
    supabaseAdmin
      .from("orders")
      .select("id,status,created_at,pickup_type,payment_method,pickup_time,notes,order_items(quantity,modifiers,menu_items(name))")
      .in("status", ["entregado", "cancelado"])
      .gte("updated_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase.from("menu_categories").select("id,name,sort_order,is_active").order("sort_order", { ascending: true }),
    supabase
      .from("menu_items")
      .select("id,category_id,name,description,price,is_active,sort_order,track_stock,stock_quantity,low_stock_alert")
      .order("sort_order", { ascending: true }),
    // Insumos de inventario
    supabaseAdmin
      .from("inventory_items")
      .select("id,name,unit,current_stock,minimum_stock,created_at,updated_at")
      .order("name", { ascending: true }),
  ]);

  type RawOrderItem = {
    quantity: number;
    modifiers: unknown[];
    menu_items: { name: string } | null;
  };

  type RawOrder = {
    id: string;
    status: OrderStatus;
    created_at: string;
    pickup_type: "ahora" | "agendar" | "al_llegar";
    payment_method: "cash" | "card_pending";
    pickup_time: string | null;
    notes: string | null;
    order_items: RawOrderItem[];
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
    items: (order.order_items ?? []).map((oi) => ({
      quantity: oi.quantity,
      name: oi.menu_items?.name ?? "?",
      modifiers: Array.isArray(oi.modifiers)
        ? (oi.modifiers as { modifierName: string; selectedOption: string }[])
        : [],
    })),
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
    track_stock: boolean;
    stock_quantity: number | null;
    low_stock_alert: number;
  }>;

  const inventoryItems = (rawInventoryItems ?? []) as unknown as InventoryItem[];

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-12 sm:px-8">
      <h1 className="font-heading text-3xl text-cordero-espresso sm:text-4xl">{COPY.admin.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-cordero-espresso opacity-70">{COPY.admin.description}</p>

      <AdminTabs
        allowedTabs={allowedTabs}
        categories={categories}
        currentRole={currentRole}
        inventoryItems={inventoryItems}
        items={items.map((item) => ({ ...item, price: Number(item.price) }))}
        orders={queueItems}
      />

      <Link className="mt-8 inline-block rounded-full border border-cordero px-5 py-2 text-sm" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
