-- Persistent in-app notifications for order status changes
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

-- Fast lookup of user notifications sorted by recency
create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

-- Fast unread count
create index notifications_user_id_unread_idx
  on public.notifications (user_id)
  where is_read = false;

-- RLS
alter table public.notifications enable row level security;

-- Users can read their own notifications
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can mark their own notifications as read
create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Inserts happen via service_role (admin client) in the API route
-- No insert policy needed for authenticated users

-- Enable Realtime
alter publication supabase_realtime add table public.notifications;

-- Grant permissions
grant select, update on public.notifications to authenticated;
