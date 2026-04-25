-- Migration: Shift (caja) management
-- Adds shifts table to track cash register open/close per workday

create table if not exists public.shifts (
  id           uuid        primary key default gen_random_uuid(),
  opened_by    uuid        references public.profiles(id),
  closed_by    uuid        references public.profiles(id),
  opening_cash numeric(10,2) not null default 0,
  closing_cash numeric(10,2),
  status       text        not null default 'open' check (status in ('open', 'closed')),
  notes        text,
  opened_at    timestamptz not null default timezone('utc', now()),
  closed_at    timestamptz
);
-- Link orders to shifts (nullable — historical orders have no shift)
alter table public.orders
  add column if not exists shift_id uuid references public.shifts(id) on delete set null;
-- RLS
alter table public.shifts enable row level security;
drop policy if exists "shifts_staff_read" on public.shifts;
create policy "shifts_staff_read"
on public.shifts for select
to authenticated
using (public.is_staff(auth.uid()));
drop policy if exists "shifts_admin_write" on public.shifts;
create policy "shifts_admin_write"
on public.shifts for all
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));
-- Grants
grant select, insert, update on public.shifts to authenticated;
