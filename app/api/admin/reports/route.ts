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

  return { supabase };
}

// GET /api/admin/reports?from=ISO&to=ISO&type=sales|hourly|payment-methods
export async function GET(request: Request) {
  const auth = await ensureStaff();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "sales";
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : (() => { const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0); return d; })();
  const to = toParam ? new Date(toParam) : new Date();
  to.setHours(23, 59, 59, 999);

  const { data: rawOrders, error: ordersError } = await auth.supabase
    .from("orders")
    .select("id, status, payment_method, created_at")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .order("created_at", { ascending: true });

  if (ordersError) {
    return NextResponse.json({ error: "No pudimos cargar los datos." }, { status: 500 });
  }

  type OrderRow = { id: string; status: string; payment_method: string; created_at: string };
  const orders = (rawOrders ?? []) as unknown as OrderRow[];
  const deliveredOrders = orders.filter((o) => o.status === "entregado");
  const deliveredIds = deliveredOrders.map((o) => o.id);

  // Fetch order items for delivered orders
  let orderItems: Array<{ order_id: string; quantity: number; unit_price: number; menu_items: { name: string; category_id: string } | null }> = [];
  if (deliveredIds.length > 0) {
    const { data: rawItems } = await auth.supabase
      .from("order_items")
      .select("order_id, quantity, unit_price, menu_items(name, category_id)")
      .in("order_id", deliveredIds);
    orderItems = (rawItems ?? []) as unknown as typeof orderItems;
  }

  const totalRevenue = orderItems.reduce((sum, i) => sum + Number(i.unit_price) * Number(i.quantity), 0);
  const totalOrders = deliveredOrders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  if (type === "sales") {
    // Top products
    const productTotals = new Map<string, number>();
    for (const item of orderItems) {
      const name = item.menu_items?.name ?? "Desconocido";
      productTotals.set(name, (productTotals.get(name) ?? 0) + Number(item.quantity));
    }
    const topProducts = Array.from(productTotals.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      avgTicket,
      topProducts,
    });
  }

  if (type === "hourly") {
    // Group by hour of day
    const byHour = new Array(24).fill(0).map((_, h) => ({ hour: h, orders: 0, revenue: 0 }));

    const revenueByOrder = new Map<string, number>();
    for (const item of orderItems) {
      revenueByOrder.set(
        item.order_id,
        (revenueByOrder.get(item.order_id) ?? 0) + Number(item.unit_price) * Number(item.quantity),
      );
    }

    for (const order of deliveredOrders) {
      const hour = new Date(order.created_at).getHours();
      byHour[hour].orders += 1;
      byHour[hour].revenue += revenueByOrder.get(order.id) ?? 0;
    }

    return NextResponse.json({ hourly: byHour });
  }

  if (type === "payment-methods") {
    const paymentTotals: Record<string, { orders: number; revenue: number }> = {};
    const revenueByOrder = new Map<string, number>();
    for (const item of orderItems) {
      revenueByOrder.set(
        item.order_id,
        (revenueByOrder.get(item.order_id) ?? 0) + Number(item.unit_price) * Number(item.quantity),
      );
    }

    for (const order of deliveredOrders) {
      const method = order.payment_method;
      if (!paymentTotals[method]) paymentTotals[method] = { orders: 0, revenue: 0 };
      paymentTotals[method].orders += 1;
      paymentTotals[method].revenue += revenueByOrder.get(order.id) ?? 0;
    }

    return NextResponse.json({ paymentMethods: paymentTotals, totalRevenue, totalOrders });
  }

  return NextResponse.json({ error: "Tipo de reporte invalido." }, { status: 400 });
}
