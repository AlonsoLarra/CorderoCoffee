import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendOrderReadyEmail } from "@/lib/services/notifications";
import { logger } from "@/lib/logger";
import type { OrderStatus } from "@/lib/types/domain";

const NOTIFICATION_CONTENT: Partial<Record<OrderStatus, { title: string; body: string }>> = {
  aceptado:   { title: "Pedido aceptado",       body: "Tu pedido fue aceptado y será preparado pronto." },
  preparando: { title: "En preparación",         body: "Tu pedido está siendo preparado." },
  listo:      { title: "¡Listo para recoger!",   body: "Tu pedido está listo. Pasa a recogerlo." },
  entregado:  { title: "Pedido entregado",       body: "Tu pedido fue entregado. ¡Que lo disfrutes!" },
  cancelado:  { title: "Pedido cancelado",       body: "Tu pedido fue cancelado." },
};

// Descuenta del inventario los insumos consumidos por los ítems del pedido
async function deductInventory(orderId: string): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();

  // Obtener los ítems del pedido con sus cantidades
  const { data: orderItemsData } = await supabaseAdmin
    .from("order_items")
    .select("item_id,quantity")
    .eq("order_id", orderId);

  const orderItems = (orderItemsData ?? []) as unknown as { item_id: string; quantity: number }[];
  if (orderItems.length === 0) return;

  // Para cada ítem del pedido, obtener su receta y descontar del inventario
  for (const orderItem of orderItems) {
    const { data: ingredientsData } = await supabaseAdmin
      .from("menu_item_ingredients")
      .select("inventory_item_id,quantity")
      .eq("menu_item_id", orderItem.item_id);

    const ingredients = (ingredientsData ?? []) as unknown as {
      inventory_item_id: string;
      quantity: number;
    }[];

    for (const ingredient of ingredients) {
      const deduction = Number(orderItem.quantity) * Number(ingredient.quantity);

      // Descontar el stock usando RPC para evitar race conditions
      await (supabaseAdmin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> }).rpc("decrement_inventory_stock", {
        p_item_id: ingredient.inventory_item_id,
        p_amount: deduction,
      });
    }
  }
}

type TransitionPayload = {
  nextStatus: OrderStatus;
};

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pendiente: ["aceptado", "cancelado"],
  aceptado: ["preparando", "cancelado"],
  preparando: ["listo", "cancelado"],
  listo: ["entregado", "cancelado"],
  entregado: [],
  cancelado: ["pendiente"],
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// Obtiene el email del cliente y envía la notificación de pedido listo
async function notifyCustomerOrderReady(orderId: string): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();

  // Obtener el user_id del pedido
  const { data: orderRow } = await supabaseAdmin
    .from("orders")
    .select("user_id")
    .eq("id", orderId)
    .maybeSingle();

  const order = orderRow as unknown as { user_id: string | null } | null;
  if (!order?.user_id) return;

  // Obtener el email del usuario usando el cliente admin de Supabase Auth
  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
  const email = userData?.user?.email;
  if (!email) return;

  await sendOrderReadyEmail({
    toEmail: email,
    orderShortId: orderId.slice(0, 8),
    orderId,
  });
}

function isOrderStatus(value: string): value is OrderStatus {
  return (
    value === "pendiente" ||
    value === "aceptado" ||
    value === "preparando" ||
    value === "listo" ||
    value === "entregado" ||
    value === "cancelado"
  );
}

export async function PATCH(request: Request, context: { params: { orderId: string } }) {
  let payload: TransitionPayload;

  try {
    payload = (await request.json()) as TransitionPayload;
  } catch {
    return badRequest("Payload invalido.");
  }

  if (!payload?.nextStatus || !isOrderStatus(payload.nextStatus)) {
    return badRequest("Estado objetivo invalido.");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const typedProfile = profile as unknown as { role?: string } | null;
  const allowedRoles = ["admin", "super_admin", "employee"];
  if (!typedProfile || !allowedRoles.includes(typedProfile.role ?? "")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("id,status,user_id")
    .eq("id", context.params.orderId)
    .maybeSingle();

  if (orderError || !orderData) {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }

  const order = orderData as unknown as { id: string; status: OrderStatus; user_id: string | null };
  const nextAllowed = allowedTransitions[order.status] ?? [];
  if (!nextAllowed.includes(payload.nextStatus)) {
    return badRequest(`Transicion invalida desde ${order.status} hacia ${payload.nextStatus}.`);
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ status: payload.nextStatus } as never)
    .eq("id", order.id);

  if (updateError) {
    return NextResponse.json({ error: "No pudimos actualizar el estado." }, { status: 500 });
  }

  // Crear notificación persistente in-app (fire and forget)
  if (order.user_id) {
    const notifContent = NOTIFICATION_CONTENT[payload.nextStatus];
    if (notifContent) {
      supabaseAdmin
        .from("notifications")
        .insert({
          user_id: order.user_id,
          order_id: order.id,
          title: notifContent.title,
          body: notifContent.body,
        } as never)
        .then(({ error: notifErr }: { error: unknown }) => {
          if (notifErr) logger.error("Error creating notification", { orderId: order.id, error: notifErr });
        });
    }
  }

  // Notificar al cliente cuando el pedido está listo para recoger (fire and forget)
  if (payload.nextStatus === "listo") {
    notifyCustomerOrderReady(order.id).catch((err: unknown) =>
      logger.error("Error enviando notificacion de pedido listo", { route: "/api/admin/orders/[orderId]/status", orderId: order.id, error: err })
    );
  }

  // Descontar inventario al entregar el pedido (non-blocking)
  if (payload.nextStatus === "entregado") {
    deductInventory(order.id).catch(console.error);
  }

  // Otorgar puntos de lealtad al entregar el pedido (non-blocking)
  if (payload.nextStatus === "entregado") {
    void (async () => {
      try {
        const { data: orderForPoints } = await supabase
          .from("orders")
          .select("user_id")
          .eq("id", order.id)
          .maybeSingle();

        const typedOrderForPoints = orderForPoints as unknown as { user_id: string | null } | null;
        if (!typedOrderForPoints?.user_id) return;

        const { data: itemsData } = await supabase
          .from("order_items")
          .select("quantity")
          .eq("order_id", order.id);

        const items = (itemsData ?? []) as unknown as { quantity: number }[];
        const points = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0) * 10;
        if (points <= 0) return;

        const { data: profileData } = await supabase
          .from("profiles")
          .select("reward_points")
          .eq("id", typedOrderForPoints.user_id)
          .maybeSingle();

        const typedProfileData = profileData as unknown as { reward_points: number } | null;
        const currentPoints = typedProfileData?.reward_points ?? 0;
        const newBalance = currentPoints + points;

        const profilesTable = supabase.from("profiles") as unknown as {
          update: (values: Record<string, unknown>) => {
            eq: (column: string, value: string) => Promise<unknown>;
          };
        };
        await profilesTable
          .update({ reward_points: newBalance, updated_at: new Date().toISOString() })
          .eq("id", typedOrderForPoints.user_id);

        // Append to immutable audit trail
        await supabaseAdmin
          .from("loyalty_events")
          .insert({
            user_id: typedOrderForPoints.user_id,
            order_id: order.id,
            delta: points,
            reason: "order_delivered",
            balance_after: newBalance,
          } as never);
      } catch {
        // Non-blocking: ignorar errores en otorgamiento de puntos
      }
    })();
  }

  return NextResponse.json({
    orderId: order.id,
    status: payload.nextStatus,
  });
}
