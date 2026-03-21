# Supabase Setup

Este directorio contiene la base de datos inicial para Cordero Coffee Club.

## Archivos

- `migrations/202603210001_init.sql`: esquema inicial, triggers y RLS.
- `seed.sql`: categorias, items de ejemplo y asignacion de `super_admin`.

## Flujo recomendado

1. Ejecutar migracion SQL en tu proyecto de Supabase.
2. Ejecutar `seed.sql`.
3. Verificar que el usuario `alonzo.larraguibel@gmail.com` exista en `auth.users` para que su perfil se promueva a `super_admin`.

## Notas de seguridad

- Las rutas `/admin/*` dependen de `profiles.role` y validacion server-side en middleware.
- `SUPABASE_SERVICE_ROLE_KEY` solo debe usarse en servidor.
