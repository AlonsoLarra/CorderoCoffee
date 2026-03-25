import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/lib/colors';
import { COPY } from '@/lib/copy';

export default function ConfirmacionScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        {/* Checkmark */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✓</Text>
        </View>

        <Text style={styles.title}>{COPY.confirmation.title}</Text>
        <Text style={styles.subtitle}>{COPY.confirmation.subtitle}</Text>

        {orderId ? (
          <View style={styles.orderIdBox}>
            <Text style={styles.orderIdLabel}>N° de pedido</Text>
            <Text style={styles.orderIdText} numberOfLines={1}>
              {orderId.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {orderId ? (
            <TouchableOpacity
              style={styles.btnPrimary}
              activeOpacity={0.8}
              onPress={() => router.push(`/pedido/estado/${orderId}`)}
            >
              <Text style={styles.btnPrimaryText}>
                {COPY.confirmation.trackOrder.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.btnSecondary}
            activeOpacity={0.8}
            onPress={() => router.replace('/pedido')}
          >
            <Text style={styles.btnSecondaryText}>
              {COPY.confirmation.newOrder.toUpperCase()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnGhost}
            activeOpacity={0.7}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.btnGhostText}>
              {COPY.actions.backToHome.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: 'rgba(58,105,67,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  icon: {
    fontSize: 32,
    color: COLORS.success,
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: COLORS.espresso,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  orderIdBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  orderIdLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  orderIdText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.espresso,
    letterSpacing: 3,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: COLORS.espresso,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: COLORS.cream,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3.5,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: COLORS.espresso,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3.5,
  },
  btnGhost: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnGhostText: {
    color: COLORS.espresso,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    opacity: 0.5,
  },
});
