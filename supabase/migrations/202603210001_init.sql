create extension if not exists pgcrypto;
do $$
begin
  if not exists (select 1 from pg_type where typname = 'role') then
    create type public.role as enum ('guest', 'customer', 'admin', 'super_admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('pendiente', 'aceptado', 'preparando', 'listo', 'entregado');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_type') then
    create type public.order_type as enum ('online', 'walkin');
  end if;

  if not exists (select 1 from pg_type where typname = 'pickup_type') then
    create type public.pickup_type as enum ('ahora', 'agendar', 'al_llegar');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('cash', 'card_pending');
  end if;
end
$$;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.role not null default 'customer',
  name text,
  phone text,
  reward_points integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete restrict,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.item_modifiers (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  options jsonb not null default '[]'::jsonb,
  is_required boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status public.order_status not null default 'pendiente',
  type public.order_type not null default 'online',
  pickup_type public.pickup_type not null default 'ahora',
  payment_method public.payment_method not null default 'cash',
  pickup_time timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id uuid not null references public.menu_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  modifiers jsonb not null default '[]'::jsonb,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.order_status_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  changed_at timestamptz not null default timezone('utc', now())
);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_menu_items_category_id on public.menu_items(category_id);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists trg_menu_categories_updated_at on public.menu_categories;
create trigger trg_menu_categories_updated_at
before update on public.menu_categories
for each row execute function public.set_updated_at();
drop trigger if exists trg_menu_items_updated_at on public.menu_items;
create trigger trg_menu_items_updated_at
before update on public.menu_items
for each row execute function public.set_updated_at();
drop trigger if exists trg_item_modifiers_updated_at on public.item_modifiers;
create trigger trg_item_modifiers_updated_at
before update on public.item_modifiers
for each row execute function public.set_updated_at();
drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'customer')
  on conflict (id) do nothing;

  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_log (order_id, status)
    values (new.id, new.status);
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.order_status_log (order_id, status)
    values (new.id, new.status);
  end if;

  return new;
end;
$$;
drop trigger if exists trg_orders_status_log on public.orders;
create trigger trg_orders_status_log
after insert or update on public.orders
for each row execute function public.log_order_status_change();
create or replace function public.is_admin(uid uuid)
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
      and p.role in ('admin', 'super_admin')
  );
$$;
alter table public.profiles enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.item_modifiers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_log enable row level security;
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()));
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));
drop policy if exists "menu_public_read_categories" on public.menu_categories;
create policy "menu_public_read_categories"
on public.menu_categories
for select
to anon, authenticated
using (is_active = true or public.is_admin(auth.uid()));
drop policy if exists "menu_admin_write_categories" on public.menu_categories;
create policy "menu_admin_write_categories"
on public.menu_categories
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
drop policy if exists "menu_public_read_items" on public.menu_items;
create policy "menu_public_read_items"
on public.menu_items
for select
to anon, authenticated
using (is_active = true or public.is_admin(auth.uid()));
drop policy if exists "menu_admin_write_items" on public.menu_items;
create policy "menu_admin_write_items"
on public.menu_items
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
drop policy if exists "menu_public_read_modifiers" on public.item_modifiers;
create policy "menu_public_read_modifiers"
on public.item_modifiers
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.menu_items mi
    where mi.id = item_modifiers.item_id
      and (mi.is_active = true or public.is_admin(auth.uid()))
  )
);
drop policy if exists "menu_admin_write_modifiers" on public.item_modifiers;
create policy "menu_admin_write_modifiers"
on public.item_modifiers
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
drop policy if exists "orders_select_scope" on public.orders;
create policy "orders_select_scope"
on public.orders
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or auth.uid() = user_id
);
drop policy if exists "orders_insert_owner_or_guest" on public.orders;
create policy "orders_insert_owner_or_guest"
on public.orders
for insert
to anon, authenticated
with check (
  public.is_admin(auth.uid())
  or auth.uid() = user_id
  or user_id is null
);
drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin"
on public.orders
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
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
      and (public.is_admin(auth.uid()) or o.user_id = auth.uid())
  )
);
drop policy if exists "order_items_insert_scope" on public.order_items;
create policy "order_items_insert_scope"
on public.order_items
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        public.is_admin(auth.uid())
        or o.user_id = auth.uid()
        or o.user_id is null
      )
  )
);
drop policy if exists "order_items_update_admin" on public.order_items;
create policy "order_items_update_admin"
on public.order_items
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
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
      and (public.is_admin(auth.uid()) or o.user_id = auth.uid())
  )
);
drop policy if exists "order_status_log_insert_admin" on public.order_status_log;
create policy "order_status_log_insert_admin"
on public.order_status_log
for insert
to authenticated
with check (public.is_admin(auth.uid()));
grant usage on schema public to anon, authenticated;
grant select on public.menu_categories, public.menu_items, public.item_modifiers to anon, authenticated;
grant select, insert on public.orders, public.order_items to anon, authenticated;
grant select on public.order_status_log to authenticated;
