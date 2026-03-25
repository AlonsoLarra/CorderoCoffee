import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/config/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe no configurado" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Firma de webhook invalida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      return NextResponse.json({ error: "No se encontro orderId en metadata." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Idempotency check: skip if order is already accepted or beyond
    const { data: existingOrder } = await (supabase.from("orders") as unknown as {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { status: string } | null; error: unknown }>;
        };
      };
    })
      .select("status")
      .eq("id", orderId)
      .maybeSingle();

    if (existingOrder && existingOrder.status !== "pendiente") {
      return NextResponse.json({ received: true });
    }

    const ordersTable = supabase.from("orders") as unknown as {
      update: (values: Record<string, unknown>) => {
        eq: (column: string, value: string) => Promise<{ error: unknown }>;
      };
    };

    const { error: updateError } = await ordersTable
      .update({ status: "aceptado", updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (updateError) {
      return NextResponse.json({ error: "No pudimos actualizar el estado del pedido." }, { status: 500 });
    }

    const statusLogTable = supabase.from("order_status_log") as unknown as {
      insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
    };

    await statusLogTable.insert({
      order_id: orderId,
      status: "aceptado",
      changed_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ received: true });
}
