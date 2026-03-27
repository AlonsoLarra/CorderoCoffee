-- =====================================================================
-- Deduplicate menu categories and items, then add unique constraints
-- to prevent future duplicates from seed/migration overlap.
-- =====================================================================

-- 1. Remove duplicate menu_items (keep the oldest row per name+category)
DELETE FROM public.menu_items a
USING public.menu_items b
WHERE a.name = b.name
  AND a.category_id = b.category_id
  AND a.created_at > b.created_at;

-- 2. Remove duplicate menu_categories (keep the oldest row per name)
--    First, reassign any items pointing to the duplicate category
DO $$
DECLARE
  dup RECORD;
  canonical_id uuid;
BEGIN
  FOR dup IN
    SELECT name
    FROM public.menu_categories
    GROUP BY name
    HAVING count(*) > 1
  LOOP
    SELECT id INTO canonical_id
    FROM public.menu_categories
    WHERE name = dup.name
    ORDER BY created_at ASC
    LIMIT 1;

    -- Move items from duplicate categories to the canonical one
    UPDATE public.menu_items
    SET category_id = canonical_id
    WHERE category_id IN (
      SELECT id FROM public.menu_categories
      WHERE name = dup.name AND id != canonical_id
    );

    -- Delete the duplicate categories
    DELETE FROM public.menu_categories
    WHERE name = dup.name AND id != canonical_id;
  END LOOP;
END;
$$;

-- After reassigning, there may be new duplicates in menu_items
-- (same name+category after category merge). Clean them up.
DELETE FROM public.menu_items a
USING public.menu_items b
WHERE a.name = b.name
  AND a.category_id = b.category_id
  AND a.created_at > b.created_at;

-- 3. Add unique constraints to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_categories_name
  ON public.menu_categories (name);

CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_items_name_category
  ON public.menu_items (name, category_id);
