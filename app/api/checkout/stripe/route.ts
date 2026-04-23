import { NextResponse } from "next/server";
import Stripe from "stripe";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  getEmailVerificationErrorMessage,
  isEmailVerified,
} from "@/lib/supabase/email-verification";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/config/env";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`checkout:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos de pago. Intenta en un momento." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rl.resetInMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe no configurado" }, { status: 503 });
  }

  let body: { orderId?: string };

  try {
    body = (await request.json()) as { orderId?: string };
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const { orderId } = body;

  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json({ error: "Se requiere el ID del pedido." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !isEmailVerified(user)) {
    return NextResponse.json({ error: getEmailVerificationErrorMessage() }, { status: 403 });
  }

  // Fetch the order
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("id, status, payment_method")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !orderData) {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }

  const order = orderData as unknown as { id: string; status: string; payment_method: string };

  // Fetch order items with menu item names
  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .select("id, item_id, quantity, unit_price")
    .eq("order_id", orderId);

  if (itemsError || !itemsData || itemsData.length === 0) {
    return NextResponse.json({ error: "No se encontraron productos en el pedido." }, { status: 400 });
  }

  const items = itemsData as unknown as Array<{
    id: string;
    item_id: string;
    quantity: number;
    unit_price: number;
  }>;

  // Fetch menu item names
  const itemIds = items.map((item) => item.item_id);
  const { data: menuItemsData, error: menuItemsError } = await supabase
    .from("menu_items")
    .select("id, name")
    .in("id", itemIds);

  if (menuItemsError) {
    return NextResponse.json({ error: "No pudimos obtener los datos del menú." }, { status: 500 });
  }

  const menuItems = (menuItemsData ?? []) as unknown as Array<{ id: string; name: string }>;
  const nameById = new Map(menuItems.map((m) => [m.id, m.name]));

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });

  const baseUrl = request.headers.get("origin") ?? env.APP_URL;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
    price_data: {
      currency: "mxn",
      product_data: {
        name: nameById.get(item.item_id) ?? item.item_id,
      },
      unit_amount: Math.round(item.unit_price * 100),
    },
    quantity: item.quantity,
  }));

  let session: Stripe.Checkout.Session;

  try {
    session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/pedido/estado/${orderId}?pago=exitoso`,
      cancel_url: `${baseUrl}/pedido`,
      metadata: { orderId: order.id },
    });
  } catch (stripeError) {
    const message = stripeError instanceof Error ? stripeError.message : "Error al crear sesión de pago.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
