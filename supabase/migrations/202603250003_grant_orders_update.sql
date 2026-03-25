-- Grant UPDATE privilege on orders and order_items to authenticated users.
-- The orders_update_admin RLS policy already restricts updates to admins only,
-- but the privilege was missing at the table level, causing all status updates
-- (including Cancel) to fail with a permissions error.
grant update on public.orders to authenticated;
grant update on public.order_items to authenticated;
