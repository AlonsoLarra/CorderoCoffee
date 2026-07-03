import Link from "next/link";

import { OrderStatusRealtime } from "@/components/ordering/order-status-realtime";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus, PaymentMethod, PickupType } from "@/lib/types/domain";

type StatusPageProps = {
  params: {
    orderId: string;
  };
};

type OrderRecord = {
  id: string;
  status: OrderStatus;
  pickup_type: PickupType;
  payment_method: PaymentMethod;
  pickup_time: string | null;
  notes: string | null;
  created_at: string;
};

type OrderLogRecord = {
  id: string;
  status: OrderStatus;
  changed_at: string;
};

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  menu_items: { name: string } | null;
};

const STEPS: OrderStatus[] = ["pendiente", "aceptado", "preparando", "listo", "entregado"];

const stepLabel: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  preparando: "Preparando",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const statusPhrase: Record<OrderStatus, string> = {
  pendiente: "Recibimos tu pedido",
  aceptado: "Tu pedido fue aceptado",
  preparando: "Preparando tu pedido",
  listo: "Tu pedido está listo",
  entregado: "Pedido entregado",
  cancelado: "Pedido cancelado",
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

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeStyle: "short" }).format(new Date(value));
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export const dynamic = "force-dynamic";

export default async function OrderStatusPage({ params }: StatusPageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 py-10">
        <h1 className="font-heading text-3xl text-cordero-espresso">Seguimiento de pedido</h1>
        <p className="mt-4 text-[15px] text-[hsl(var(--color-espresso)/0.7)]">
          Inicia sesión para ver el estado de tus pedidos.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-full border border-[hsl(var(--color-espresso)/0.25)] px-5 py-2 text-sm" href="/acceso">
            Ir a acceso
          </Link>
          <Link className="rounded-full border border-[hsl(var(--color-espresso)/0.25)] px-5 py-2 text-sm" href="/">
            Ir al inicio
          </Link>
        </div>
      </main>
    );
  }

  const [{ data: orderData, error: orderError }, { data: rawLogs }, { data: rawItems }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id,status,pickup_type,payment_method,pickup_time,notes,created_at")
        .eq("id", params.orderId)
        .maybeSingle(),
      supabase
        .from("order_status_log")
        .select("id,status,changed_at")
        .eq("order_id", params.orderId)
        .order("changed_at", { ascending: true }),
      supabase
        .from("order_items")
        .select("id,quantity,unit_price,menu_items(name)")
        .eq("order_id", params.orderId),
    ]);

  if (orderError || !orderData) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 py-10">
        <h1 className="font-heading text-3xl text-cordero-espresso">Pedido no encontrado</h1>
        <p className="mt-4 text-[15px] text-[hsl(var(--color-espresso)/0.7)]">
          No encontramos un pedido con ese identificador dentro de tu sesión.
        </p>
        <Link
          className="mt-8 inline-block rounded-full border border-[hsl(var(--color-espresso)/0.25)] px-5 py-2 text-sm"
          href="/pedido"
        >
          Volver al menú
        </Link>
      </main>
    );
  }

  const order = orderData as unknown as OrderRecord;
  const logs = (rawLogs ?? []) as unknown as OrderLogRecord[];
  const items = (rawItems ?? []) as unknown as OrderItem[];
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const logByStatus = new Map(logs.map((log) => [log.status, log.changed_at]));
  const cancelled = order.status === "cancelado";
  const currentStepIndex = STEPS.indexOf(order.status);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 py-8 pb-14 sm:py-10">
      <div className="flex items-center gap-3">
        <Link
          href="/pedido/historial"
          aria-label="Volver"
          className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full border border-[hsl(var(--color-espresso)/0.14)] text-cordero-espresso"
        >
          ‹
        </Link>
        <h1 className="font-heading text-2xl text-cordero-espresso">
          Pedido <span className="font-mono-order">#{order.id.slice(0, 8)}</span>
        </h1>
      </div>

      <OrderStatusRealtime orderId={params.orderId} />

      {/* Status hero card */}
      <div
        className={`mt-5 rounded-[22px] p-5 text-cordero-cream ${
          cancelled ? "bg-[hsl(var(--color-terracotta))]" : "bg-cordero-espresso"
        }`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-75">Estado actual</p>
        <p className="mt-1 font-heading text-2xl">{statusPhrase[order.status]}</p>
        <p className="mt-1 text-sm opacity-75">
          Retiro: {pickupLabel[order.pickup_type]}
          {order.pickup_time ? ` · ${formatTime(order.pickup_time)}` : ""}
        </p>
      </div>

      {/* Vertical stepper */}
      {!cancelled ? (
        <div className="mt-5 rounded-[20px] bg-cordero-card p-5 shadow-cordero-card">
          <ol className="space-y-0">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const timestamp = logByStatus.get(step);
              const isLast = idx === STEPS.length - 1;

              return (
                <li key={step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {isCurrent ? (
                      <span className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full bg-[hsl(var(--color-terracotta))] shadow-cordero-halo" />
                    ) : isCompleted ? (
                      <span className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full bg-cordero-espresso" />
                    ) : (
                      <span className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full opacity-25 ring-2 ring-inset ring-[hsl(var(--color-espresso))]" />
                    )}
                    {!isLast ? (
                      <span
                        className={`w-px flex-1 ${
                          isCompleted ? "bg-cordero-espresso" : "bg-[hsl(var(--color-espresso)/0.2)]"
                        }`}
                        style={{ minHeight: "1.75rem" }}
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 items-center justify-between pb-5">
                    <span
                      className={`text-sm ${
                        isCurrent
                          ? "font-semibold text-[hsl(var(--color-terracotta-dark))]"
                          : isCompleted
                          ? "text-cordero-espresso"
                          : "text-[hsl(var(--color-espresso)/0.45)]"
                      }`}
                    >
                      {stepLabel[step]}
                    </span>
                    {timestamp ? (
                      <span className="text-xs text-[hsl(var(--color-espresso)/0.5)]">
                        {formatTime(timestamp)}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      {items.length > 0 && (
        <div className="mt-5 rounded-[20px] bg-cordero-card p-5 shadow-cordero-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--color-espresso)/0.55)]">
            Tu pedido
          </p>
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm text-cordero-espresso">
                <span>
                  {item.quantity}× {item.menu_items?.name ?? "Producto"}
                </span>
                <span className="opacity-70">{formatPrice(item.unit_price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-[hsl(var(--color-espresso)/0.1)] pt-3 text-sm font-semibold text-cordero-espresso">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-cordero-card p-4 shadow-cordero-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[hsl(var(--color-espresso)/0.5)]">
            Retiro
          </p>
          <p className="mt-1 text-sm font-medium text-cordero-espresso">{pickupLabel[order.pickup_type]}</p>
        </div>
        <div className="rounded-2xl bg-cordero-card p-4 shadow-cordero-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[hsl(var(--color-espresso)/0.5)]">
            Pago
          </p>
          <p className="mt-1 text-sm font-medium text-cordero-espresso">{paymentLabel[order.payment_method]}</p>
        </div>
      </div>

      {order.notes ? (
        <div className="mt-4 rounded-2xl bg-cordero-card p-4 shadow-cordero-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[hsl(var(--color-espresso)/0.5)]">
            Notas
          </p>
          <p className="mt-1 text-sm text-cordero-espresso">{order.notes}</p>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="rounded-full border border-[hsl(var(--color-espresso)/0.25)] px-5 py-2 text-sm" href="/pedido">
          Volver al menú
        </Link>
        <Link className="rounded-full border border-[hsl(var(--color-espresso)/0.25)] px-5 py-2 text-sm" href="/">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
