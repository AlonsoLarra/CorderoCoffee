# Cordero Coffee — App Móvil (iOS & Android)

App móvil nativa construida con **Expo** y **React Native** usando las mismas APIs de Supabase que la app web.

## Pantallas incluidas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing / Home con hero, cómo funciona y manifiesto |
| `/acceso` | Login y registro con email/contraseña |
| `/pedido` | Menú por categorías + carrito flotante |
| `/pedido/confirmacion` | Pantalla de pedido confirmado |
| `/pedido/estado/[orderId]` | Estado en tiempo real (Realtime) |
| `/pedido/historial` | Historial de pedidos del usuario |

## Requisitos previos

- Node.js 18+
- Expo CLI: `npm install -g expo-cli` (o usar `npx expo`)
- Para iOS: macOS con Xcode instalado
- Para Android: Android Studio con emulador configurado

## Instalación

```bash
cd mobile
npm install
```

## Configuración de entorno

Copia `.env.example` a `.env.local` y rellena las claves:

```bash
cp .env.example .env.local
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Las mismas claves del proyecto web (`NEXT_PUBLIC_SUPABASE_URL` → `EXPO_PUBLIC_SUPABASE_URL`).

## Ejecutar el simulador

```bash
# iOS Simulator (solo macOS)
npm run ios

# Android Emulator
npm run android

# Expo Go (escanear QR con la app)
npm start
```

## Estructura del proyecto

```
mobile/
├── app/                     # Rutas (expo-router, igual a Next.js App Router)
│   ├── _layout.tsx          # Layout raíz con providers
│   ├── index.tsx            # Pantalla principal
│   ├── acceso.tsx           # Login / registro
│   └── pedido/
│       ├── index.tsx        # Menú + carrito
│       ├── confirmacion.tsx
│       ├── historial.tsx
│       └── estado/[orderId].tsx
├── components/
│   ├── ordering/CartSheet.tsx  # Modal de carrito y checkout
│   └── ui/ToastProvider.tsx
├── context/
│   ├── AuthContext.tsx      # Estado de autenticación global
│   └── CartContext.tsx      # Estado del carrito global
└── lib/
    ├── colors.ts            # Colores de la marca
    ├── copy.ts              # Textos en español
    ├── types.ts             # Tipos TypeScript compartidos
    ├── supabase.ts          # Cliente Supabase + formatPrice
    └── cart.ts              # Persistencia del carrito (AsyncStorage)
```

## Características

- **Autenticación** con Supabase Auth (persistencia en SecureStore)
- **Menú dinámico** cargado desde Supabase (mismas tablas que web)
- **Carrito persistente** en AsyncStorage (modo invitado)
- **Checkout completo** con tipo de retiro, método de pago y notas
- **Estado en tiempo real** via Supabase Realtime subscriptions
- **Historial de pedidos** para usuarios autenticados
- **Colores de marca** idénticos a la app web
