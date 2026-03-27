"use client";

import Link from "next/link";
import { useEffect } from "react";

import { CartCheckout } from "./cart-checkout";
import type { useCart } from "./use-cart";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  cart: ReturnType<typeof useCart>;
};

export function CartDrawer({ isOpen, onClose, cart }: CartDrawerProps) {
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
        <div className="flex items-center justify-between border-b border-cordero px-6 py-4">
          <h2 className="font-heading text-2xl text-cordero-espresso">Tu carrito</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-cordero px-3 py-1 text-xs text-cordero-espresso"
            aria-label="Cerrar carrito"
          >
            Cerrar
          </button>
        </div>

        <div className="px-6 pt-3">
          <Link
            href="/pedido/carrito"
            onClick={onClose}
            className="text-xs text-cordero-espresso underline opacity-60 hover:opacity-90"
          >
            Ver en página completa →
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <CartCheckout cart={cart} onOrderSuccess={onClose} onViewMenu={onClose} />
        </div>
      </div>
    </>
  );
}
