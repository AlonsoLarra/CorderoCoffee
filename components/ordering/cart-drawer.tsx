"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CartCheckout } from "./cart-checkout";
import type { useCart } from "./use-cart";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  cart: ReturnType<typeof useCart>;
};

export function CartDrawer({ isOpen, onClose, cart }: CartDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Carrito"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cordero-cream shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[hsl(var(--color-espresso)/0.1)] px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar carrito"
              className="btn-press flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--color-espresso)/0.14)] text-cordero-espresso"
            >
              ‹
            </button>
            <h2 className="font-heading text-2xl text-cordero-espresso">Tu carrito</h2>
          </div>
          <Link
            href="/pedido/carrito"
            onClick={onClose}
            className="text-xs text-[hsl(var(--color-espresso)/0.6)] underline"
          >
            Página completa
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <CartCheckout cart={cart} onOrderSuccess={onClose} onViewMenu={onClose} />
        </div>
      </div>
    </>
  );
}
