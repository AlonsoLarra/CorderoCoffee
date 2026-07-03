"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast-provider";
import type { SelectedModifier } from "@/lib/types/checkout";
import type { OrderStatus, PaymentMethod, PickupType } from "@/lib/types/domain";

export type AdminOrderCard = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  pickupType: PickupType;
  paymentMethod: PaymentMethod;
  pickupTime: string | null;
  notes: string | null;
  items: { quantity: number; name: string; modifiers: SelectedModifier[]; unitPrice: number }[];
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

const columnConfig: { status: OrderStatus; label: string; dotClass: string }[] = [
  { status: "pendiente", label: "Pendiente", dotClass: "bg-[hsl(var(--color-terracotta))]" },
  { status: "aceptado", label: "Aceptado", dotClass: "bg-[hsl(var(--color-espresso)/0.4)]" },
  { status: "preparando", label: "Preparando", dotClass: "bg-[hsl(var(--color-terracotta))]" },
  { status: "listo", label: "Listo", dotClass: "bg-[var(--color-success)]" },
  { status: "entregado", label: "Entregado", dotClass: "ring-1 ring-inset ring-[hsl(var(--color-espresso)/0.4)]" },
];

function minutesSince(dateIso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateIso).getTime()) / 60000));
}

type TimeChip = { label: string; className: string; urgentBorder: boolean };

function timeChip(minutes: number, status: OrderStatus): TimeChip | null {
  if (status === "entregado" || status === "cancelado") return null;
  if (status === "listo") {
    return {
      label: `Listo · ${minutes} min`,
      className: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
      urgentBorder: false,
    };
  }
  if (minutes >= 15) {
    return {
      label: `${minutes} min · urgente`,
      className: "bg-[hsl(var(--color-terracotta))] text-cordero-cream",
      urgentBorder: true,
    };
  }
  if (minutes >= 8) {
    return {
      label: `${minutes} min`,
      className: "bg-[hsl(var(--color-terracotta)/0.14)] text-[hsl(var(--color-terracotta-dark))]",
      urgentBorder: false,
    };
  }
  return {
    label: `${minutes} min`,
    className: "bg-[hsl(var(--color-sand)/0.7)] text-[hsl(var(--color-espresso)/0.65)]",
    urgentBorder: false,
  };
}

function formatTime(dateIso: string): string {
  // Pin the timezone so the server (UTC) and client (local) render the SAME
  // string — otherwise the timestamp differs between SSR and hydration and
  // triggers a hydration mismatch.
  return new Intl.DateTimeFormat("es-MX", { timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(dateIso));
}

type OrderCardProps = {
  order: AdminOrderCard;
  faded?: boolean;
  onAction: (orderId: string, nextStatus: OrderStatus) => void;
  onCancel: (orderId: string) => void;
  onReopen: (orderId: string) => void;
  isPending: boolean;
  dragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

function OrderCardComponent({ order, faded, onAction, onCancel, onReopen, isPending, dragging, onDragStart, onDragEnd }: OrderCardProps) {
  // Elapsed-time is clock-relative, so it differs between the SSR render and the
  // client hydration. Rendering it during SSR caused a hydration mismatch that
  // broke React on the admin board and stopped router.refresh() from repainting
  // the kanban after a status change. Compute it only after mount on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const elapsedMinutes = minutesSince(order.createdAt);
  const chip = mounted ? timeChip(elapsedMinutes, order.status) : null;
  const actionLabel = nextTransitionLabel[order.status];
  const nextStatus = nextTransitionStatus[order.status];

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", order.id);
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      className={`rounded-2xl border bg-cordero-card p-4 shadow-cordero-card transition-opacity ${
        chip?.urgentBorder ? "border-[hsl(var(--color-terracotta)/0.5)]" : "border-[hsl(var(--color-espresso)/0.08)]"
      } ${dragging ? "opacity-40 cursor-grabbing" : "cursor-grab"} ${faded && !dragging ? "opacity-65" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono-order text-[13px] font-semibold text-cordero-espresso">
          #{order.id.slice(0, 8)}
        </span>
        {chip ? (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.className}`}>{chip.label}</span>
        ) : null}
      </div>

      {order.items.length > 0 ? (
        <ul className="mt-2.5 space-y-1">
          {order.items.map((item, i) => (
            <li key={i} className="text-[14px] font-medium text-cordero-espresso">
              <span className="text-[hsl(var(--color-espresso)/0.55)]">{item.quantity}×</span> {item.name}
              {item.modifiers.length > 0 ? (
                <span className="text-[hsl(var(--color-espresso)/0.55)]">
                  {" "}
                  · {item.modifiers.map((m) => m.selectedOption).join(", ")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-2 text-[12px] text-[hsl(var(--color-espresso)/0.55)]">
        {pickupLabel[order.pickupType]} · {paymentLabel[order.paymentMethod]} · {formatTime(order.createdAt)}
      </p>
      {order.pickupTime ? (
        <p className="text-[12px] text-[hsl(var(--color-espresso)/0.55)]">Retiro: {formatTime(order.pickupTime)}</p>
      ) : null}

      {order.notes ? (
        <p className="mt-2 rounded-lg border border-[hsl(var(--color-espresso)/0.1)] px-2 py-1 text-xs text-cordero-espresso">
          {order.notes}
        </p>
      ) : null}

      {!faded && order.status !== "cancelado" ? (
        <div className="mt-3 flex items-center gap-2">
          {actionLabel && nextStatus ? (
            <button
              className="btn-press flex-1 rounded-full bg-cordero-espresso px-3 py-2 text-xs font-semibold text-cordero-cream disabled:opacity-50"
              disabled={isPending}
              onClick={() => onAction(order.id, nextStatus)}
              type="button"
            >
              {actionLabel}
            </button>
          ) : null}
          <button
            className="btn-press flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[hsl(var(--color-terracotta)/0.4)] text-xs text-[hsl(var(--color-terracotta-dark))] disabled:opacity-50"
            disabled={isPending}
            onClick={() => onCancel(order.id)}
            type="button"
            aria-label="Cancelar"
          >
            ✕
          </button>
        </div>
      ) : null}

      {order.status === "cancelado" ? (
        <div className="mt-3">
          <button
            className="btn-press rounded-full border border-[hsl(var(--color-espresso)/0.25)] px-3 py-1 text-xs disabled:opacity-50"
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

const allowedDropTransitions: Record<OrderStatus, OrderStatus[]> = {
  pendiente: ["aceptado", "cancelado"],
  aceptado: ["preparando", "cancelado"],
  preparando: ["listo", "cancelado"],
  listo: ["entregado", "cancelado"],
  entregado: [],
  cancelado: ["pendiente"],
};

const ENTREGADO_PAGE_SIZE = 5;

export function OrderQueue({ orders }: OrderQueueProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canceledOpen, setCanceledOpen] = useState<boolean>(false);
  const [entregadoExpanded, setEntregadoExpanded] = useState(false);
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<OrderStatus | null>(null);

  const canDrop = useCallback(
    (orderId: string, targetStatus: OrderStatus): boolean => {
      const order = orders.find((o) => o.id === orderId);
      if (!order || order.status === targetStatus) return false;
      return allowedDropTransitions[order.status]?.includes(targetStatus) ?? false;
    },
    [orders],
  );

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
      const body = await response.json().catch(() => null);
      const msg = (body as { error?: string } | null)?.error ?? "No pudimos actualizar el estado del pedido.";
      showToast(msg, "error");
      return;
    }

    showToast("Estado actualizado.", "success");
    startTransition(() => router.refresh());
  }

  const canceledOrders = orders.filter((o) => o.status === "cancelado");
  const activeOrders = orders.filter((o) => o.status !== "cancelado");

  return (
    <div className="mt-4 space-y-4">
      {/* Kanban columns */}
      <div className="overflow-x-auto pb-2">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(5, minmax(210px, 1fr))" }}>
          {columnConfig.map(({ status, label, dotClass }) => {
            let columnOrders = activeOrders.filter((o) => o.status === status);
            const faded = status === "entregado";
            const isEntregado = status === "entregado";
            const totalInColumn = columnOrders.length;

            if (isEntregado && !entregadoExpanded) {
              columnOrders = columnOrders.slice(0, ENTREGADO_PAGE_SIZE);
            }

            const isDropTarget = dragOverStatus === status && draggingOrderId !== null && canDrop(draggingOrderId, status);

            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggingOrderId && canDrop(draggingOrderId, status)) {
                    e.dataTransfer.dropEffect = "move";
                    setDragOverStatus(status);
                  } else {
                    e.dataTransfer.dropEffect = "none";
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverStatus(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStatus(null);
                  if (!draggingOrderId || !canDrop(draggingOrderId, status)) return;
                  void updateStatus(draggingOrderId, status);
                  setDraggingOrderId(null);
                }}
                className={`flex min-w-[210px] flex-col rounded-2xl p-3 transition-colors ${
                  isDropTarget ? "bg-[hsl(var(--color-espresso)/0.06)] ring-2 ring-[hsl(var(--color-espresso)/0.3)]" : ""
                }`}
              >
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={`h-[9px] w-[9px] flex-shrink-0 rounded-full ${dotClass}`} />
                  <h3 className="flex-1 text-[13px] font-semibold uppercase tracking-[0.04em] text-cordero-espresso">
                    {label}
                  </h3>
                  <span className="rounded-full bg-[hsl(var(--color-espresso)/0.08)] px-2 py-0.5 text-xs text-cordero-espresso">
                    {totalInColumn}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {columnOrders.length === 0 ? (
                    <p
                      className={`py-4 text-center text-xs text-cordero-espresso transition-opacity ${
                        isDropTarget ? "opacity-60" : "opacity-40"
                      }`}
                    >
                      {isDropTarget ? "Soltar aquí" : "—"}
                    </p>
                  ) : (
                    columnOrders.map((order) => (
                      <OrderCardComponent
                        key={order.id}
                        dragging={draggingOrderId === order.id}
                        faded={faded}
                        isPending={isPending}
                        onAction={(id, next) => updateStatus(id, next)}
                        onCancel={(id) => updateStatus(id, "cancelado")}
                        onDragEnd={() => {
                          setDraggingOrderId(null);
                          setDragOverStatus(null);
                        }}
                        onDragStart={() => setDraggingOrderId(order.id)}
                        onReopen={(id) => updateStatus(id, "pendiente")}
                        order={order}
                      />
                    ))
                  )}
                  {isEntregado && totalInColumn > ENTREGADO_PAGE_SIZE ? (
                    <button
                      type="button"
                      onClick={() => setEntregadoExpanded((v) => !v)}
                      className="text-center text-xs text-[hsl(var(--color-espresso)/0.6)] underline"
                    >
                      {entregadoExpanded ? "Ver menos" : `Ver los ${totalInColumn} entregados`}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsed canceled section */}
      {canceledOrders.length > 0 ? (
        <div className="rounded-2xl bg-[hsl(var(--color-espresso)/0.04)]">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setCanceledOpen((prev) => !prev)}
            type="button"
          >
            <span className="text-sm font-semibold text-[hsl(var(--color-espresso)/0.7)]">
              Cancelados ({canceledOrders.length})
            </span>
            <span className="text-xs text-[hsl(var(--color-espresso)/0.5)]">{canceledOpen ? "▲ Ocultar" : "▼ Ver"}</span>
          </button>

          {canceledOpen ? (
            <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
              {canceledOrders.map((order) => (
                <OrderCardComponent
                  key={order.id}
                  dragging={draggingOrderId === order.id}
                  faded
                  isPending={isPending}
                  onAction={(id, next) => updateStatus(id, next)}
                  onCancel={(id) => updateStatus(id, "cancelado")}
                  onDragEnd={() => {
                    setDraggingOrderId(null);
                    setDragOverStatus(null);
                  }}
                  onDragStart={() => setDraggingOrderId(order.id)}
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
