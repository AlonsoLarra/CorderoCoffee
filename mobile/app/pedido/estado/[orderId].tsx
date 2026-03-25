import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/lib/colors';
import { COPY } from '@/lib/copy';
import { supabase, formatPrice } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/lib/types';

const STATUS_STEPS: OrderStatus[] = [
  'pendiente',
  'aceptado',
  'preparando',
  'listo',
  'entregado',
];

const STATUS_ICONS: Record<OrderStatus, string> = {
  pendiente: '⏳',
  aceptado: '✅',
  preparando: '☕',
  listo: '🔔',
  entregado: '✓',
  cancelado: '✗',
};

export default function EstadoScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
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
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;
      setOrder({
        ...data,
        items: data.order_items ?? [],
      } as Order);
    } catch (err) {
      console.error(err);
      setError('No pudimos cargar el estado del pedido.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();

    // Realtime subscription
    if (!orderId) return;

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((prev) =>
            prev ? { ...prev, status: payload.new.status as OrderStatus } : prev,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, fetchOrder]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.espresso} />
          <Text style={styles.loadingText}>Cargando pedido...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Pedido no encontrado.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchOrder}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status hero */}
        <View style={styles.statusHero}>
          <Text style={styles.statusIcon}>{STATUS_ICONS[order.status]}</Text>
          <Text style={styles.statusLabel}>
            {COPY.status[order.status]}
          </Text>
          <Text style={styles.statusId}>
            Pedido #{order.id.slice(0, 8).toUpperCase()}
          </Text>
        </View>

        {/* Progress steps */}
        <View style={styles.stepsContainer}>
          {STATUS_STEPS.map((step, index) => {
            const done = index <= currentStep;
            const active = index === currentStep;
            return (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepIndicatorCol}>
                  <View
                    style={[
                      styles.stepDot,
                      done && styles.stepDotDone,
                      active && styles.stepDotActive,
                    ]}
                  >
                    {done ? (
                      <Text style={styles.stepDotCheck}>✓</Text>
                    ) : null}
                  </View>
                  {index < STATUS_STEPS.length - 1 ? (
                    <View
                      style={[styles.stepLine, done && styles.stepLineDone]}
                    />
                  ) : null}
                </View>
                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepText,
                      done && styles.stepTextDone,
                      active && styles.stepTextActive,
                    ]}
                  >
                    {COPY.status[step]}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Order details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Detalle del pedido</Text>

          {(order.items ?? []).map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}×</Text>
              <Text style={styles.itemName}>{item.item_name}</Text>
              <Text style={styles.itemPrice}>
                {formatPrice(item.unit_price * item.quantity)}
              </Text>
            </View>
          ))}

          <View style={styles.detailDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total_amount)}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Retiro</Text>
            <Text style={styles.metaValue}>{COPY.pickup[order.pickup_type]}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Pago</Text>
            <Text style={styles.metaValue}>{COPY.payment[order.payment_method]}</Text>
          </View>
          {order.notes ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Notas</Text>
              <Text style={styles.metaValue}>{order.notes}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/pedido')}
        >
          <Text style={styles.backBtnText}>Hacer otro pedido</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: { marginTop: 12, color: COLORS.textMuted, fontSize: 14 },
  errorText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  retryBtn: { marginTop: 16, padding: 12 },
  retryText: { color: COLORS.espresso, textDecorationLine: 'underline', fontSize: 14 },
  content: { padding: 20, paddingBottom: 40 },
  statusHero: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  statusIcon: { fontSize: 40, marginBottom: 12 },
  statusLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.espresso,
    marginBottom: 6,
  },
  statusId: { fontSize: 12, color: COLORS.textMuted, letterSpacing: 2 },
  stepsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 48,
  },
  stepIndicatorCol: {
    width: 32,
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: COLORS.espresso,
    borderColor: COLORS.espresso,
  },
  stepDotActive: {
    borderColor: COLORS.espresso,
    backgroundColor: COLORS.cream,
  },
  stepDotCheck: { color: COLORS.cream, fontSize: 10, fontWeight: '700' },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.border,
    marginTop: 2,
  },
  stepLineDone: { backgroundColor: COLORS.espresso },
  stepContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  stepTextDone: { color: COLORS.espresso },
  stepTextActive: { fontWeight: '700', color: COLORS.espresso },
  detailsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.espresso,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  itemQty: { fontSize: 13, color: COLORS.textMuted, width: 28 },
  itemName: { flex: 1, fontSize: 14, color: COLORS.espresso },
  itemPrice: { fontSize: 13, color: COLORS.espresso, fontWeight: '500' },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalLabel: { fontSize: 14, fontWeight: '600', color: COLORS.espresso },
  totalValue: { fontSize: 14, fontWeight: '700', color: COLORS.espresso },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metaLabel: { fontSize: 12, color: COLORS.textMuted },
  metaValue: { fontSize: 12, color: COLORS.espresso, fontWeight: '500' },
  backBtn: {
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.5,
    color: COLORS.espresso,
    textTransform: 'uppercase',
  },
});
