-- =============================================================================
-- Atomic stock reservation for menu items.
-- Replaces the application-level read-check-write pattern which is vulnerable
-- to race conditions when multiple orders arrive simultaneously.
--
-- Returns TRUE  if stock was successfully reserved (decremented).
-- Returns FALSE if stock was insufficient or item does not track stock.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reserve_menu_item_stock(p_item_id UUID, p_qty INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH updated AS (
    UPDATE public.menu_items
    SET stock_quantity = stock_quantity - p_qty
    WHERE id         = p_item_id
      AND track_stock = true
      AND stock_quantity IS NOT NULL
      AND stock_quantity >= p_qty
    RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$$;
