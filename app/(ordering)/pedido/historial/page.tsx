import Link from "next/link";

import { ReorderButton } from "@/components/ordering/reorder-button";
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

const statusColor: Record<OrderStatus, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  aceptado: "bg-blue-100 text-blue-800",
  preparando: "bg-orange-100 text-orange-800",
  listo: "bg-green-100 text-green-800",
  entregado: "bg-cordero-card text-cordero-espresso",
  cancelado: "bg-red-100 text-red-800",
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
      <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-8 sm:py-14 sm:px-10">
        <h1 className="font-heading text-4xl text-cordero-espresso">Historial de pedidos</h1>
        <p className="mt-4 text-cordero-espresso opacity-80">
          Inicia sesión para ver el historial de tus pedidos.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href="/acceso">
            Iniciar sesión
          </Link>
          <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href="/">
            Ir al inicio
          </Link>
        </div>
      </main>
    );
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
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-16 sm:px-10">
      <span className="rounded-full border border-cordero bg-cordero-card px-4 py-1 text-xs uppercase tracking-[0.2em] text-cordero-espresso opacity-80">
        Tu cuenta
      </span>

      <h1 className="mt-5 font-heading text-4xl text-cordero-espresso">Historial de pedidos</h1>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-cordero-espresso opacity-80">Tus últimos 20 pedidos.</p>
        <span className="rounded-full border border-cordero bg-cordero-card px-3 py-0.5 text-xs text-cordero-espresso">
          {rewardPoints} puntos acumulados
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-cordero bg-cordero-card p-6">
          <p className="text-sm text-cordero-espresso opacity-75">
            Aún no tienes pedidos registrados. ¡Haz tu primer pedido!
          </p>
        </div>
      ) : (
        <ol className="mt-8 space-y-4">
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

            return (
              <li
                key={order.id}
                className="rounded-2xl border border-cordero bg-cordero-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-cordero-espresso opacity-60">
                      {formatDate(order.created_at)}
                    </p>
                    <p className="mt-1 font-mono text-xs text-cordero-espresso opacity-50">
                      #{order.id.slice(0, 8)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-medium ${statusColor[order.status]}`}
                  >
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

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cordero pt-3">
                  <div className="flex gap-4 text-xs text-cordero-espresso opacity-70">
                    <span>{pickupLabel[order.pickup_type]}</span>
                    <span>{paymentLabel[order.payment_method]}</span>
                    <span className="font-medium opacity-100">{formatPrice(total)}</span>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      className="rounded-full border border-cordero px-3 py-1 text-xs text-cordero-espresso"
                      href={`/pedido/estado/${order.id}`}
                    >
                      Ver estado
                    </Link>
                    {order.order_items.length > 0 && (
                      <ReorderButton lines={reorderLines} />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-10 flex flex-wrap gap-4">
        <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href="/pedido">
          Hacer pedido
        </Link>
        <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href="/">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
