import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/types/domain";

type WalkinPayload = {
  lines: Array<{ itemId: string; quantity: number }>;
  paymentMethod: PaymentMethod;
  notes?: string;
};

function isPaymentMethod(value: string): value is PaymentMethod {
  return value === "cash" || value === "card_pending";
}

async function ensureAdmin() {
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

export async function POST(request: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return auth.error;
  }

  const { data: activeShift } = await auth.supabase
    .from("shifts")
    .select("id")
    .eq("status", "open")
    .maybeSingle();

  if (!activeShift) {
    return NextResponse.json({ error: "No hay un turno abierto. Abre un turno antes de crear pedidos." }, { status: 403 });
  }

  let payload: WalkinPayload;
  try {
    payload = (await request.json()) as WalkinPayload;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    return NextResponse.json({ error: "Debes agregar al menos un producto." }, { status: 400 });
  }

  if (!isPaymentMethod(payload.paymentMethod)) {
    return NextResponse.json({ error: "Metodo de pago invalido." }, { status: 400 });
  }

  const normalizedLines = payload.lines
    .filter((line) => typeof line.itemId === "string")
    .map((line) => ({ itemId: line.itemId, quantity: Number(line.quantity) }))
    .filter((line) => Number.isInteger(line.quantity) && line.quantity > 0);

  if (normalizedLines.length === 0) {
    return NextResponse.json({ error: "No hay productos validos." }, { status: 400 });
  }

  const uniqueItemIds = Array.from(new Set(normalizedLines.map((line) => line.itemId)));

  const { data: menuItems, error: menuError } = await auth.supabase
    .from("menu_items")
    .select("id,price,is_active")
    .in("id", uniqueItemIds)
    .eq("is_active", true);

  if (menuError) {
    return NextResponse.json({ error: "No pudimos validar productos." }, { status: 500 });
  }

  const typedMenuItems = (menuItems ?? []) as unknown as Array<{ id: string; price: number }>;
  if (typedMenuItems.length !== uniqueItemIds.length) {
    return NextResponse.json({ error: "Uno o mas productos no estan activos." }, { status: 400 });
  }

  const priceByItem = new Map(typedMenuItems.map((item) => [item.id, Number(item.price)]));

  const ordersTable = auth.supabase.from("orders") as unknown as {
    insert: (values: Record<string, unknown>) => {
      select: (columns: string) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
    delete: () => {
      eq: (column: string, value: string) => Promise<unknown>;
    };
  };

  const { data: createdOrder, error: orderError } = (await ordersTable
    .insert({
      user_id: null,
      status: "pendiente",
      type: "walkin",
      pickup_type: "al_llegar",
      payment_method: payload.paymentMethod,
      notes: payload.notes?.trim() ? payload.notes.trim() : null,
    })
    .select("id,status")
    .maybeSingle()) as {
    data: { id: string; status: string } | null;
    error: unknown;
  };

  if (orderError || !createdOrder) {
    return NextResponse.json({ error: "No pudimos crear pedido walk-in." }, { status: 500 });
  }

  const orderItemsPayload = normalizedLines.map((line) => ({
    order_id: createdOrder.id,
    item_id: line.itemId,
    quantity: line.quantity,
    unit_price: priceByItem.get(line.itemId) ?? 0,
    modifiers: [],
  }));

  const orderItemsTable = auth.supabase.from("order_items") as unknown as {
    insert: (values: Record<string, unknown>[]) => Promise<{ error: unknown }>;
  };

  const { error: itemsError } = await orderItemsTable.insert(orderItemsPayload as Record<string, unknown>[]);
  if (itemsError) {
    await ordersTable.delete().eq("id", createdOrder.id);
    return NextResponse.json({ error: "No pudimos guardar items walk-in." }, { status: 500 });
  }

  return NextResponse.json({ orderId: createdOrder.id, status: createdOrder.status });
}
