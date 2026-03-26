"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast-provider";

type Item = {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
};

type WalkinOrderFormProps = {
  items: Item[];
};

export function WalkinOrderForm({ items }: WalkinOrderFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card_pending">("cash");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const activeItems = useMemo(() => items.filter((item) => item.is_active), [items]);

  const total = useMemo(() => {
    return activeItems.reduce((sum, item) => sum + (quantities[item.id] ?? 0) * Number(item.price), 0);
  }, [activeItems, quantities]);

  function changeQuantity(itemId: string, delta: number) {
    setQuantities((current) => {
      const next = Math.max(0, (current[itemId] ?? 0) + delta);
      return { ...current, [itemId]: next };
    });
  }

  async function createWalkinOrder() {
    if (isPending) {
      return;
    }

    const lines = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }));

    if (lines.length === 0) {
      const warning = "Agrega al menos un producto para crear el pedido walk-in.";
      setMessage(warning);
      showToast(warning, "error");
      return;
    }

    const response = await fetch("/api/admin/orders/walkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines,
        paymentMethod,
        notes,
      }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const errorMessage = body.error ?? "No pudimos crear el pedido walk-in.";
      setMessage(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    const body = (await response.json()) as { orderId: string | null; offline?: boolean };
    if (body.offline) {
      setMessage("Sin conexión: pedido guardado localmente, se sincronizará al reconectar.");
      showToast("Pedido guardado sin conexión.", "success");
    } else {
      setMessage(`Pedido walk-in creado: ${body.orderId}`);
      showToast("Pedido walk-in creado y enviado a cola.", "success");
    }
    setQuantities({});
    setNotes("");

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <section className="mt-10 rounded-2xl border border-cordero bg-cordero-card p-5">
      <h3 className="font-heading text-2xl">Alta manual walk-in</h3>
      <p className="mt-2 text-sm opacity-80">Crea pedidos de mostrador para ingresarlos a la misma cola operativa.</p>

      <ul className="mt-4 space-y-2">
        {activeItems.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-xl border border-cordero px-3 py-2 text-sm">
            <span>
              {item.name} - ${item.price}
            </span>
            <div className="flex items-center gap-2">
              <button aria-label={`Quitar una unidad de ${item.name}`} className="rounded-full border border-cordero px-2" onClick={() => changeQuantity(item.id, -1)} type="button">
                -
              </button>
              <span aria-live="polite">{quantities[item.id] ?? 0}</span>
              <button aria-label={`Agregar una unidad de ${item.name}`} className="rounded-full border border-cordero px-2" onClick={() => changeQuantity(item.id, 1)} type="button">
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select
          className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
          onChange={(event) => setPaymentMethod(event.target.value as "cash" | "card_pending")}
          value={paymentMethod}
        >
          <option value="cash">Efectivo</option>
          <option value="card_pending">Tarjeta al retirar</option>
        </select>
        <input
          className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notas"
          value={notes}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-medium">Total estimado: ${total}</span>
        <button
          className="rounded-full bg-cordero-espresso px-4 py-2 text-xs text-cordero-cream disabled:opacity-50"
          disabled={isPending}
          onClick={createWalkinOrder}
          type="button"
        >
          {isPending ? "Creando..." : "Crear pedido walk-in"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm">{message}</p> : null}
    </section>
  );
}
