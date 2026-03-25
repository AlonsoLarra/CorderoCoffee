import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { COLORS } from '@/lib/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <StatusBar style="dark" backgroundColor={COLORS.cream} />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: COLORS.cream },
                headerTintColor: COLORS.espresso,
                headerTitleStyle: {
                  fontWeight: '600',
                  fontSize: 17,
                },
                contentStyle: { backgroundColor: COLORS.cream },
                headerShadowVisible: false,
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen
                name="acceso"
                options={{ title: 'Acceso', headerBackTitle: 'Inicio' }}
              />
              <Stack.Screen name="pedido" options={{ headerShown: false }} />
            </Stack>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
