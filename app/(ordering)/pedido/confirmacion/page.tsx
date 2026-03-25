import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ConfirmationPageProps = {
  searchParams?: {
    orderId?: string;
  };
};

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  menu_items: { name: string } | null;
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

  if (orderId) {
    const supabase = createSupabaseServerClient();
    const { data: rawItems } = await supabase
      .from("order_items")
      .select("id,quantity,unit_price,menu_items(name)")
      .eq("order_id", orderId);

    items = (rawItems ?? []) as unknown as OrderItem[];
  }

  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-8 sm:py-14 sm:px-10">
      <span className="rounded-full border border-cordero bg-cordero-card px-4 py-1 text-xs uppercase tracking-[0.2em] text-cordero-espresso opacity-80">
        Cordero Coffee Club
      </span>

      <h1 className="mt-5 font-heading text-4xl text-cordero-espresso sm:text-5xl">
        Pedido confirmado
      </h1>

      <p className="mt-4 text-cordero-espresso opacity-85">
        Recibimos tu solicitud y el equipo comenzará a prepararla pronto.
      </p>

      <div className="mt-8 rounded-2xl border border-cordero bg-cordero-card p-5">
        <p className="text-xs uppercase tracking-[0.15em] text-cordero-espresso opacity-60">
          Número de pedido
        </p>
        <p className="mt-1 font-mono text-sm text-cordero-espresso opacity-70">
          {orderId ? `#${orderId.slice(0, 8)}` : "No disponible"}
        </p>
      </div>

      {items.length > 0 && (
        <div className="mt-4 rounded-2xl border border-cordero bg-cordero-card p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-cordero-espresso opacity-60">
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
          <div className="mt-3 flex justify-between border-t border-cordero pt-3 text-sm font-medium text-cordero-espresso">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        {orderId ? (
          <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href={`/pedido/estado/${orderId}`}>
            Ver estado del pedido
          </Link>
        ) : null}
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
