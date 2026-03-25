-- Migration: Role-based access control
-- Adds employee role, role_permissions table, and updated RLS policies

-- 1. Add 'employee' value to the role enum (safe if already exists)
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'employee'
      and enumtypid = (select oid from pg_type where typname = 'role')
  ) then
    alter type public.role add value 'employee';
  end if;

  -- Also add 'cancelado' to order_status if missing (was in domain but not in original migration)
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'cancelado'
      and enumtypid = (select oid from pg_type where typname = 'order_status')
  ) then
    alter type public.order_status add value 'cancelado';
  end if;
end
$$;

-- 2. Helper: is_staff() — true for admin, super_admin, or employee
create or replace function public.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role in ('admin', 'super_admin', 'employee')
  );
$$;

-- 3. role_permissions table — stores per-role tab access
create table if not exists public.role_permissions (
  id         uuid      primary key default gen_random_uuid(),
  role       text      not null,
  tab_key    text      not null,
  allowed    boolean   not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (role, tab_key)
);

drop trigger if exists trg_role_permissions_updated_at on public.role_permissions;
create trigger trg_role_permissions_updated_at
before update on public.role_permissions
for each row execute function public.set_updated_at();

-- 4. Seed default permissions
-- employee: only pedidos + alta by default
-- admin: everything except usuarios (super_admin-only hardcoded)
insert into public.role_permissions (role, tab_key, allowed) values
  ('employee', 'pedidos',   true),
  ('employee', 'alta',      true),
  ('employee', 'menu',      false),
  ('employee', 'reportes',  false),
  ('employee', 'permisos',  false),
  ('admin',    'pedidos',   true),
  ('admin',    'alta',      true),
  ('admin',    'menu',      true),
  ('admin',    'reportes',  true),
  ('admin',    'permisos',  true)
on conflict (role, tab_key) do nothing;

-- 5. RLS for role_permissions
alter table public.role_permissions enable row level security;

drop policy if exists "role_permissions_staff_read" on public.role_permissions;
create policy "role_permissions_staff_read"
on public.role_permissions
for select
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists "role_permissions_admin_write" on public.role_permissions;
create policy "role_permissions_admin_write"
on public.role_permissions
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- 6. Update orders SELECT policy to include employee
drop policy if exists "orders_select_scope" on public.orders;
create policy "orders_select_scope"
on public.orders
for select
to authenticated
using (
  public.is_staff(auth.uid())
  or auth.uid() = user_id
);

-- 7. Update orders UPDATE policy to include employee
drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin"
on public.orders
for update
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

-- 8. Update order_items SELECT policy to include employee
drop policy if exists "order_items_select_scope" on public.order_items;
create policy "order_items_select_scope"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (public.is_staff(auth.uid()) or o.user_id = auth.uid())
  )
);

-- 9. Update order_status_log policies to include employee
drop policy if exists "order_status_log_select_scope" on public.order_status_log;
create policy "order_status_log_select_scope"
on public.order_status_log
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_status_log.order_id
      and (public.is_staff(auth.uid()) or o.user_id = auth.uid())
  )
);

drop policy if exists "order_status_log_insert_admin" on public.order_status_log;
create policy "order_status_log_insert_admin"
on public.order_status_log
for insert
to authenticated
with check (public.is_staff(auth.uid()));

-- 10. Grants
grant update on public.orders to authenticated;
grant insert on public.order_status_log to authenticated;
grant select, insert, update on public.role_permissions to authenticated;
