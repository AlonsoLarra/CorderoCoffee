import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartLine } from './types';

const CART_KEY = 'cordero.cart.v1';

export async function loadCart(): Promise<CartLine[]> {
  try {
    const raw = await AsyncStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCart(lines: CartLine[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {
    // ignore
  }
}

export async function clearCart(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CART_KEY);
  } catch {
    // ignore
  }
}
