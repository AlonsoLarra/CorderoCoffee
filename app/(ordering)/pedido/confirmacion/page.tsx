import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PaymentMethod, PickupType } from "@/lib/types/domain";

type ConfirmationPageProps = {
  searchParams?: {
    orderId?: string;
  };
};

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  modifiers: { modifierName: string; selectedOption: string }[] | null;
  menu_items: { name: string } | null;
};

type OrderRecord = {
  pickup_type: PickupType;
  payment_method: PaymentMethod;
};

const pickupLabel: Record<PickupType, string> = {
  ahora: "Ahora",
  agendar: "Agendado",
  al_llegar: "Al llegar",
};

const paymentLabel: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card_pending: "Tarjeta al retirar",
  card_online: "Tarjeta en línea",
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const orderId = searchParams?.orderId;

  let items: OrderItem[] = [];
  let order: OrderRecord | null = null;

  if (orderId) {
    const supabase = createSupabaseServerClient();
    const [{ data: rawItems }, { data: rawOrder }] = await Promise.all([
      supabase
        .from("order_items")
        .select("id,quantity,unit_price,modifiers,menu_items(name)")
        .eq("order_id", orderId),
      supabase.from("orders").select("pickup_type,payment_method").eq("id", orderId).maybeSingle(),
    ]);

    items = (rawItems ?? []) as unknown as OrderItem[];
    order = rawOrder as unknown as OrderRecord | null;
  }

  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-5 py-12 text-center sm:py-16">
      <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-cordero-espresso">
        <svg width="32" height="24" viewBox="0 0 32 24" fill="none" aria-hidden="true">
          <path
            d="M3 12.5L11.5 21L29 3"
            stroke="hsl(var(--color-cream))"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className="mt-6 font-heading text-[30px] leading-tight text-cordero-espresso">Pedido confirmado</h1>

      <p className="mx-auto mt-3 max-w-[280px] text-[15px] text-[hsl(var(--color-espresso)/0.6)]">
        Recibimos tu solicitud y el equipo comenzará a prepararla pronto.
      </p>

      <div className="mt-6 rounded-full border border-[hsl(var(--color-espresso)/0.12)] bg-cordero-card px-5 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--color-espresso)/0.55)]">
          Pedido
        </p>
        <p className="font-mono-order text-sm text-cordero-espresso">
          {orderId ? `#${orderId.slice(0, 8)}` : "No disponible"}
        </p>
      </div>

      {items.length > 0 && (
        <div className="mt-5 w-full rounded-[20px] bg-cordero-card p-5 text-left shadow-cordero-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--color-espresso)/0.55)]">
            Tu pedido
          </p>
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm text-cordero-espresso">
                <span>
                  {item.quantity}× {item.menu_items?.name ?? "Producto"}
                  {item.modifiers && item.modifiers.length > 0 ? (
                    <span className="text-[hsl(var(--color-espresso)/0.55)]">
                      {" "}
                      · {item.modifiers.map((m) => m.selectedOption).join(", ")}
                    </span>
                  ) : null}
                </span>
                <span className="flex-shrink-0 opacity-70">{formatPrice(item.unit_price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-[hsl(var(--color-espresso)/0.1)] pt-3 text-sm font-semibold text-cordero-espresso">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      )}

      {order ? (
        <p className="mt-4 text-xs text-[hsl(var(--color-espresso)/0.55)]">
          Retiro: {pickupLabel[order.pickup_type]} / Pago: {paymentLabel[order.payment_method]}
        </p>
      ) : null}

      <div className="mt-8 flex w-full flex-col gap-3">
        {orderId ? (
          <Link
            className="btn-press w-full rounded-full bg-cordero-espresso py-3.5 text-[15px] font-semibold text-cordero-cream"
            href={`/pedido/estado/${orderId}`}
          >
            Seguir mi pedido
          </Link>
        ) : null}
        <Link
          className="btn-press w-full rounded-full border border-[hsl(var(--color-espresso)/0.25)] py-3.5 text-[15px] font-semibold text-cordero-espresso"
          href="/pedido"
        >
          Volver al menú
        </Link>
      </div>
    </main>
  );
}
