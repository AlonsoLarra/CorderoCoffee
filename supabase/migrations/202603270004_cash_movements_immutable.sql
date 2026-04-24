-- =============================================================================
-- Make cash_movements truly immutable at the database level.
-- No UPDATE or DELETE is ever allowed, even by super_admin or service role.
-- Cash records can only be appended, never modified or erased.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_cash_movements_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'cash_movements records are immutable: % is not allowed', TG_OP;
END;
$$;

CREATE TRIGGER cash_movements_immutable
  BEFORE UPDATE OR DELETE ON public.cash_movements
  FOR EACH ROW EXECUTE FUNCTION public.prevent_cash_movements_mutation();
