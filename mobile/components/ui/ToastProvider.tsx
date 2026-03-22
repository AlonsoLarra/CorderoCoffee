import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '@/lib/colors';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map((t) => (
          <View key={t.id} style={[styles.toast, toastTypeStyle(t.type)]}>
            <Text style={[styles.toastText, toastTextStyle(t.type)]}>{t.message}</Text>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function toastTypeStyle(type: ToastType) {
  switch (type) {
    case 'success': return { backgroundColor: COLORS.successBg, borderColor: 'rgba(58,105,67,0.3)' };
    case 'error': return { backgroundColor: COLORS.errorBg, borderColor: 'rgba(181,78,42,0.3)' };
    default: return { backgroundColor: COLORS.card, borderColor: COLORS.borderMedium };
  }
}

function toastTextStyle(type: ToastType) {
  switch (type) {
    case 'success': return { color: COLORS.success };
    case 'error': return { color: COLORS.error };
    default: return { color: COLORS.espresso };
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
