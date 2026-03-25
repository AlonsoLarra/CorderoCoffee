import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { COLORS } from '@/lib/colors';
import { COPY } from '@/lib/copy';
import { formatPrice } from '@/lib/supabase';
import type { CartLine, PickupType, PaymentMethod } from '@/lib/types';
import { useToast } from '@/components/ui/ToastProvider';

interface CartSheetProps {
  visible: boolean;
  lines: CartLine[];
  onClose: () => void;
  onUpdateQuantity: (itemId: string, qty: number) => void;
  onSubmit: (
    pickupType: PickupType,
    paymentMethod: PaymentMethod,
    notes: string,
    scheduledPickupAt?: string,
  ) => Promise<void>;
}

export default function CartSheet({
  visible,
  lines,
  onClose,
  onUpdateQuantity,
  onSubmit,
}: CartSheetProps) {
  const { showToast } = useToast();
  const [pickupType, setPickupType] = useState<PickupType>('ahora');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  async function handleSubmit() {
    if (lines.length === 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(pickupType, paymentMethod, notes, scheduledDate || undefined);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'No pudimos crear tu pedido. Intenta de nuevo.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <KeyboardAvoidingView
          style={styles.sheetWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{COPY.ordering.cartTitle}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
              {/* Cart lines */}
              {lines.length === 0 ? (
                <Text style={styles.emptyText}>{COPY.ordering.cartEmpty}</Text>
              ) : (
                lines.map((line) => (
                  <View key={line.itemId} style={styles.lineRow}>
                    <Text style={styles.lineName} numberOfLines={1}>
                      {line.itemName}
                    </Text>
                    <View style={styles.lineRight}>
                      <View style={styles.qtyControl}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => onUpdateQuantity(line.itemId, line.quantity - 1)}
                        >
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{line.quantity}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => onUpdateQuantity(line.itemId, line.quantity + 1)}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.linePrice}>
                        {formatPrice(line.unitPrice * line.quantity)}
                      </Text>
                    </View>
                  </View>
                ))
              )}

              {lines.length > 0 && (
                <View style={styles.checkoutSection}>
                  {/* Pickup type */}
                  <Text style={styles.fieldLabel}>{COPY.ordering.pickupLabel}</Text>
                  <View style={styles.segmented}>
                    {(['ahora', 'al_llegar', 'agendar'] as PickupType[]).map((pt) => (
                      <TouchableOpacity
                        key={pt}
                        style={[
                          styles.segmentBtn,
                          pickupType === pt && styles.segmentBtnActive,
                        ]}
                        onPress={() => setPickupType(pt)}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            pickupType === pt && styles.segmentTextActive,
                          ]}
                        >
                          {COPY.pickup[pt]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {pickupType === 'agendar' ? (
                    <>
                      <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                        Fecha y hora
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD HH:MM"
                        placeholderTextColor={COLORS.textMuted}
                        value={scheduledDate}
                        onChangeText={setScheduledDate}
                        color={COLORS.espresso}
                      />
                    </>
                  ) : null}

                  {/* Payment */}
                  <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                    {COPY.ordering.paymentLabel}
                  </Text>
                  <View style={styles.segmented}>
                    {(['cash', 'card_pending'] as PaymentMethod[]).map((pm) => (
                      <TouchableOpacity
                        key={pm}
                        style={[
                          styles.segmentBtn,
                          paymentMethod === pm && styles.segmentBtnActive,
                        ]}
                        onPress={() => setPaymentMethod(pm)}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            paymentMethod === pm && styles.segmentTextActive,
                          ]}
                        >
                          {COPY.payment[pm]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Notes */}
                  <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                    {COPY.ordering.notesLabel}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.notesInput]}
                    placeholder={COPY.ordering.notesPlaceholder}
                    placeholderTextColor={COLORS.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                    color={COLORS.espresso}
                  />

                  {/* Total */}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{COPY.ordering.totalLabel}</Text>
                    <Text style={styles.totalValue}>{formatPrice(total)}</Text>
                  </View>

                  {error ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  {/* Submit */}
                  <TouchableOpacity
                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.8}
                  >
                    {submitting ? (
                      <ActivityIndicator color={COLORS.cream} size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        {COPY.ordering.confirmOrder.toUpperCase()}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: COLORS.overlay,
  },
  sheetWrapper: {
    maxHeight: '90%',
  },
  sheet: {
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '100%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.borderMedium,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.espresso,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 32,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lineName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.espresso,
    marginRight: 12,
  },
  lineRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyBtn: { padding: 2 },
  qtyBtnText: { fontSize: 16, color: COLORS.espresso, fontWeight: '500' },
  qtyText: { fontSize: 14, color: COLORS.espresso, minWidth: 20, textAlign: 'center' },
  linePrice: { fontSize: 13, fontWeight: '600', color: COLORS.espresso, minWidth: 64, textAlign: 'right' },
  checkoutSection: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.espresso,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: COLORS.espresso,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: COLORS.cream,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: COLORS.card,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.espresso,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.espresso,
  },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: 'rgba(181,78,42,0.2)',
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
  },
  submitBtn: {
    backgroundColor: COLORS.espresso,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: {
    color: COLORS.cream,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3.5,
  },
});
