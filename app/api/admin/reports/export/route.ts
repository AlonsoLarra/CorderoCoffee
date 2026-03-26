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

// GET /api/admin/reports/export?from=ISO&to=ISO — download CSV
export async function GET(request: Request) {
  const auth = await ensureStaff();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : (() => { const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0); return d; })();
  const to = toParam ? new Date(toParam) : new Date();
  to.setHours(23, 59, 59, 999);

  const { data: rawOrders, error } = await auth.supabase
    .from("orders")
    .select("id, status, payment_method, created_at, order_items(quantity, unit_price, menu_items(name))")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "No pudimos exportar." }, { status: 500 });
  }

  type RawOrder = {
    id: string;
    status: string;
    payment_method: string;
    created_at: string;
    order_items: Array<{ quantity: number; unit_price: number; menu_items: { name: string } | null }>;
  };

  const orders = (rawOrders ?? []) as unknown as RawOrder[];

  const rows: string[] = ["ID Pedido,Fecha,Estado,Método de pago,Producto,Cantidad,Precio unitario,Subtotal"];

  for (const order of orders) {
    const date = new Date(order.created_at).toLocaleDateString("es-MX");
    for (const item of order.order_items ?? []) {
      const name = item.menu_items?.name ?? "Desconocido";
      const subtotal = Number(item.unit_price) * Number(item.quantity);
      rows.push(
        [
          order.id.slice(0, 8),
          date,
          order.status,
          order.payment_method,
          `"${name}"`,
          item.quantity,
          Number(item.unit_price).toFixed(2),
          subtotal.toFixed(2),
        ].join(","),
      );
    }
  }

  const csv = rows.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ventas_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv"`,
    },
  });
}
