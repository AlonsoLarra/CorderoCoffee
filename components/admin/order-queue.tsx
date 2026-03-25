"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  cancelado: "Cancelado",
};

const nextTransitionLabel: Partial<Record<OrderStatus, string>> = {
  pendiente: "Aceptar",
  aceptado: "Iniciar preparación",
  preparando: "Marcar listo",
  listo: "Marcar entregado",
};

const nextTransitionStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  pendiente: "aceptado",
  aceptado: "preparando",
  preparando: "listo",
  listo: "entregado",
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

const columnConfig: { status: OrderStatus; label: string; accent: string }[] = [
  { status: "pendiente", label: "Pendiente", accent: "border-amber-400" },
  { status: "aceptado", label: "Aceptado", accent: "border-blue-400" },
  { status: "preparando", label: "Preparando", accent: "border-violet-400" },
  { status: "listo", label: "Listo para retirar", accent: "border-emerald-400" },
  { status: "entregado", label: "Entregado", accent: "border-cordero" },
];

function minutesSince(dateIso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateIso).getTime()) / 60000));
}

function urgencyBadge(minutes: number, status: OrderStatus): { label: string; className: string } | null {
  if (status === "entregado" || status === "cancelado") return null;
  if (minutes >= 15) {
    return { label: `${minutes} min — Urgente`, className: "bg-red-100 text-red-800 border-red-200" };
  }
  if (minutes >= 8) {
    return { label: `${minutes} min — Atención`, className: "bg-amber-100 text-amber-800 border-amber-200" };
  }
  return { label: `${minutes} min`, className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
}

function formatTime(dateIso: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeStyle: "short" }).format(new Date(dateIso));
}

type OrderCardProps = {
  order: AdminOrderCard;
  faded?: boolean;
  onAction: (orderId: string, nextStatus: OrderStatus) => void;
  onCancel: (orderId: string) => void;
  onReopen: (orderId: string) => void;
  isPending: boolean;
};

function OrderCardComponent({ order, faded, onAction, onCancel, onReopen, isPending }: OrderCardProps) {
  const elapsedMinutes = minutesSince(order.createdAt);
  const urgency = urgencyBadge(elapsedMinutes, order.status);
  const actionLabel = nextTransitionLabel[order.status];
  const nextStatus = nextTransitionStatus[order.status];

  return (
    <article
      className={`rounded-2xl border bg-cordero-card p-4 transition-opacity ${
        faded ? "opacity-50" : "opacity-100"
      } border-cordero`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-heading text-base text-cordero-espresso">#{order.id.slice(0, 8)}</span>
        {urgency ? (
          <span className={`rounded-full border px-2 py-0.5 text-xs ${urgency.className}`}>{urgency.label}</span>
        ) : null}
      </div>

      <div className="mt-2 space-y-0.5 text-xs text-cordero-espresso opacity-80">
        <p>{pickupLabel[order.pickupType]} · {paymentLabel[order.paymentMethod]}</p>
        <p>Creado: {formatTime(order.createdAt)}</p>
        {order.pickupTime ? <p>Retiro: {formatTime(order.pickupTime)}</p> : null}
      </div>

      {order.notes ? (
        <p className="mt-2 rounded-lg border border-cordero px-2 py-1 text-xs">{order.notes}</p>
      ) : null}

      {!faded && order.status !== "cancelado" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {actionLabel && nextStatus ? (
            <button
              className="rounded-full bg-cordero-espresso px-3 py-1 text-xs text-cordero-cream disabled:opacity-50"
              disabled={isPending}
              onClick={() => onAction(order.id, nextStatus)}
              type="button"
            >
              {actionLabel}
            </button>
          ) : null}
          <button
            className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
            disabled={isPending}
            onClick={() => onCancel(order.id)}
            type="button"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {order.status === "cancelado" ? (
        <div className="mt-3">
          <button
            className="rounded-full border border-cordero px-3 py-1 text-xs disabled:opacity-50"
            disabled={isPending}
            onClick={() => onReopen(order.id)}
            type="button"
          >
            Reabrir
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function OrderQueue({ orders }: OrderQueueProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canceledOpen, setCanceledOpen] = useState<boolean>(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-orders-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          if (refreshTimeoutRef.current) return;
          refreshTimeoutRef.current = setTimeout(() => {
            startTransition(() => router.refresh());
            refreshTimeoutRef.current = null;
          }, 250);
        },
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      void supabase.removeChannel(channel);
    };
  }, [router, startTransition]);

  async function updateStatus(orderId: string, nextStatus: OrderStatus) {
    if (isPending) return;
    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextStatus }),
    });

    if (!response.ok) {
      showToast("No pudimos actualizar el estado del pedido.", "error");
      return;
    }

    showToast("Estado actualizado.", "success");
    startTransition(() => router.refresh());
  }

  const canceledOrders = orders.filter((o) => o.status === "cancelado");
  const activeOrders = orders.filter((o) => o.status !== "cancelado");

  return (
    <div className="mt-6 space-y-4">
      {/* Kanban columns — horizontal scroll on small screens */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4" style={{ minWidth: "fit-content" }}>
          {columnConfig.map(({ status, label, accent }) => {
            const columnOrders = activeOrders.filter((o) => o.status === status);
            const faded = status === "entregado";

            return (
              <div
                key={status}
                className={`flex w-60 flex-shrink-0 flex-col rounded-2xl border-t-4 bg-cordero-card/40 p-3 ${accent}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-heading text-sm text-cordero-espresso">{label}</h3>
                  <span className="rounded-full bg-cordero-espresso/10 px-2 py-0.5 text-xs text-cordero-espresso">
                    {columnOrders.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {columnOrders.length === 0 ? (
                    <p className="py-4 text-center text-xs text-cordero-espresso opacity-40">—</p>
                  ) : (
                    columnOrders.map((order) => (
                      <OrderCardComponent
                        key={order.id}
                        faded={faded}
                        isPending={isPending}
                        onAction={(id, next) => updateStatus(id, next)}
                        onCancel={(id) => updateStatus(id, "cancelado")}
                        onReopen={(id) => updateStatus(id, "pendiente")}
                        order={order}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsed canceled section */}
      {canceledOrders.length > 0 ? (
        <div className="rounded-2xl border border-cordero bg-cordero-card/40">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setCanceledOpen((prev) => !prev)}
            type="button"
          >
            <span className="font-heading text-sm text-cordero-espresso opacity-70">
              Cancelados ({canceledOrders.length})
            </span>
            <span className="text-xs text-cordero-espresso opacity-50">{canceledOpen ? "▲ Ocultar" : "▼ Ver"}</span>
          </button>

          {canceledOpen ? (
            <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
              {canceledOrders.map((order) => (
                <OrderCardComponent
                  key={order.id}
                  faded
                  isPending={isPending}
                  onAction={(id, next) => updateStatus(id, next)}
                  onCancel={(id) => updateStatus(id, "cancelado")}
                  onReopen={(id) => updateStatus(id, "pendiente")}
                  order={order}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
