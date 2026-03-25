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

const statusLabel: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  preparando: "Preparando",
  listo: "Listo",
  entregado: "Entregado",
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function OrderStatusPage({ params }: StatusPageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-8 sm:py-14 sm:px-10">
        <h1 className="font-heading text-4xl text-cordero-espresso">Seguimiento de pedido</h1>
        <p className="mt-4 text-cordero-espresso opacity-80">
          Inicia sesión para ver el estado de tus pedidos.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href="/acceso">
            Ir a acceso
          </Link>
          <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href="/">
            Ir al inicio
          </Link>
        </div>
      </main>
    );
  }

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("id,status,pickup_type,payment_method,pickup_time,notes,created_at")
    .eq("id", params.orderId)
    .maybeSingle();

  if (orderError || !orderData) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-8 sm:py-14 sm:px-10">
        <h1 className="font-heading text-4xl text-cordero-espresso">Pedido no encontrado</h1>
        <p className="mt-4 text-cordero-espresso opacity-80">
          No encontramos un pedido con ese identificador dentro de tu sesión.
        </p>
        <Link className="mt-8 inline-block rounded-full border border-cordero px-5 py-2 text-sm" href="/pedido">
          Volver al menú
        </Link>
      </main>
    );
  }

  const order = orderData as unknown as OrderRecord;

  const { data: rawLogs } = await supabase
    .from("order_status_log")
    .select("id,status,changed_at")
    .eq("order_id", params.orderId)
    .order("changed_at", { ascending: true });

  const logs = (rawLogs ?? []) as unknown as OrderLogRecord[];

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-16 sm:px-10">
      <span className="rounded-full border border-cordero bg-cordero-card px-4 py-1 text-xs uppercase tracking-[0.2em] text-cordero-espresso opacity-80">
        Estado de pedido
      </span>

      <h1 className="mt-5 font-heading text-2xl text-cordero-espresso break-all sm:text-4xl">Pedido {order.id}</h1>
      <p className="mt-3 text-cordero-espresso opacity-85">
        Estado actual: <strong>{statusLabel[order.status]}</strong>
      </p>
      <OrderStatusRealtime orderId={params.orderId} />

      <div className="mt-8 grid gap-4 rounded-2xl border border-cordero bg-cordero-card p-5 sm:grid-cols-2">
        <p className="text-sm">Creado: {formatDate(order.created_at)}</p>
        <p className="text-sm">Retiro: {pickupLabel[order.pickup_type]}</p>
        <p className="text-sm">Pago: {paymentLabel[order.payment_method]}</p>
        <p className="text-sm">
          Hora retiro: {order.pickup_time ? formatDate(order.pickup_time) : "Sin horario"}
        </p>
      </div>

      {order.notes ? (
        <div className="mt-4 rounded-2xl border border-cordero bg-cordero-card p-5">
          <p className="text-xs uppercase tracking-[0.15em] opacity-70">Notas</p>
          <p className="mt-2 text-sm">{order.notes}</p>
        </div>
      ) : null}

      <div className="mt-8 rounded-2xl border border-cordero bg-cordero-card p-5">
        <h2 className="font-heading text-2xl">Timeline</h2>
        <ol className="mt-4 space-y-3">
          {logs.length === 0 ? (
            <li className="text-sm opacity-75">Sin movimientos aún.</li>
          ) : (
            logs.map((log) => (
              <li key={log.id} className="rounded-xl border border-cordero px-4 py-3">
                <p className="text-sm font-medium">{statusLabel[log.status]}</p>
                <p className="mt-1 text-xs opacity-70">{formatDate(log.changed_at)}</p>
              </li>
            ))
          )}
        </ol>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href="/pedido">
          Volver al menú
        </Link>
        <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href="/">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
