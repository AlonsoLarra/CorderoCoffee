-- Fix 1: Add 'card_online' to the payment_method enum so online card payments work.
alter type public.payment_method add value if not exists 'card_online';
-- Fix 2: Make log_order_status_change SECURITY DEFINER so the trigger can insert
-- into order_status_log regardless of the calling user's RLS context.
-- Without this, every order insert by a non-admin user fails because the trigger
-- fires and hits the orders_status_log RLS policy that only allows admin inserts.
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
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
