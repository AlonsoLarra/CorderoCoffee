"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast-provider";
import type { OrderStatus, PaymentMethod, PickupType } from "@/lib/types/domain";

export type AdminOrderCard = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  pickupType: PickupType;
  paymentMethod: PaymentMethod;
  pickupTime: string | null;
  notes: string | null;
};

type OrderQueueProps = {
  orders: AdminOrderCard[];
};

const statusLabel: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  preparando: "Preparando",
  listo: "Listo",
  entregado: "Entregado",
};

const nextTransitionLabel: Record<OrderStatus, string | null> = {
  pendiente: "Aceptar",
  aceptado: "Iniciar preparación",
  preparando: "Marcar listo",
  listo: "Marcar entregado",
  entregado: null,
};

const nextTransitionStatus: Record<OrderStatus, OrderStatus | null> = {
  pendiente: "aceptado",
  aceptado: "preparando",
  preparando: "listo",
  listo: "entregado",
  entregado: null,
};

const pickupLabel: Record<PickupType, string> = {
  ahora: "Ahora",
  agendar: "Agendado",
  al_llegar: "Al llegar",
};

const paymentLabel: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card_pending: "Tarjeta al retirar",
};

function minutesSince(dateIso: string): number {
  const created = new Date(dateIso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - created) / 60000));
}

function urgencyBadge(minutes: number): { label: string; className: string } {
  if (minutes >= 15) {
    return { label: `Urgente (${minutes} min)`, className: "bg-red-100 text-red-800 border-red-200" };
  }

  if (minutes >= 8) {
    return { label: `Atención (${minutes} min)`, className: "bg-amber-100 text-amber-800 border-amber-200" };
  }

  return { label: `En tiempo (${minutes} min)`, className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
}

function formatDate(dateIso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateIso));
}

export function OrderQueue({ orders }: OrderQueueProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-orders-queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          if (refreshTimeoutRef.current) {
            return;
          }

          refreshTimeoutRef.current = setTimeout(() => {
            startTransition(() => {
              router.refresh();
            });

            refreshTimeoutRef.current = null;
          }, 250);
        },
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [router, startTransition]);

  async function moveStatus(orderId: string, currentStatus: OrderStatus) {
    const nextStatus = nextTransitionStatus[currentStatus];
    if (!nextStatus || isPending) {
      return;
    }

    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nextStatus }),
    });

    if (!response.ok) {
      showToast("No pudimos actualizar el estado del pedido.", "error");
      return;
    }

    showToast("Estado actualizado.", "success");

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <section className="mt-8 grid gap-4">
      {orders.map((order) => {
        const elapsedMinutes = minutesSince(order.createdAt);
        const urgency = urgencyBadge(elapsedMinutes);
        const actionLabel = nextTransitionLabel[order.status];

        return (
          <article key={order.id} className="rounded-2xl border border-cordero bg-cordero-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-heading text-2xl text-cordero-espresso">Pedido {order.id.slice(0, 8)}</h3>
              <span className={`rounded-full border px-3 py-1 text-xs ${urgency.className}`}>{urgency.label}</span>
            </div>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <p>Estado: {statusLabel[order.status]}</p>
              <p>Creado: {formatDate(order.createdAt)}</p>
              <p>Retiro: {pickupLabel[order.pickupType]}</p>
              <p>Pago: {paymentLabel[order.paymentMethod]}</p>
              <p>
                Hora retiro: {order.pickupTime ? formatDate(order.pickupTime) : "Sin horario"}
              </p>
            </div>

            {order.notes ? (
              <p className="mt-3 rounded-xl border border-cordero px-3 py-2 text-sm">Notas: {order.notes}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              {actionLabel ? (
                <button
                  className="rounded-full bg-cordero-espresso px-4 py-2 text-xs text-cordero-cream disabled:opacity-50"
                  disabled={isPending}
                  onClick={() => moveStatus(order.id, order.status)}
                  type="button"
                >
                  {isPending ? "Actualizando..." : actionLabel}
                </button>
              ) : (
                <span className="rounded-full border border-cordero px-4 py-2 text-xs">Pedido finalizado</span>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
