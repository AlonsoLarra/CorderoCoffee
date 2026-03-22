import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreateOrderRequest } from "@/lib/types/checkout";
import type { PaymentMethod, PickupType } from "@/lib/types/domain";

function isPickupType(value: string): value is PickupType {
  return value === "ahora" || value === "agendar" || value === "al_llegar";
}

function isPaymentMethod(value: string): value is PaymentMethod {
  return value === "cash" || value === "card_pending" || value === "card_online";
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  let payload: CreateOrderRequest;

  try {
    payload = (await request.json()) as CreateOrderRequest;
  } catch {
    return badRequest("Payload invalido.");
  }

  if (!payload || !Array.isArray(payload.lines) || payload.lines.length === 0) {
    return badRequest("El carrito no tiene productos.");
  }

  if (!isPickupType(payload.pickupType)) {
    return badRequest("Tipo de retiro no valido.");
  }

  if (!isPaymentMethod(payload.paymentMethod)) {
    return badRequest("Metodo de pago no valido.");
  }

  if (payload.pickupType === "agendar" && !payload.scheduledPickupAt) {
    return badRequest("Debes indicar una fecha de retiro para pedidos agendados.");
  }

  const normalizedLines = payload.lines
    .filter((line) => typeof line.itemId === "string")
    .map((line) => ({
      itemId: line.itemId,
      quantity: Number(line.quantity),
      modifiers: Array.isArray(line.modifiers) ? line.modifiers : [],
    }))
    .filter((line) => Number.isInteger(line.quantity) && line.quantity > 0);

  if (normalizedLines.length === 0) {
    return badRequest("No hay productos validos para procesar.");
  }

  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const uniqueItemIds = Array.from(new Set(normalizedLines.map((line) => line.itemId)));

  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id, price, is_active")
    .in("id", uniqueItemIds)
    .eq("is_active", true);

  if (menuError) {
    return NextResponse.json({ error: "No pudimos validar los productos." }, { status: 500 });
  }

  const typedMenuItems = (menuItems ?? []) as unknown as Array<{
    id: string;
    price: number;
    is_active: boolean;
  }>;

  if (typedMenuItems.length !== uniqueItemIds.length) {
    return badRequest("Uno o mas productos no estan disponibles.");
  }

  const priceByItem = new Map(typedMenuItems.map((item) => [item.id, Number(item.price)]));

  const pickupTime =
    payload.pickupType === "agendar" && payload.scheduledPickupAt
      ? new Date(payload.scheduledPickupAt).toISOString()
      : null;

  const ordersTable = supabase.from("orders") as unknown as {
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
      user_id: user?.id ?? null,
      status: "pendiente",
      type: "online",
      pickup_type: payload.pickupType,
      payment_method: payload.paymentMethod,
      pickup_time: pickupTime,
      notes: payload.notes?.trim() ? payload.notes.trim() : null,
    })
    .select("id,status")
    .maybeSingle()) as {
    data: { id: string; status: string } | null;
    error: unknown;
  };

  if (orderError || !createdOrder) {
    return NextResponse.json({ error: "No pudimos crear tu pedido." }, { status: 500 });
  }

  const typedOrder = createdOrder;

  const orderItemsPayload = normalizedLines.map((line) => ({
    order_id: typedOrder.id,
    item_id: line.itemId,
    quantity: line.quantity,
    unit_price: priceByItem.get(line.itemId) ?? 0,
    modifiers: line.modifiers,
  }));

  const orderItemsTable = supabase.from("order_items") as unknown as {
    insert: (values: Record<string, unknown>[]) => Promise<{ error: unknown }>;
  };

  const { error: itemsError } = await orderItemsTable.insert(
    orderItemsPayload as unknown as Record<string, unknown>[],
  );

  if (itemsError) {
    await ordersTable.delete().eq("id", typedOrder.id);
    return NextResponse.json({ error: "No pudimos guardar los productos de tu pedido." }, { status: 500 });
  }

  return NextResponse.json({
    orderId: typedOrder.id,
    status: typedOrder.status,
  });
}
