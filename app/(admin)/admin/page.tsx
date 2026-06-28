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

type AdminCategory = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

type AdminMenuItem = {
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

function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

function pickPreferredCategory(left: AdminCategory, right: AdminCategory) {
  if (left.is_active !== right.is_active) {
    return left.is_active ? left : right;
  }

  if (left.sort_order !== right.sort_order) {
    return left.sort_order <= right.sort_order ? left : right;
  }

  if (left.created_at !== right.created_at) {
    return left.created_at <= right.created_at ? left : right;
  }

  return left.id <= right.id ? left : right;
}

function coalesceMenuCategories(categories: AdminCategory[], items: AdminMenuItem[]) {
  const canonicalByKey = new Map<string, AdminCategory>();
  const categoryIdMap = new Map<string, string>();

  for (const category of categories) {
    const key = normalizeCategoryName(category.name);
    const existing = canonicalByKey.get(key);

    if (!existing) {
      canonicalByKey.set(key, category);
      categoryIdMap.set(category.id, category.id);
      continue;
    }

    const preferred = pickPreferredCategory(existing, category);
    const duplicate = preferred.id === existing.id ? category : existing;

    canonicalByKey.set(key, preferred);
    categoryIdMap.set(preferred.id, preferred.id);
    categoryIdMap.set(duplicate.id, preferred.id);
  }

  return {
    categories: Array.from(canonicalByKey.values()).sort(
      (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, "es"),
    ),
    items: items.map((item) => ({
      ...item,
      category_id: item.category_id ? (categoryIdMap.get(item.category_id) ?? item.category_id) : null,
    })),
  };
}

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
    // Active orders (not terminal). Use the admin client (cache: "no-store") so
    // router.refresh() after a status change always re-reads fresh data — the
    // SSR client's fetch was being data-cached, leaving the kanban stale until
    // a full manual page reload.
    supabaseAdmin
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
    supabase.from("menu_categories").select("id,name,sort_order,is_active,created_at").order("sort_order", { ascending: true }),
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

  const categories = (rawCategories ?? []) as unknown as AdminCategory[];

  const items = (rawItems ?? []) as unknown as AdminMenuItem[];
  const menuData = coalesceMenuCategories(categories, items);

  const inventoryItems = (rawInventoryItems ?? []) as unknown as InventoryItem[];

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-12 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl text-cordero-espresso sm:text-4xl">{COPY.admin.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-cordero-espresso opacity-70">{COPY.admin.description}</p>
        </div>

        <div className="sm:sticky sm:top-4 sm:self-start">
          <Link
            className="inline-block rounded-full border border-cordero bg-cordero-cream/90 px-5 py-2 text-sm shadow-sm backdrop-blur"
            href="/"
          >
            Volver al inicio
          </Link>
        </div>
      </div>

      <AdminTabs
        allowedTabs={allowedTabs}
        categories={menuData.categories}
        currentRole={currentRole}
        inventoryItems={inventoryItems}
        items={menuData.items.map((item) => ({ ...item, price: Number(item.price) }))}
        orders={queueItems}
      />
    </main>
  );
}
