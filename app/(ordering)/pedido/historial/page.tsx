import Link from "next/link";
import { redirect } from "next/navigation";

import { ReorderButton } from "@/components/ordering/reorder-button";
import {
  getEmailVerificationErrorMessage,
  isEmailVerified,
} from "@/lib/supabase/email-verification";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus, PaymentMethod, PickupType } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

type OrderItem = {
  id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  menu_items: { name: string } | null;
};

type OrderWithItems = {
  id: string;
  status: OrderStatus;
  pickup_type: PickupType;
  payment_method: PaymentMethod;
  created_at: string;
  order_items: OrderItem[];
};

const statusLabel: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  preparando: "Preparando",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const activeStatuses = new Set<OrderStatus>(["pendiente", "aceptado", "preparando", "listo"]);

function statusChipClass(status: OrderStatus): string {
  if (status === "entregado") {
    return "bg-[hsl(var(--color-sand)/0.7)] text-[hsl(var(--color-espresso)/0.7)]";
  }
  if (status === "cancelado") {
    return "bg-[hsl(var(--color-terracotta)/0.14)] text-[hsl(var(--color-terracotta-dark))]";
  }
  return "bg-[hsl(var(--color-terracotta)/0.14)] text-[hsl(var(--color-terracotta-dark))]";
}

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

function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function OrderHistoryPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 py-10">
        <h1 className="font-heading text-3xl text-cordero-espresso">Historial de pedidos</h1>
        <p className="mt-4 text-[15px] text-[hsl(var(--color-espresso)/0.7)]">
          Inicia sesión para ver el historial de tus pedidos.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-full border border-[hsl(var(--color-espresso)/0.25)] px-5 py-2 text-sm" href="/acceso">
            Iniciar sesión
          </Link>
          <Link className="rounded-full border border-[hsl(var(--color-espresso)/0.25)] px-5 py-2 text-sm" href="/">
            Ir al inicio
          </Link>
        </div>
      </main>
    );
  }

  if (!isEmailVerified(user)) {
    redirect(`/acceso?error=${encodeURIComponent(getEmailVerificationErrorMessage())}`);
  }

  const [{ data: rawOrders }, { data: profileData }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id,status,pickup_type,payment_method,created_at,order_items(id,item_id,quantity,unit_price,menu_items(name))",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("profiles").select("reward_points").eq("id", user.id).maybeSingle(),
  ]);

  const orders = (rawOrders ?? []) as unknown as OrderWithItems[];
  const rewardPoints = (profileData as unknown as { reward_points: number } | null)?.reward_points ?? 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-8 pb-14 sm:py-10">
      <div className="flex items-center gap-3">
        <Link
          href="/pedido"
          aria-label="Volver"
          className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full border border-[hsl(var(--color-espresso)/0.14)] text-cordero-espresso"
        >
          ‹
        </Link>
        <h1 className="font-heading text-2xl text-cordero-espresso">Mis pedidos</h1>
      </div>

      {/* Rewards card */}
      <div className="mt-5 flex items-center justify-between rounded-[20px] bg-cordero-espresso p-5 text-cordero-cream">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">
            Puntos de recompensa
          </p>
          <p className="mt-1 font-heading text-[26px]">{rewardPoints} pts</p>
        </div>
        <p className="max-w-[9rem] text-right text-xs opacity-70">
          10 pts por producto, al entregarse tu pedido
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-[20px] bg-cordero-card p-6 shadow-cordero-card">
          <p className="text-sm text-[hsl(var(--color-espresso)/0.75)]">
            Aún no tienes pedidos registrados. ¡Haz tu primer pedido!
          </p>
        </div>
      ) : (
        <ol className="mt-6 space-y-4">
          {orders.map((order) => {
            const total = order.order_items.reduce(
              (sum, item) => sum + item.unit_price * item.quantity,
              0,
            );

            const reorderLines = order.order_items.map((item) => ({
              itemId: item.item_id,
              itemName: item.menu_items?.name ?? "Producto",
              unitPrice: item.unit_price,
              quantity: item.quantity,
              modifiers: [] as { modifierName: string; selectedOption: string }[],
            }));

            const isActive = activeStatuses.has(order.status);

            return (
              <li key={order.id} className="rounded-[20px] bg-cordero-card p-5 shadow-cordero-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-cordero-espresso">{formatDate(order.created_at)}</p>
                    <p className="mt-0.5 font-mono-order text-xs text-[hsl(var(--color-espresso)/0.5)]">
                      #{order.id.slice(0, 8)}
                    </p>
                  </div>

                  <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${statusChipClass(order.status)}`}>
                    {statusLabel[order.status]}
                  </span>
                </div>

                <ul className="mt-4 space-y-1.5">
                  {order.order_items.map((item) => (
                    <li key={item.id} className="flex justify-between text-sm text-cordero-espresso">
                      <span>
                        {item.quantity}× {item.menu_items?.name ?? "Producto eliminado"}
                      </span>
                      <span className="opacity-70">{formatPrice(item.unit_price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--color-espresso)/0.1)] pt-3">
                  <div className="flex gap-3 text-sm font-semibold text-cordero-espresso">
                    <span>{formatPrice(total)}</span>
                    <span className="font-normal text-[hsl(var(--color-espresso)/0.6)]">
                      {pickupLabel[order.pickup_type]} · {paymentLabel[order.payment_method]}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {isActive ? (
                      <Link
                        className="btn-press rounded-full border border-[hsl(var(--color-espresso)/0.25)] px-3 py-1.5 text-xs font-semibold text-cordero-espresso"
                        href={`/pedido/estado/${order.id}`}
                      >
                        Ver estado
                      </Link>
                    ) : order.order_items.length > 0 ? (
                      <ReorderButton lines={reorderLines} />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="rounded-full border border-[hsl(var(--color-espresso)/0.25)] px-5 py-2 text-sm" href="/pedido">
          Hacer pedido
        </Link>
        <Link className="rounded-full border border-[hsl(var(--color-espresso)/0.25)] px-5 py-2 text-sm" href="/">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
