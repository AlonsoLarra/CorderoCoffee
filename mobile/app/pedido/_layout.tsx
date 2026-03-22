import { Stack } from 'expo-router';
import { COLORS } from '@/lib/colors';

export default function PedidoLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.cream },
        headerTintColor: COLORS.espresso,
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        contentStyle: { backgroundColor: COLORS.cream },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Tu pedido' }} />
      <Stack.Screen name="confirmacion" options={{ title: 'Pedido confirmado', headerBackVisible: false }} />
      <Stack.Screen name="historial" options={{ title: 'Mis pedidos', headerBackTitle: 'Menú' }} />
      <Stack.Screen name="estado/[orderId]" options={{ title: 'Estado del pedido', headerBackTitle: 'Menú' }} />
    </Stack>
  );
}
