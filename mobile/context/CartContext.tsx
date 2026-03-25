import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadCart, saveCart, clearCart } from '@/lib/cart';
import type { CartLine } from '@/lib/types';

interface CartContextValue {
  lines: CartLine[];
  count: number;
  addItem: (itemId: string, itemName: string, unitPrice: number) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue>({
  lines: [],
  count: 0,
  addItem: () => {},
  updateQuantity: () => {},
  clear: async () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    loadCart().then(setLines);
  }, []);

  useEffect(() => {
    saveCart(lines);
  }, [lines]);

  function addItem(itemId: string, itemName: string, unitPrice: number) {
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === itemId);
      if (existing) {
        return prev.map((l) =>
          l.itemId === itemId ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { itemId, itemName, unitPrice, quantity: 1 }];
    });
  }

  function updateQuantity(itemId: string, qty: number) {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.itemId !== itemId)
        : prev.map((l) => (l.itemId === itemId ? { ...l, quantity: qty } : l)),
    );
  }

  async function clear() {
    setLines([]);
    await clearCart();
  }

  const count = lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <CartContext.Provider value={{ lines, count, addItem, updateQuantity, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
