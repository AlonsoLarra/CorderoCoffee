-- Migration: Discount codes and loyalty point redemption
-- Adds discount_codes table and discount columns to orders

create table if not exists public.discount_codes (
  id          uuid        primary key default gen_random_uuid(),
  code        text        unique not null,
  type        text        not null check (type in ('percent', 'fixed')),
  value       numeric(10,2) not null check (value > 0),
  max_uses    integer,
  used_count  integer     not null default 0,
  expires_at  timestamptz,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default timezone('utc', now())
);
-- Add discount tracking to orders
alter table public.orders
  add column if not exists discount_amount  numeric(10,2) not null default 0,
  add column if not exists discount_code_id uuid references public.discount_codes(id) on delete set null,
  add column if not exists points_redeemed  integer not null default 0;
-- RLS for discount_codes
alter table public.discount_codes enable row level security;
-- Anyone authenticated can read active codes (to validate at checkout)
drop policy if exists "discount_codes_authenticated_read" on public.discount_codes;
create policy "discount_codes_authenticated_read"
on public.discount_codes for select
to authenticated
using (true);
-- Only admins can write discount codes
drop policy if exists "discount_codes_admin_write" on public.discount_codes;
create policy "discount_codes_admin_write"
on public.discount_codes for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
-- Grants
grant select on public.discount_codes to authenticated;
grant insert, update on public.discount_codes to authenticated;
