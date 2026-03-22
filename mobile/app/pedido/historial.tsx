import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/lib/colors';
import { COPY } from '@/lib/copy';
import { supabase, formatPrice } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Order } from '@/lib/types';

export default function HistorialScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchHistory() {
      try {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select(`
            id,
            status,
            order_type,
            pickup_type,
            payment_method,
            notes,
            total_amount,
            created_at,
            order_items (
              id,
              item_name,
              quantity,
              unit_price
            )
          `)
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(30);

        if (fetchError) throw fetchError;
        setOrders(
          (data ?? []).map((o) => ({ ...o, items: o.order_items ?? [] })) as Order[],
        );
      } catch (err) {
        console.error(err);
        setError('No pudimos cargar tu historial. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [user]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            Inicia sesión para ver tu historial de pedidos.
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/acceso')}
          >
            <Text style={styles.loginBtnText}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.espresso} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{COPY.historial.empty}</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.replace('/pedido')}
          >
            <Text style={styles.loginBtnText}>Hacer pedido</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.orderCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/pedido/estado/${item.id}`)}
          >
            {/* Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>
                #{item.id.slice(0, 8).toUpperCase()}
              </Text>
              <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                <Text style={[styles.statusBadgeText, getStatusTextStyle(item.status)]}>
                  {COPY.status[item.status]}
                </Text>
              </View>
            </View>

            {/* Items preview */}
            <View style={styles.itemsPreview}>
              {(item.items ?? []).slice(0, 3).map((oi) => (
                <Text key={oi.id} style={styles.itemPreviewText} numberOfLines={1}>
                  {oi.quantity}× {oi.item_name}
                </Text>
              ))}
              {(item.items ?? []).length > 3 ? (
                <Text style={styles.itemPreviewMore}>
                  +{(item.items ?? []).length - 3} más
                </Text>
              ) : null}
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
              <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
              <Text style={styles.cardTotal}>{formatPrice(item.total_amount)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function getStatusStyle(status: Order['status']) {
  switch (status) {
    case 'listo': return { backgroundColor: COLORS.successBg, borderColor: 'rgba(58,105,67,0.2)' };
    case 'entregado': return { backgroundColor: COLORS.card, borderColor: COLORS.border };
    case 'preparando': return { backgroundColor: COLORS.warningBg, borderColor: 'rgba(139,105,20,0.2)' };
    default: return { backgroundColor: COLORS.card, borderColor: COLORS.border };
  }
}

function getStatusTextStyle(status: Order['status']) {
  switch (status) {
    case 'listo': return { color: COLORS.success };
    case 'preparando': return { color: COLORS.warning };
    default: return { color: COLORS.espresso };
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  loginBtn: {
    marginTop: 20,
    backgroundColor: COLORS.espresso,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  loginBtnText: {
    color: COLORS.cream,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  list: { padding: 16 },
  orderCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.espresso,
    letterSpacing: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemsPreview: {
    marginBottom: 12,
    gap: 2,
  },
  itemPreviewText: {
    fontSize: 13,
    color: COLORS.espresso,
    lineHeight: 20,
  },
  itemPreviewMore: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    marginTop: 4,
  },
  cardDate: { fontSize: 12, color: COLORS.textMuted },
  cardTotal: { fontSize: 13, fontWeight: '600', color: COLORS.espresso },
});
