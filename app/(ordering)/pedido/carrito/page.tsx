"use client";

import Link from "next/link";

import { CartCheckout } from "@/components/ordering/cart-checkout";
import { useCart } from "@/components/ordering/use-cart";

export default function CartPage() {
  const cart = useCart();

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-16 sm:px-10">
      <Link
        href="/pedido"
        className="text-sm text-cordero-espresso underline opacity-60 hover:opacity-90"
      >
        ← Seguir comprando
      </Link>

      <h1 className="mt-6 font-heading text-3xl text-cordero-espresso sm:text-4xl">
        Tu carrito
      </h1>
      <p className="mt-2 text-sm text-cordero-espresso opacity-75">
        Revisa tu pedido y confirma cuando estés listo.
      </p>

      <div className="mt-8 rounded-2xl border border-cordero bg-cordero-card p-6">
        <CartCheckout cart={cart} />
      </div>
    </main>
  );
}
