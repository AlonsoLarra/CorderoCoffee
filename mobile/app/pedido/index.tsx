import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/lib/colors';
import { COPY } from '@/lib/copy';
import { supabase, formatPrice } from '@/lib/supabase';
import { loadCart, saveCart, clearCart } from '@/lib/cart';
import type { MenuCategory, CartLine, PickupType, PaymentMethod } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import CartSheet from '@/components/ordering/CartSheet';

export default function PedidoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [cartVisible, setCartVisible] = useState(false);

  // Load menu
  useEffect(() => {
    async function fetchMenu() {
      try {
        const { data: cats, error: catsError } = await supabase
          .from('menu_categories')
          .select('id, name, sort_order')
          .eq('is_active', true)
          .order('sort_order');

        if (catsError) throw catsError;
        if (!cats || cats.length === 0) {
          setCategories([]);
          setLoadingMenu(false);
          return;
        }

        const { data: items, error: itemsError } = await supabase
          .from('menu_items')
          .select('id, name, description, price, image_url, category_id')
          .eq('is_active', true)
          .order('sort_order');

        if (itemsError) throw itemsError;

        const built: MenuCategory[] = cats.map((cat) => ({
          id: cat.id,
          name: cat.name,
          sort_order: cat.sort_order,
          items: (items ?? [])
            .filter((item) => item.category_id === cat.id)
            .map((item) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              price: item.price,
              image_url: item.image_url,
            })),
        }));

        setCategories(built);
        if (built.length > 0) setSelectedCategory(built[0].id);
      } catch (err) {
        console.error(err);
        setMenuError('No pudimos cargar el menú. Revisa tu conexión e intenta de nuevo.');
      } finally {
        setLoadingMenu(false);
      }
    }

    fetchMenu();
  }, []);

  // Load cart from storage
  useEffect(() => {
    loadCart().then(setCartLines);
  }, []);

  // Persist cart on changes
  useEffect(() => {
    saveCart(cartLines);
  }, [cartLines]);

  function addItem(itemId: string, itemName: string, unitPrice: number) {
    setCartLines((prev) => {
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
    setCartLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.itemId !== itemId)
        : prev.map((l) => (l.itemId === itemId ? { ...l, quantity: qty } : l)),
    );
  }

  const cartCount = cartLines.reduce((s, l) => s + l.quantity, 0);

  async function submitOrder(
    pickupType: PickupType,
    paymentMethod: PaymentMethod,
    notes: string,
    scheduledPickupAt?: string,
  ) {
    if (cartLines.length === 0) return;

    const payload = {
      lines: cartLines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
      pickupType,
      paymentMethod,
      notes,
      ...(pickupType === 'agendar' && scheduledPickupAt ? { scheduledPickupAt } : {}),
    };

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

    const res = await fetch(`${supabaseUrl.replace('/rest/v1', '')}/functions/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: `Bearer ${anonKey}` }),
      },
      body: JSON.stringify(payload),
    });

    // Fallback: call web API if available
    if (!res.ok) {
      throw new Error('No pudimos crear tu pedido. Verifica la configuración de Supabase.');
    }

    const body = (await res.json()) as { orderId: string };
    await clearCart();
    setCartLines([]);
    setCartVisible(false);
    showToast('Pedido creado correctamente.', 'success');
    router.push(`/pedido/confirmacion?orderId=${encodeURIComponent(body.orderId)}`);
  }

  const activeCategory = categories.find((c) => c.id === selectedCategory);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* User badge */}
      <View style={styles.userBadge}>
        <Text style={styles.userBadgeText}>
          {user ? `Modo cliente: ${user.email}` : COPY.ordering.guestMode}
        </Text>
      </View>

      {loadingMenu ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.espresso} />
          <Text style={styles.loadingText}>Cargando menú...</Text>
        </View>
      ) : menuError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{menuError}</Text>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            Menú sin productos activos. Ejecuta el seed inicial o activa items en admin.
          </Text>
        </View>
      ) : (
        <>
          {/* Category tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabs}
            contentContainerStyle={styles.tabsContent}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.tab,
                  selectedCategory === cat.id && styles.tabActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedCategory === cat.id && styles.tabTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Items */}
          <FlatList
            data={activeCategory?.items ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.itemList}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  ) : null}
                </View>
                <View style={styles.itemActions}>
                  <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => addItem(item.id, item.name, item.price)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addBtnText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />

          {/* Footer links */}
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push('/pedido/historial')}>
              <Text style={styles.footerLink}>{COPY.ordering.historialLink}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Floating cart button */}
      {cartCount > 0 && (
        <TouchableOpacity
          style={styles.cartFab}
          onPress={() => setCartVisible(true)}
          activeOpacity={0.9}
        >
          <Text style={styles.cartFabText}>
            {COPY.ordering.cartTitle} · {cartCount}{' '}
            {cartCount === 1 ? 'producto' : 'productos'}
          </Text>
          <Text style={styles.cartFabArrow}>↑</Text>
        </TouchableOpacity>
      )}

      {/* Cart sheet */}
      <CartSheet
        visible={cartVisible}
        lines={cartLines}
        onClose={() => setCartVisible(false)}
        onUpdateQuantity={updateQuantity}
        onSubmit={submitOrder}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  userBadge: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userBadgeText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  tabs: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexGrow: 0,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: COLORS.espresso,
    borderColor: COLORS.espresso,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: COLORS.cream,
  },
  itemList: {
    padding: 16,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.espresso,
  },
  itemDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 18,
  },
  itemActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.espresso,
  },
  addBtn: {
    backgroundColor: COLORS.espresso,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.cream,
    letterSpacing: 0.5,
  },
  footerLinks: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    gap: 20,
  },
  footerLink: {
    fontSize: 13,
    color: COLORS.espresso,
    textDecorationLine: 'underline',
  },
  cartFab: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: COLORS.espresso,
    borderRadius: 4,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  cartFabText: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cartFabArrow: {
    color: COLORS.cream,
    fontSize: 16,
  },
});
