"use client";

import { useEffect, useMemo, useState } from "react";

import type { SelectedModifier } from "@/lib/types/checkout";

export type CartLine = {
  itemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  modifiers: SelectedModifier[];
};

export const CART_STORAGE_KEY = "cordero.draftCart.v1";

function loadCartLines(): CartLine[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((line) => ({
      ...line,
      modifiers: Array.isArray(line.modifiers) ? line.modifiers : [],
    }));
  } catch {
    return [];
  }
}

function saveCartLines(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(loadCartLines());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveCartLines(lines);
  }, [lines, hydrated]);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [lines],
  );

  const itemCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );

  function addLine(
    item: { id: string; name: string; price: number },
    modifiers: SelectedModifier[] = [],
  ) {
    setLines((current) => {
      if (modifiers.length === 0) {
        const existing = current.find(
          (l) => l.itemId === item.id && l.modifiers.length === 0,
        );
        if (existing) {
          return current.map((l) =>
            l.itemId === item.id && l.modifiers.length === 0
              ? { ...l, quantity: l.quantity + 1 }
              : l,
          );
        }
      }
      return [
        ...current,
        {
          itemId: item.id,
          itemName: item.name,
          unitPrice: item.price,
          quantity: 1,
          modifiers,
        },
      ];
    });
  }

  function updateQuantity(lineIndex: number, nextQuantity: number) {
    setLines((current) => {
      if (nextQuantity <= 0) return current.filter((_, i) => i !== lineIndex);
      return current.map((l, i) =>
        i === lineIndex ? { ...l, quantity: nextQuantity } : l,
      );
    });
  }

  function clearCart() {
    setLines([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  }

  return { lines, total, itemCount, hydrated, addLine, updateQuantity, clearCart };
}
