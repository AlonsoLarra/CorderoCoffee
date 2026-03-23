# Cordero Coffee Club

Aplicacion web full-stack para pedidos en linea, administracion de cafeteria y presencia de marca.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (siguiente fase)

## Requisitos

- Node.js 20+
- npm 10+

## Configuracion inicial

1. Instala dependencias:

	npm install

2. Copia variables de entorno:

	cp .env.example .env.local

3. Completa tus llaves de Supabase en `.env.local`.

## Desarrollo

Inicia servidor local:

npm run dev

App disponible en http://localhost:3000

## Scripts

- `npm run dev`: servidor de desarrollo
- `npm run lint`: validacion ESLint
- `npm run build`: build de produccion
- `npm run start`: correr build en produccion
- `npm run smoke`: smoke tests HTTP basicos contra una app levantada
- `npm run ios:add`: crea proyecto nativo iOS (una sola vez)
- `npm run ios:sync`: sincroniza cambios web/config a iOS
- `npm run ios:open`: abre proyecto iOS en Xcode
- `npm run ios:run`: compila y corre en simulador/dispositivo via CLI

## iOS (Capacitor)

El repo incluye una version iOS empaquetada con Capacitor en `ios/`.

### Requisitos

- Xcode instalado
- CocoaPods disponible en PATH (`pod --version`)

Si instalaste CocoaPods via RubyGems en modo usuario, agrega al shell:

`export PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH"`

En algunos entornos Ruby de macOS tambien puede ser necesario:

`export RUBYOPT='-rlogger'`

### Flujo recomendado

1. Levanta la web local:

	npm run dev

2. (Solo la primera vez) agrega iOS:

	npm run ios:add

3. Sincroniza cambios:

	npm run ios:sync

4. Ejecuta en simulador:

	npm run ios:run

La app iOS usa `CAP_SERVER_URL` y por defecto apunta a `http://localhost:3000`.
Puedes sobreescribirlo, por ejemplo:

`CAP_SERVER_URL=https://tu-deploy.vercel.app npm run ios:sync`

## Smoke Tests

1. Levanta la app:

	npm run dev

2. En otra terminal, ejecuta:

	npm run smoke

3. Para otro host/puerto:

	BASE_URL=https://tu-dominio.com npm run smoke

Estos smoke tests validan rutas criticas y que `/api/orders` responde correctamente ante payload invalido.

## Deploy Checklist (Vercel)

1. Proyecto en Vercel conectado al repo.
2. Variables configuradas en Vercel para Preview y Production:
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- `SUPABASE_SERVICE_ROLE_KEY`
3. Migraciones aplicadas en Supabase:
	- `supabase/migrations/202603210001_init.sql`
	- `supabase/seed.sql`
4. Realtime habilitado para tablas:
	- `public.orders`
	- `public.order_status_log`
5. Verificar usuario admin/super_admin existente en `profiles`.
6. Validar build en CI o local (`npm run build`) antes de promover.
7. Ejecutar smoke tests sobre URL de Preview antes de Production.

## Vercel Env Mapping

- `NEXT_PUBLIC_SUPABASE_URL` -> Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` -> Supabase anon public key
- `SUPABASE_SERVICE_ROLE_KEY` -> Supabase service role key (server-only)

## Estructura base actual

- `app/(public)`: landing publica inicial
- `app/(ordering)`: flujo de pedidos (placeholder)
- `app/(admin)`: area admin (placeholder)
- `components/*`: carpetas para UI y modulos de dominio
- `lib/copy.ts`: copy centralizado en espanol
- `lib/config/env.ts`: validacion tipada de variables de entorno

## Estado

Fase 1 completada y base de Fase 3 aplicada:

- Bootstrap tecnico y arquitectura base listos.
- Capa Supabase inicial en TypeScript (`lib/supabase/*`).
- Middleware server-side para proteger `/admin/*` por rol.
- Migracion SQL inicial + seed en `supabase/`.
- Primer slice de pedidos en `/pedido`: lectura de menu activo desde Supabase + carrito draft persistente local.
- Checkout MVP: creacion de `orders` y `order_items` via `POST /api/orders` + pantalla de confirmacion.
- Tracker de estado para cliente autenticado en `/pedido/estado/[orderId]`.
- Cola operativa admin en `/admin` con transiciones one-click via `PATCH /api/admin/orders/[orderId]/status`.
- Actualizacion en vivo con Supabase Realtime en cola admin y tracker de pedido (auto-refresh).
- Admin menu CRUD via APIs (`/api/admin/menu/*`) y UI integrada en `/admin`.
- Alta manual de pedidos walk-in via `POST /api/admin/orders/walkin` y UI integrada en `/admin`.

Siguiente bloque: hardening de UX (toasts globales, manejo de errores avanzado) y despliegue a Vercel con entorno productivo.
