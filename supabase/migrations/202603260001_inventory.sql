-- Migration: Inventory tracking
-- Adds stock control columns to menu_items and a trigger to decrement stock on delivery

-- 1. Add inventory columns to menu_items
alter table public.menu_items
  add column if not exists track_stock boolean not null default false,
  add column if not exists stock_quantity integer default null,
  add column if not exists low_stock_alert integer not null default 5;
-- 2. Function: decrement stock when an order is marked "entregado"
create or replace function public.decrement_stock_on_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only act when transitioning to "entregado"
  if NEW.status = 'entregado' and OLD.status <> 'entregado' then
    update public.menu_items mi
    set stock_quantity = greatest(0, mi.stock_quantity - oi.quantity)
    from public.order_items oi
    where oi.order_id = NEW.id
      and oi.item_id = mi.id
      and mi.track_stock = true
      and mi.stock_quantity is not null;
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_decrement_stock_on_delivery on public.orders;
create trigger trg_decrement_stock_on_delivery
after update on public.orders
for each row execute function public.decrement_stock_on_delivery();
-- 3. Grant
grant update(stock_quantity, track_stock, low_stock_alert) on public.menu_items to authenticated;
