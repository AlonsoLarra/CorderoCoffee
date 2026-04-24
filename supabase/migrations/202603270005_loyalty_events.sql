-- =============================================================================
-- Loyalty events audit trail.
-- Every point grant or redemption is a new immutable row.
-- reward_points on profiles is the running total; this table is the history.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id     UUID        REFERENCES public.orders(id) ON DELETE SET NULL,
  delta        INTEGER     NOT NULL,                        -- positive = earned, negative = redeemed
  reason       TEXT        NOT NULL,                        -- 'order_delivered' | 'redeemed' | 'manual_adjustment'
  balance_after INTEGER    NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_events_user  ON public.loyalty_events(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_events_order ON public.loyalty_events(order_id);

ALTER TABLE public.loyalty_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own loyalty history
CREATE POLICY "loyalty_events_owner_read"
  ON public.loyalty_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Staff can view all loyalty events
CREATE POLICY "loyalty_events_staff_read"
  ON public.loyalty_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('employee', 'admin', 'super_admin')
    )
  );

GRANT SELECT ON public.loyalty_events TO authenticated;

-- Make the table immutable: points history can never be altered or deleted
CREATE OR REPLACE FUNCTION public.prevent_loyalty_events_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'loyalty_events records are immutable: % is not allowed', TG_OP;
END;
$$;

CREATE TRIGGER loyalty_events_immutable
  BEFORE UPDATE OR DELETE ON public.loyalty_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_loyalty_events_mutation();
