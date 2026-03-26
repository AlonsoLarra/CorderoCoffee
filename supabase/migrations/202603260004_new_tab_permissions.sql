-- Migration: Add new tab permissions for inventario, caja, descuentos
-- employee: inventario + caja access, no descuentos
-- admin: all new tabs

insert into public.role_permissions (role, tab_key, allowed) values
  ('employee', 'inventario', true),
  ('employee', 'caja',       true),
  ('employee', 'descuentos', false),
  ('admin',    'inventario', true),
  ('admin',    'caja',       true),
  ('admin',    'descuentos', true)
on conflict (role, tab_key) do nothing;
