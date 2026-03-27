-- Migration: Shift & Cash Management
-- Adds store_settings, cash_movements, cash_drops, daily_closings
-- Modifies shifts table for cash verification and handoff

-- ============================================================
-- 1. STORE SETTINGS — admin-configurable parameters
-- ============================================================
create table if not exists public.store_settings (
  key   text primary key,
  value text not null
);

-- Seed defaults
insert into public.store_settings (key, value) values
  ('minimum_cash_in_drawer', '1000'),
  ('cash_drop_threshold', '5000'),
  ('max_orders_after_threshold', '5'),
  ('store_open_time', '07:00'),
  ('store_close_time', '20:00'),
  ('blind_close_enabled', 'true')
on conflict (key) do nothing;

alter table public.store_settings enable row level security;

drop policy if exists "store_settings_staff_read" on public.store_settings;
create policy "store_settings_staff_read"
  on public.store_settings for select
  to authenticated
  using (public.is_staff(auth.uid()));

drop policy if exists "store_settings_admin_write" on public.store_settings;
create policy "store_settings_admin_write"
  on public.store_settings for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select on public.store_settings to authenticated;
grant insert, update on public.store_settings to authenticated;

-- ============================================================
-- 2. MODIFY SHIFTS — add verification & handoff fields
-- ============================================================
alter table public.shifts
  add column if not exists expected_opening_cash numeric(10,2),
  add column if not exists actual_opening_cash   numeric(10,2),
  add column if not exists opening_discrepancy   numeric(10,2),
  add column if not exists opening_confirmed_at  timestamptz,
  add column if not exists expected_closing_cash  numeric(10,2),
  add column if not exists actual_closing_cash    numeric(10,2),
  add column if not exists closing_discrepancy    numeric(10,2),
  add column if not exists handoff_to             uuid references public.profiles(id),
  add column if not exists cash_sales_total       numeric(10,2) default 0,
  add column if not exists card_sales_total       numeric(10,2) default 0,
  add column if not exists total_cash_drops       numeric(10,2) default 0,
  add column if not exists orders_since_threshold integer default 0;

-- ============================================================
-- 3. CASH MOVEMENTS — immutable ledger for all cash events
-- ============================================================
create type public.cash_movement_type as enum (
  'opening',
  'sale',
  'cash_drop',
  'adjustment',
  'closing'
);

create table if not exists public.cash_movements (
  id            uuid        primary key default gen_random_uuid(),
  shift_id      uuid        not null references public.shifts(id) on delete cascade,
  type          public.cash_movement_type not null,
  amount        numeric(10,2) not null,
  balance_after numeric(10,2) not null,
  order_id      uuid        references public.orders(id) on delete set null,
  performed_by  uuid        references public.profiles(id),
  notes         text,
  created_at    timestamptz not null default timezone('utc', now())
);

create index idx_cash_movements_shift on public.cash_movements(shift_id);
create index idx_cash_movements_type  on public.cash_movements(type);

alter table public.cash_movements enable row level security;

drop policy if exists "cash_movements_staff_read" on public.cash_movements;
create policy "cash_movements_staff_read"
  on public.cash_movements for select
  to authenticated
  using (public.is_staff(auth.uid()));

drop policy if exists "cash_movements_staff_write" on public.cash_movements;
create policy "cash_movements_staff_write"
  on public.cash_movements for insert
  to authenticated
  with check (public.is_staff(auth.uid()));

grant select, insert on public.cash_movements to authenticated;

-- ============================================================
-- 4. CASH DROPS — mid-shift cash removals
-- ============================================================
create type public.cash_drop_status as enum (
  'suggested',
  'confirmed',
  'skipped'
);

create table if not exists public.cash_drops (
  id                  uuid        primary key default gen_random_uuid(),
  shift_id            uuid        not null references public.shifts(id) on delete cascade,
  suggested_amount    numeric(10,2) not null,
  actual_amount       numeric(10,2),
  remaining_in_drawer numeric(10,2),
  performed_by        uuid        references public.profiles(id),
  status              public.cash_drop_status not null default 'suggested',
  notes               text,
  created_at          timestamptz not null default timezone('utc', now()),
  confirmed_at        timestamptz
);

create index idx_cash_drops_shift on public.cash_drops(shift_id);

alter table public.cash_drops enable row level security;

drop policy if exists "cash_drops_staff_read" on public.cash_drops;
create policy "cash_drops_staff_read"
  on public.cash_drops for select
  to authenticated
  using (public.is_staff(auth.uid()));

drop policy if exists "cash_drops_staff_write" on public.cash_drops;
create policy "cash_drops_staff_write"
  on public.cash_drops for all
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

grant select, insert, update on public.cash_drops to authenticated;

-- ============================================================
-- 5. DAILY CLOSINGS — end-of-day Z-Report
-- ============================================================
create type public.daily_closing_status as enum ('open', 'closed');

create table if not exists public.daily_closings (
  id                  uuid        primary key default gen_random_uuid(),
  date                date        not null unique,
  closed_by           uuid        references public.profiles(id),
  total_shifts        integer     not null default 0,
  total_orders        integer     not null default 0,
  total_cash_sales    numeric(10,2) not null default 0,
  total_card_sales    numeric(10,2) not null default 0,
  total_cash_drops    numeric(10,2) not null default 0,
  expected_final_cash numeric(10,2),
  actual_final_cash   numeric(10,2),
  discrepancy         numeric(10,2),
  status              public.daily_closing_status not null default 'open',
  top_products        jsonb,
  hourly_sales        jsonb,
  notes               text,
  closed_at           timestamptz,
  created_at          timestamptz not null default timezone('utc', now())
);

create index idx_daily_closings_date on public.daily_closings(date);

alter table public.daily_closings enable row level security;

drop policy if exists "daily_closings_staff_read" on public.daily_closings;
create policy "daily_closings_staff_read"
  on public.daily_closings for select
  to authenticated
  using (public.is_staff(auth.uid()));

drop policy if exists "daily_closings_admin_write" on public.daily_closings;
create policy "daily_closings_admin_write"
  on public.daily_closings for all
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

grant select, insert, update on public.daily_closings to authenticated;

-- ============================================================
-- 6. Add new tab permissions for settings
-- ============================================================
insert into public.role_permissions (role, tab_key, allowed)
values
  ('admin', 'configuracion', true),
  ('super_admin', 'configuracion', true)
on conflict do nothing;
