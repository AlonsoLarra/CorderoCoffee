import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ensureStaff() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const typedProfile = profile as unknown as { role?: string } | null;

  const allowedRoles = ["admin", "super_admin", "employee"];
  if (!typedProfile || !allowedRoles.includes(typedProfile.role ?? "")) {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }

  return { supabase, userId: user.id };
}

// GET /api/admin/daily-closing — get today's closing preview or a specific date
export async function GET(request: Request) {
  const auth = await ensureStaff();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const targetDate = dateParam ?? new Date().toISOString().split("T")[0];

  // Check if already closed
  const { data: existing } = await auth.supabase
    .from("daily_closings")
    .select("*")
    .eq("date", targetDate)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ closing: existing, preview: false });
  }

  // Build preview from today's shifts
  const dayStart = `${targetDate}T00:00:00`;
  const dayEnd = `${targetDate}T23:59:59`;

  const { data: shiftsData } = await auth.supabase
    .from("shifts")
    .select("*")
    .gte("opened_at", dayStart)
    .lte("opened_at", dayEnd);

  const shifts = (shiftsData ?? []) as unknown as Array<{
    id: string;
    status: string;
    opening_cash: number;
    closing_cash: number | null;
    cash_sales_total: number;
    card_sales_total: number;
    total_cash_drops: number;
  }>;

  // Get all cash drops for the day's shifts
  const shiftIds = shifts.map((s) => s.id);
  let totalCashDrops = 0;
  if (shiftIds.length > 0) {
    const { data: dropsData } = await auth.supabase
      .from("cash_drops")
      .select("actual_amount")
      .in("shift_id", shiftIds)
      .eq("status", "confirmed");

    const drops = (dropsData ?? []) as unknown as Array<{ actual_amount: number }>;
    totalCashDrops = drops.reduce((sum, d) => sum + Number(d.actual_amount), 0);
  }

  // Get orders for the day
  const { data: ordersData } = await auth.supabase
    .from("orders")
    .select("id, status, payment_method, created_at")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .eq("status", "entregado");

  const orders = (ordersData ?? []) as unknown as Array<{
    id: string;
    status: string;
    payment_method: string;
    created_at: string;
  }>;

  // Calculate totals
  const orderIds = orders.map((o) => o.id);
  let totalRevenue = 0;
  let cashRevenue = 0;
  let cardRevenue = 0;

  if (orderIds.length > 0) {
    const { data: itemsData } = await auth.supabase
      .from("order_items")
      .select("order_id, quantity, unit_price")
      .in("order_id", orderIds);

    const items = (itemsData ?? []) as unknown as Array<{ order_id: string; quantity: number; unit_price: number }>;

    const revenueByOrder = new Map<string, number>();
    for (const item of items) {
      const current = revenueByOrder.get(item.order_id) ?? 0;
      revenueByOrder.set(item.order_id, current + Number(item.unit_price) * Number(item.quantity));
    }

    for (const order of orders) {
      const orderRevenue = revenueByOrder.get(order.id) ?? 0;
      totalRevenue += orderRevenue;
      if (order.payment_method === "cash") {
        cashRevenue += orderRevenue;
      } else {
        cardRevenue += orderRevenue;
      }
    }
  }

  // Hourly breakdown
  const hourlySales: Record<string, number> = {};
  for (const order of orders) {
    const hour = new Date(order.created_at).getHours();
    const key = `${String(hour).padStart(2, "0")}:00`;
    hourlySales[key] = (hourlySales[key] ?? 0) + 1;
  }

  // Top products
  let topProducts: Array<{ name: string; quantity: number }> = [];
  if (orderIds.length > 0) {
    const { data: topData } = await auth.supabase
      .from("order_items")
      .select("item_id, quantity, menu_items(name)")
      .in("order_id", orderIds);

    const productMap = new Map<string, { name: string; quantity: number }>();
    for (const row of (topData ?? []) as unknown as Array<{
      item_id: string;
      quantity: number;
      menu_items: { name: string } | null;
    }>) {
      const name = row.menu_items?.name ?? "Desconocido";
      const existing = productMap.get(row.item_id);
      if (existing) {
        existing.quantity += Number(row.quantity);
      } else {
        productMap.set(row.item_id, { name, quantity: Number(row.quantity) });
      }
    }
    topProducts = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }

  // Check if there's still an open shift
  const hasOpenShift = shifts.some((s) => s.status === "open");

  // Get minimum cash setting
  const { data: settingsData } = await auth.supabase
    .from("store_settings")
    .select("key, value")
    .eq("key", "minimum_cash_in_drawer")
    .maybeSingle();
  const minimumCash = Number((settingsData as unknown as { value: string } | null)?.value ?? 1000);

  return NextResponse.json({
    preview: true,
    hasOpenShift,
    date: targetDate,
    totalShifts: shifts.length,
    totalOrders: orders.length,
    totalRevenue,
    totalCashSales: cashRevenue,
    totalCardSales: cardRevenue,
    totalCashDrops,
    hourlySales,
    topProducts,
    minimumCash,
  });
}

// POST /api/admin/daily-closing — close the day
export async function POST(request: Request) {
  const auth = await ensureStaff();
  if ("error" in auth) return auth.error;

  let payload: { actualFinalCash: number; notes?: string };
  try {
    payload = (await request.json()) as { actualFinalCash: number; notes?: string };
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const actualFinalCash = Number(payload.actualFinalCash);
  if (isNaN(actualFinalCash) || actualFinalCash < 0) {
    return NextResponse.json({ error: "Monto de cierre invalido." }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Check if already closed
  const { data: existing } = await auth.supabase
    .from("daily_closings")
    .select("id")
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "El día ya fue cerrado." }, { status: 409 });
  }

  // Ensure no open shifts
  const { data: openShift } = await auth.supabase
    .from("shifts")
    .select("id")
    .eq("status", "open")
    .maybeSingle();

  if (openShift) {
    return NextResponse.json({ error: "Debes cerrar todos los turnos antes del cierre de día." }, { status: 400 });
  }

  // Get today's data (reuse preview logic)
  const dayStart = `${today}T00:00:00`;
  const dayEnd = `${today}T23:59:59`;

  const { data: shiftsData } = await auth.supabase
    .from("shifts")
    .select("*")
    .gte("opened_at", dayStart)
    .lte("opened_at", dayEnd);

  const shifts = (shiftsData ?? []) as unknown as Array<{
    id: string;
    opening_cash: number;
    cash_sales_total: number;
    total_cash_drops: number;
  }>;

  const shiftIds = shifts.map((s) => s.id);
  let totalCashDrops = 0;
  if (shiftIds.length > 0) {
    const { data: dropsData } = await auth.supabase
      .from("cash_drops")
      .select("actual_amount")
      .in("shift_id", shiftIds)
      .eq("status", "confirmed");
    totalCashDrops = ((dropsData ?? []) as unknown as Array<{ actual_amount: number }>)
      .reduce((sum, d) => sum + Number(d.actual_amount), 0);
  }

  const { data: ordersData } = await auth.supabase
    .from("orders")
    .select("id, payment_method, created_at")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .eq("status", "entregado");

  const orders = (ordersData ?? []) as unknown as Array<{
    id: string;
    payment_method: string;
    created_at: string;
  }>;

  const orderIds = orders.map((o) => o.id);
  let cashRevenue = 0;
  let cardRevenue = 0;

  if (orderIds.length > 0) {
    const { data: itemsData } = await auth.supabase
      .from("order_items")
      .select("order_id, quantity, unit_price")
      .in("order_id", orderIds);

    const items = (itemsData ?? []) as unknown as Array<{ order_id: string; quantity: number; unit_price: number }>;
    const revenueByOrder = new Map<string, number>();
    for (const item of items) {
      const current = revenueByOrder.get(item.order_id) ?? 0;
      revenueByOrder.set(item.order_id, current + Number(item.unit_price) * Number(item.quantity));
    }

    for (const order of orders) {
      const rev = revenueByOrder.get(order.id) ?? 0;
      if (order.payment_method === "cash") cashRevenue += rev;
      else cardRevenue += rev;
    }
  }

  // Hourly sales
  const hourlySales: Record<string, number> = {};
  for (const order of orders) {
    const hour = new Date(order.created_at).getHours();
    const key = `${String(hour).padStart(2, "0")}:00`;
    hourlySales[key] = (hourlySales[key] ?? 0) + 1;
  }

  // Top products
  let topProducts: Array<{ name: string; quantity: number }> = [];
  if (orderIds.length > 0) {
    const { data: topData } = await auth.supabase
      .from("order_items")
      .select("item_id, quantity, menu_items(name)")
      .in("order_id", orderIds);

    const productMap = new Map<string, { name: string; quantity: number }>();
    for (const row of (topData ?? []) as unknown as Array<{
      item_id: string;
      quantity: number;
      menu_items: { name: string } | null;
    }>) {
      const name = row.menu_items?.name ?? "Desconocido";
      const existing = productMap.get(row.item_id);
      if (existing) existing.quantity += Number(row.quantity);
      else productMap.set(row.item_id, { name, quantity: Number(row.quantity) });
    }
    topProducts = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }

  // Get minimum cash to calculate expected
  const { data: settingsData } = await auth.supabase
    .from("store_settings")
    .select("key, value")
    .eq("key", "minimum_cash_in_drawer")
    .maybeSingle();
  const minimumCash = Number((settingsData as unknown as { value: string } | null)?.value ?? 1000);

  const expectedFinalCash = minimumCash;
  const discrepancy = actualFinalCash - expectedFinalCash;

  // Create daily closing record
  const closingsTable = auth.supabase.from("daily_closings") as unknown as {
    insert: (v: Record<string, unknown>) => {
      select: (cols: string) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
    };
  };

  const { data: closing, error: closeError } = (await closingsTable
    .insert({
      date: today,
      closed_by: auth.userId,
      total_shifts: shifts.length,
      total_orders: orders.length,
      total_cash_sales: cashRevenue,
      total_card_sales: cardRevenue,
      total_cash_drops: totalCashDrops,
      expected_final_cash: expectedFinalCash,
      actual_final_cash: actualFinalCash,
      discrepancy,
      status: "closed",
      top_products: topProducts,
      hourly_sales: hourlySales,
      notes: payload.notes?.trim() || null,
      closed_at: new Date().toISOString(),
    })
    .select("*")
    .maybeSingle()) as { data: unknown; error: unknown };

  if (closeError) {
    return NextResponse.json({ error: "No pudimos cerrar el día." }, { status: 500 });
  }

  return NextResponse.json({ closing });
}
