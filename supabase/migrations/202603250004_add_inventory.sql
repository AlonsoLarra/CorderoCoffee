-- =====================================================================
-- Gestión de inventario
-- =====================================================================

-- Catálogo de insumos / ingredientes
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'unidad',   -- ml, g, piezas, oz, l, kg…
  current_stock NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  minimum_stock NUMERIC(10,2) CHECK (minimum_stock IS NULL OR minimum_stock >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Receta: qué ingredientes consume cada ítem de menú y en qué cantidad por unidad pedida
CREATE TABLE IF NOT EXISTS public.menu_item_ingredients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id      UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity          NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, inventory_item_id)
);

-- Trigger para updated_at en inventory_items
DROP TRIGGER IF EXISTS trg_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- Row Level Security
-- =====================================================================

ALTER TABLE public.inventory_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_ingredients  ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden leer y modificar el inventario
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inventory_items'
      AND policyname = 'inventory_admin_all'
  ) THEN
    CREATE POLICY "inventory_admin_all" ON public.inventory_items
      FOR ALL TO authenticated
      USING (is_admin(auth.uid()))
      WITH CHECK (is_admin(auth.uid()));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'menu_item_ingredients'
      AND policyname = 'ingredients_admin_all'
  ) THEN
    CREATE POLICY "ingredients_admin_all" ON public.menu_item_ingredients
      FOR ALL TO authenticated
      USING (is_admin(auth.uid()))
      WITH CHECK (is_admin(auth.uid()));
  END IF;
END;
$$;

-- Service role (usado por el cliente admin) siempre tiene acceso completo
-- (Supabase lo garantiza por defecto al usar la service role key)

-- =====================================================================
-- Función para descuento atómico de stock (evita race conditions)
-- Descuenta p_amount del stock del insumo p_item_id, con piso en 0
-- =====================================================================
CREATE OR REPLACE FUNCTION public.decrement_inventory_stock(p_item_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.inventory_items
  SET
    current_stock = GREATEST(current_stock - p_amount, 0),
    updated_at    = now()
  WHERE id = p_item_id;
$$;
