"use client";

import Link from "next/link";

import { CartCheckout } from "@/components/ordering/cart-checkout";
import { useCart } from "@/components/ordering/use-cart";

export default function CartPage() {
  const cart = useCart();

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-6 pb-16 sm:py-10">
      <div className="flex items-center gap-3">
        <Link
          href="/pedido"
          aria-label="Seguir comprando"
          className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full border border-[hsl(var(--color-espresso)/0.14)] text-cordero-espresso"
        >
          ‹
        </Link>
        <h1 className="font-heading text-2xl text-cordero-espresso">Tu carrito</h1>
      </div>

      <div className="mt-6">
        <CartCheckout cart={cart} />
      </div>
    </main>
  );
}
