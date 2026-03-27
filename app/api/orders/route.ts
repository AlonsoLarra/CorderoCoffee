import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
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
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`orders:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Intenta en un momento." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rl.resetInMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

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

  // Block orders if no shift is open
  const { data: activeShift } = await supabase
    .from("shifts")
    .select("id, cash_sales_total, opening_cash, total_cash_drops, orders_since_threshold")
    .eq("status", "open")
    .maybeSingle();

  if (!activeShift) {
    return NextResponse.json(
      { error: "Los pedidos solo pueden realizarse durante el horario de operación. No hay un turno abierto." },
      { status: 403 },
    );
  }

  const typedActiveShift = activeShift as unknown as {
    id: string;
    cash_sales_total: number;
    opening_cash: number;
    total_cash_drops: number;
    orders_since_threshold: number;
  };

  // Check if cash drop is required (for cash payments)
  if (payload.paymentMethod === "cash") {
    const { data: settingsData } = await supabase
      .from("store_settings")
      .select("key, value")
      .in("key", ["cash_drop_threshold", "max_orders_after_threshold"]);

    const settings: Record<string, string> = {};
    for (const row of (settingsData ?? []) as unknown as Array<{ key: string; value: string }>) {
      settings[row.key] = row.value;
    }

    const threshold = Number(settings.cash_drop_threshold ?? 5000);
    const maxOrders = Number(settings.max_orders_after_threshold ?? 5);
    const currentBalance = Number(typedActiveShift.opening_cash) + Number(typedActiveShift.cash_sales_total) - Number(typedActiveShift.total_cash_drops);

    if (currentBalance >= threshold && typedActiveShift.orders_since_threshold >= maxOrders) {
      return NextResponse.json(
        { error: "Se requiere un corte de caja antes de aceptar más pedidos en efectivo." },
        { status: 403 },
      );
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const uniqueItemIds = Array.from(new Set(normalizedLines.map((line) => line.itemId)));

  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id, name, price, is_active, track_stock, stock_quantity")
    .in("id", uniqueItemIds)
    .eq("is_active", true);

  if (menuError) {
    return NextResponse.json({ error: "No pudimos validar los productos." }, { status: 500 });
  }

  const typedMenuItems = (menuItems ?? []) as unknown as Array<{
    id: string;
    name: string;
    price: number;
    is_active: boolean;
    track_stock: boolean;
    stock_quantity: number | null;
  }>;

  if (typedMenuItems.length !== uniqueItemIds.length) {
    return badRequest("Uno o mas productos no estan disponibles.");
  }

  // Validate stock availability with an optimistic fast-path check (good UX),
  // then atomically reserve stock in the database to prevent race conditions
  // when concurrent orders arrive for the same low-stock item.
  const quantityByItem = new Map<string, number>();
  for (const line of normalizedLines) {
    quantityByItem.set(line.itemId, (quantityByItem.get(line.itemId) ?? 0) + line.quantity);
  }

  const trackedItems = typedMenuItems.filter((item) => item.track_stock && item.stock_quantity !== null);

  // Fast-path: reject obviously-out-of-stock items before hitting the DB
  for (const item of trackedItems) {
    const requested = quantityByItem.get(item.id) ?? 0;
    if (item.stock_quantity! <= 0) {
      return badRequest(`${item.name} está agotado.`);
    }
    if (requested > item.stock_quantity!) {
      return badRequest(
        `Solo quedan ${item.stock_quantity} unidad${item.stock_quantity === 1 ? "" : "es"} de ${item.name}.`,
      );
    }
  }

  // Atomic reservation: decrement stock in a single UPDATE per item so
  // two simultaneous requests can never both claim the last unit.
  const reservedItems: string[] = [];
  for (const item of trackedItems) {
    const qty = quantityByItem.get(item.id) ?? 0;
    const { data: reserved, error: reserveError } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: boolean | null; error: unknown }>;
    }).rpc("reserve_menu_item_stock", { p_item_id: item.id, p_qty: qty });

    if (reserveError || !reserved) {
      // Another request grabbed the last units between our read and now — undo
      // any reservations already made in this loop, then surface the conflict.
      for (const reservedId of reservedItems) {
        const restoreQty = quantityByItem.get(reservedId) ?? 0;
        await (supabase as unknown as {
          rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>;
        }).rpc("reserve_menu_item_stock", { p_item_id: reservedId, p_qty: -restoreQty });
      }
      return NextResponse.json(
        { error: `${item.name} se agotó justo ahora. Intenta de nuevo.` },
        { status: 409 },
      );
    }
    reservedItems.push(item.id);
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

  // Validate loyalty points redemption
  let pointsRedeemed = 0;
  if (user && payload.pointsRedeemed && payload.pointsRedeemed > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("reward_points")
      .eq("id", user.id)
      .maybeSingle();
    const profile = profileData as unknown as { reward_points: number } | null;
    pointsRedeemed = Math.min(payload.pointsRedeemed, profile?.reward_points ?? 0);
  }

  const { data: createdOrder, error: orderError } = (await ordersTable
    .insert({
      user_id: user?.id ?? null,
      status: "pendiente",
      type: "online",
      pickup_type: payload.pickupType,
      payment_method: payload.paymentMethod,
      pickup_time: pickupTime,
      notes: payload.notes?.trim() ? payload.notes.trim().slice(0, 500) : null,
      discount_code_id: payload.discountCodeId ?? null,
      discount_amount: payload.discountAmount ?? 0,
      points_redeemed: pointsRedeemed,
      shift_id: typedActiveShift.id,
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

  // Update shift cash tracking for cash payments
  if (payload.paymentMethod === "cash") {
    const orderTotal = normalizedLines.reduce((sum, line) => {
      return sum + (priceByItem.get(line.itemId) ?? 0) * line.quantity;
    }, 0) - (payload.discountAmount ?? 0);

    const currentBalance = Number(typedActiveShift.opening_cash) + Number(typedActiveShift.cash_sales_total) - Number(typedActiveShift.total_cash_drops);
    const newBalance = currentBalance + orderTotal;

    // Check if we need to track orders past threshold
    const { data: thresholdSetting } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "cash_drop_threshold")
      .maybeSingle();
    const threshold = Number((thresholdSetting as unknown as { value: string } | null)?.value ?? 5000);
    const pastThreshold = newBalance >= threshold;

    const shiftsUpdateTable = supabase.from("shifts") as unknown as {
      update: (v: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
    };

    await shiftsUpdateTable
      .update({
        cash_sales_total: Number(typedActiveShift.cash_sales_total) + orderTotal,
        orders_since_threshold: pastThreshold
          ? typedActiveShift.orders_since_threshold + 1
          : typedActiveShift.orders_since_threshold,
      })
      .eq("id", typedActiveShift.id);

    // Record cash movement
    const movementsTable = supabase.from("cash_movements") as unknown as {
      insert: (v: Record<string, unknown>) => Promise<{ error: unknown }>;
    };
    await movementsTable.insert({
      shift_id: typedActiveShift.id,
      type: "sale",
      amount: orderTotal,
      balance_after: newBalance,
      order_id: typedOrder.id,
      performed_by: user?.id ?? null,
    });
  }

  // Deduct loyalty points if redeemed
  if (user && pointsRedeemed > 0) {
    void (async () => {
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("reward_points")
          .eq("id", user.id)
          .maybeSingle();
        const profile = profileData as unknown as { reward_points: number } | null;
        const current = profile?.reward_points ?? 0;
        const newBalance = Math.max(0, current - pointsRedeemed);

        const profilesTable = supabase.from("profiles") as unknown as {
          update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<unknown> };
        };
        await profilesTable
          .update({ reward_points: newBalance, updated_at: new Date().toISOString() })
          .eq("id", user.id);

        // Append to immutable audit trail
        await (supabase as unknown as {
          from: (t: string) => { insert: (v: Record<string, unknown>) => Promise<unknown> };
        })
          .from("loyalty_events")
          .insert({
            user_id: user.id,
            order_id: typedOrder.id,
            delta: -pointsRedeemed,
            reason: "redeemed",
            balance_after: newBalance,
          });
      } catch {
        // non-blocking
      }
    })();
  }

  // Increment discount code usage
  if (payload.discountCodeId) {
    void (async () => {
      try {
        const { data: codeData } = await supabase
          .from("discount_codes")
          .select("used_count")
          .eq("id", payload.discountCodeId!)
          .maybeSingle();
        const code = codeData as unknown as { used_count: number } | null;
        if (code) {
          const discountTable = supabase.from("discount_codes") as unknown as {
            update: (v: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
          };
          await discountTable
            .update({ used_count: (code.used_count ?? 0) + 1 })
            .eq("id", payload.discountCodeId!);
        }
      } catch {
        // non-blocking
      }
    })();
  }

  return NextResponse.json({
    orderId: typedOrder.id,
    status: typedOrder.status,
  });
}
