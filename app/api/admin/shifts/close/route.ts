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

// PATCH /api/admin/shifts/close — close the active shift
export async function PATCH(request: Request) {
  const auth = await ensureStaff();
  if ("error" in auth) return auth.error;

  let payload: { actualClosingCash: number; notes?: string };
  try {
    payload = (await request.json()) as { actualClosingCash: number; notes?: string };
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const actualClosingCash = Number(payload.actualClosingCash ?? 0);
  if (isNaN(actualClosingCash) || actualClosingCash < 0) {
    return NextResponse.json({ error: "Monto de cierre invalido." }, { status: 400 });
  }

  const { data: openShift } = await auth.supabase
    .from("shifts")
    .select("*")
    .eq("status", "open")
    .maybeSingle();

  if (!openShift) {
    return NextResponse.json({ error: "No hay un turno abierto." }, { status: 404 });
  }

  const typedShift = openShift as unknown as {
    id: string;
    opening_cash: number;
    cash_sales_total: number;
    total_cash_drops: number;
  };

  // Calculate expected closing cash
  const expectedClosingCash = Number(typedShift.opening_cash) + Number(typedShift.cash_sales_total) - Number(typedShift.total_cash_drops);
  const closingDiscrepancy = actualClosingCash - expectedClosingCash;

  // Compute summary for the closed shift
  const { data: shiftOrders } = await auth.supabase
    .from("orders")
    .select("id, status, payment_method")
    .eq("shift_id", typedShift.id);

  const orders = (shiftOrders ?? []) as unknown as Array<{
    id: string;
    status: string;
    payment_method: string;
  }>;

  const deliveredIds = orders.filter((o) => o.status === "entregado").map((o) => o.id);

  let revenue = 0;
  let cashRevenue = 0;
  let cardRevenue = 0;

  if (deliveredIds.length > 0) {
    const { data: itemsData } = await auth.supabase
      .from("order_items")
      .select("order_id, quantity, unit_price")
      .in("order_id", deliveredIds);
    const items = (itemsData ?? []) as unknown as Array<{ order_id: string; quantity: number; unit_price: number }>;

    const revenueByOrder = new Map<string, number>();
    for (const item of items) {
      const current = revenueByOrder.get(item.order_id) ?? 0;
      revenueByOrder.set(item.order_id, current + Number(item.unit_price) * Number(item.quantity));
    }

    for (const order of orders.filter((o) => o.status === "entregado")) {
      const orderRevenue = revenueByOrder.get(order.id) ?? 0;
      revenue += orderRevenue;
      if (order.payment_method === "cash") cashRevenue += orderRevenue;
      else cardRevenue += orderRevenue;
    }
  }

  const cashOrders = orders.filter((o) => o.status === "entregado" && o.payment_method === "cash").length;
  const cardOrders = orders.filter(
    (o) => o.status === "entregado" && (o.payment_method === "card_pending" || o.payment_method === "card_online"),
  ).length;

  // Get cash drops for this shift
  const { data: dropsData } = await auth.supabase
    .from("cash_drops")
    .select("actual_amount, created_at")
    .eq("shift_id", typedShift.id)
    .eq("status", "confirmed");
  const cashDrops = (dropsData ?? []) as unknown as Array<{ actual_amount: number; created_at: string }>;

  const shiftsTable = auth.supabase.from("shifts") as unknown as {
    update: (v: Record<string, unknown>) => {
      eq: (col: string, val: string) => {
        select: (cols: string) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
      };
    };
  };
  const { data: shift, error } = (await shiftsTable
    .update({
      closed_by: auth.userId,
      closing_cash: actualClosingCash,
      expected_closing_cash: expectedClosingCash,
      actual_closing_cash: actualClosingCash,
      closing_discrepancy: closingDiscrepancy,
      cash_sales_total: cashRevenue,
      card_sales_total: cardRevenue,
      status: "closed",
      notes: payload.notes?.trim() || null,
      closed_at: new Date().toISOString(),
    })
    .eq("id", typedShift.id)
    .select("*")
    .maybeSingle()) as { data: unknown; error: unknown };

  if (error || !shift) {
    return NextResponse.json({ error: "No pudimos cerrar el turno." }, { status: 500 });
  }

  // Record closing cash movement
  const movementsTable = auth.supabase.from("cash_movements") as unknown as {
    insert: (v: Record<string, unknown>) => Promise<{ error: unknown }>;
  };

  await movementsTable.insert({
    shift_id: typedShift.id,
    type: "closing",
    amount: -actualClosingCash,
    balance_after: 0,
    performed_by: auth.userId,
    notes: closingDiscrepancy !== 0
      ? `Cierre con discrepancia de ${closingDiscrepancy > 0 ? "+" : ""}${closingDiscrepancy.toFixed(2)}`
      : "Cierre de turno",
  });

  return NextResponse.json({
    shift,
    summary: {
      totalOrders: orders.length,
      deliveredOrders: deliveredIds.length,
      revenue,
      cashRevenue,
      cardRevenue,
      cashOrders,
      cardOrders,
      expectedClosingCash,
      actualClosingCash,
      closingDiscrepancy,
      cashDrops,
    },
  });
}
