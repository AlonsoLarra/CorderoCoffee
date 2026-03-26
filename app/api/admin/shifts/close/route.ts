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

  let payload: { closingCash: number; notes?: string };
  try {
    payload = (await request.json()) as { closingCash: number; notes?: string };
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const closingCash = Number(payload.closingCash ?? 0);
  if (isNaN(closingCash) || closingCash < 0) {
    return NextResponse.json({ error: "Monto de cierre invalido." }, { status: 400 });
  }

  const { data: openShift } = await auth.supabase
    .from("shifts")
    .select("id")
    .eq("status", "open")
    .maybeSingle();

  if (!openShift) {
    return NextResponse.json({ error: "No hay un turno abierto." }, { status: 404 });
  }

  const typedShift = openShift as unknown as { id: string };

  const { data: shift, error } = await auth.supabase
    .from("shifts")
    .update({
      closed_by: auth.userId,
      closing_cash: closingCash,
      status: "closed",
      notes: payload.notes?.trim() || null,
      closed_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("id", typedShift.id)
    .select("*")
    .maybeSingle();

  if (error || !shift) {
    return NextResponse.json({ error: "No pudimos cerrar el turno." }, { status: 500 });
  }

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
  if (deliveredIds.length > 0) {
    const { data: itemsData } = await auth.supabase
      .from("order_items")
      .select("quantity, unit_price")
      .in("order_id", deliveredIds);
    const items = (itemsData ?? []) as unknown as Array<{ quantity: number; unit_price: number }>;
    revenue = items.reduce((sum, i) => sum + Number(i.unit_price) * Number(i.quantity), 0);
  }

  const cashOrders = orders.filter((o) => o.status === "entregado" && o.payment_method === "cash").length;
  const cardOrders = orders.filter(
    (o) => o.status === "entregado" && (o.payment_method === "card_pending" || o.payment_method === "card_online"),
  ).length;

  return NextResponse.json({
    shift,
    summary: {
      totalOrders: orders.length,
      deliveredOrders: deliveredIds.length,
      revenue,
      cashOrders,
      cardOrders,
    },
  });
}
