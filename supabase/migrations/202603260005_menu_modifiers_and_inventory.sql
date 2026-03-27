-- =====================================================================
-- Modificadores de tamaño y catálogo de insumos
-- =====================================================================

-- 0. Asegurar categorías y ítems del menú (idempotente)
--    Esto es necesario en entornos remotos donde seed.sql no se ejecuta.
INSERT INTO public.menu_categories (name, sort_order, is_active)
VALUES
  ('Cafe caliente',    1, true),
  ('Cafe frio',        2, true),
  ('Panaderia',        3, true),
  ('Barra tradicional',4, true),
  ('Café',             5, true),
  ('Non Coffee',       6, true)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  cat_hot         uuid;
  cat_cold        uuid;
  cat_traditional uuid;
  cat_cafe        uuid;
  cat_non_coffee  uuid;
BEGIN
  SELECT id INTO cat_hot         FROM public.menu_categories WHERE name = 'Cafe caliente'     LIMIT 1;
  SELECT id INTO cat_cold        FROM public.menu_categories WHERE name = 'Cafe frio'          LIMIT 1;
  SELECT id INTO cat_traditional FROM public.menu_categories WHERE name = 'Barra tradicional' LIMIT 1;
  SELECT id INTO cat_cafe        FROM public.menu_categories WHERE name = 'Café'              LIMIT 1;
  SELECT id INTO cat_non_coffee  FROM public.menu_categories WHERE name = 'Non Coffee'        LIMIT 1;

  INSERT INTO public.menu_items (category_id, name, description, price, is_active, sort_order)
  VALUES
    (cat_hot,         'Latte de la casa',   'Espresso doble con leche vaporizada', 75,  true, 1),
    (cat_hot,         'Americano',          'Espresso con agua filtrada',          48,  true, 2),
    (cat_cold,        'Cold Brew',          'Extraccion lenta, servido en frio',   70,  true, 1),
    (cat_traditional, 'Espresso',           NULL,                                  45,  true, 1),
    (cat_traditional, 'Cortado',            NULL,                                  55,  true, 2),
    (cat_traditional, 'Capuccino',          NULL,                                  70,  true, 3),
    (cat_traditional, 'Latte',              NULL,                                  70,  true, 4),
    (cat_traditional, 'Matcha',             NULL,                                  65,  true, 5),
    (cat_traditional, 'Masala Chai',        NULL,                                  60,  true, 6),
    (cat_cafe,        'Latte Vainilla',     NULL,                                  85,  true, 1),
    (cat_cafe,        'Miel y canela',      'Espresso doble con miel de abeja, canela en polvo y leche', 90, true, 2),
    (cat_cafe,        'MORENO',             'Miel maple + con sal de mar, espresso doble + leche',       90, true, 3),
    (cat_cafe,        'La Creme',           'Espresso doble con salsa de caramelo con mantequilla y leche cremosa', 90, true, 4),
    (cat_cafe,        'Espresso tonic',     'Espresso doble, agua tónica y naranja cardamomo',            85, true, 5),
    (cat_non_coffee,  'Gold n'' Milk',      'Cúrcuma endulzada con miel de agave, un toque de canela y leche a tu elección', 90, true, 1),
    (cat_non_coffee,  'Is this chocolate?', 'Autentica algarroba a base de agua o leche y endulzada con un poco de vainilla (pruébalo con espresso)', 100, true, 2)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 1. Modificadores de tamaño para bebidas con dos precios
--    (precio base = talla chica, +10 para grande)
DO $$
DECLARE
  v_miel_y_canela     uuid;
  v_moreno            uuid;
  v_la_creme          uuid;
  v_is_this_chocolate uuid;
BEGIN
  SELECT id INTO v_miel_y_canela     FROM public.menu_items WHERE name = 'Miel y canela'      LIMIT 1;
  SELECT id INTO v_moreno            FROM public.menu_items WHERE name = 'MORENO'              LIMIT 1;
  SELECT id INTO v_la_creme          FROM public.menu_items WHERE name = 'La Creme'            LIMIT 1;
  SELECT id INTO v_is_this_chocolate FROM public.menu_items WHERE name = 'Is this chocolate?' LIMIT 1;

  IF v_miel_y_canela IS NOT NULL THEN
    INSERT INTO public.item_modifiers (item_id, name, options, is_required)
    VALUES
      (v_miel_y_canela,     'Tamaño', '[{"name":"Chico","price_change":0},{"name":"Grande","price_change":10}]'::jsonb, true),
      (v_moreno,            'Tamaño', '[{"name":"Chico","price_change":0},{"name":"Grande","price_change":10}]'::jsonb, true),
      (v_la_creme,          'Tamaño', '[{"name":"Chico","price_change":0},{"name":"Grande","price_change":10}]'::jsonb, true),
      (v_is_this_chocolate, 'Tamaño', '[{"name":"Chico","price_change":0},{"name":"Grande","price_change":10}]'::jsonb, true)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- 2. Catálogo de insumos
INSERT INTO public.inventory_items (name, unit, current_stock, minimum_stock)
VALUES
  ('Café molido',          'g',      0, 500),
  ('Leche',                'ml',     0, 1000),
  ('Agua filtrada',        'ml',     0, 2000),
  ('Miel de abeja',        'ml',     0, 200),
  ('Canela en polvo',      'g',      0, 50),
  ('Miel maple',           'ml',     0, 200),
  ('Sal de mar',           'g',      0, 50),
  ('Salsa de caramelo',    'ml',     0, 200),
  ('Sirope de vainilla',   'ml',     0, 200),
  ('Polvo de matcha',      'g',      0, 100),
  ('Mezcla Masala Chai',   'g',      0, 200),
  ('Agua tónica',          'ml',     0, 500),
  ('Naranja',              'piezas', 0, 10),
  ('Cardamomo',            'g',      0, 50),
  ('Cúrcuma',              'g',      0, 100),
  ('Miel de agave',        'ml',     0, 200),
  ('Algarroba en polvo',   'g',      0, 200),
  ('Extracto de vainilla', 'ml',     0, 100)
ON CONFLICT DO NOTHING;

-- 3. Recetas: ingredientes por ítem de menú
DO $$
DECLARE
  -- Ítems de menú
  v_espresso          uuid;
  v_cortado           uuid;
  v_capuccino         uuid;
  v_latte             uuid;
  v_matcha            uuid;
  v_masala_chai       uuid;
  v_latte_vainilla    uuid;
  v_miel_y_canela     uuid;
  v_moreno            uuid;
  v_la_creme          uuid;
  v_espresso_tonic    uuid;
  v_gold_milk         uuid;
  v_is_this_chocolate uuid;

  -- Insumos
  v_cafe_molido        uuid;
  v_leche              uuid;
  v_agua               uuid;
  v_miel_abeja         uuid;
  v_canela             uuid;
  v_miel_maple         uuid;
  v_sal_mar            uuid;
  v_salsa_caramelo     uuid;
  v_sirope_vainilla    uuid;
  v_polvo_matcha       uuid;
  v_mezcla_chai        uuid;
  v_agua_tonica        uuid;
  v_naranja            uuid;
  v_cardamomo          uuid;
  v_curcuma            uuid;
  v_miel_agave         uuid;
  v_algarroba          uuid;
  v_extracto_vainilla  uuid;
BEGIN
  -- Ítems
  SELECT id INTO v_espresso          FROM public.menu_items WHERE name = 'Espresso'            LIMIT 1;
  SELECT id INTO v_cortado           FROM public.menu_items WHERE name = 'Cortado'             LIMIT 1;
  SELECT id INTO v_capuccino         FROM public.menu_items WHERE name = 'Capuccino'           LIMIT 1;
  SELECT id INTO v_latte             FROM public.menu_items WHERE name = 'Latte'               LIMIT 1;
  SELECT id INTO v_matcha            FROM public.menu_items WHERE name = 'Matcha'              LIMIT 1;
  SELECT id INTO v_masala_chai       FROM public.menu_items WHERE name = 'Masala Chai'         LIMIT 1;
  SELECT id INTO v_latte_vainilla    FROM public.menu_items WHERE name = 'Latte Vainilla'      LIMIT 1;
  SELECT id INTO v_miel_y_canela     FROM public.menu_items WHERE name = 'Miel y canela'       LIMIT 1;
  SELECT id INTO v_moreno            FROM public.menu_items WHERE name = 'MORENO'              LIMIT 1;
  SELECT id INTO v_la_creme          FROM public.menu_items WHERE name = 'La Creme'            LIMIT 1;
  SELECT id INTO v_espresso_tonic    FROM public.menu_items WHERE name = 'Espresso tonic'      LIMIT 1;
  SELECT id INTO v_gold_milk         FROM public.menu_items WHERE name = 'Gold n'' Milk'       LIMIT 1;
  SELECT id INTO v_is_this_chocolate FROM public.menu_items WHERE name = 'Is this chocolate?'  LIMIT 1;

  -- Insumos
  SELECT id INTO v_cafe_molido        FROM public.inventory_items WHERE name = 'Café molido'          LIMIT 1;
  SELECT id INTO v_leche              FROM public.inventory_items WHERE name = 'Leche'                LIMIT 1;
  SELECT id INTO v_agua               FROM public.inventory_items WHERE name = 'Agua filtrada'        LIMIT 1;
  SELECT id INTO v_miel_abeja         FROM public.inventory_items WHERE name = 'Miel de abeja'        LIMIT 1;
  SELECT id INTO v_canela             FROM public.inventory_items WHERE name = 'Canela en polvo'      LIMIT 1;
  SELECT id INTO v_miel_maple         FROM public.inventory_items WHERE name = 'Miel maple'           LIMIT 1;
  SELECT id INTO v_sal_mar            FROM public.inventory_items WHERE name = 'Sal de mar'           LIMIT 1;
  SELECT id INTO v_salsa_caramelo     FROM public.inventory_items WHERE name = 'Salsa de caramelo'    LIMIT 1;
  SELECT id INTO v_sirope_vainilla    FROM public.inventory_items WHERE name = 'Sirope de vainilla'   LIMIT 1;
  SELECT id INTO v_polvo_matcha       FROM public.inventory_items WHERE name = 'Polvo de matcha'      LIMIT 1;
  SELECT id INTO v_mezcla_chai        FROM public.inventory_items WHERE name = 'Mezcla Masala Chai'   LIMIT 1;
  SELECT id INTO v_agua_tonica        FROM public.inventory_items WHERE name = 'Agua tónica'          LIMIT 1;
  SELECT id INTO v_naranja            FROM public.inventory_items WHERE name = 'Naranja'              LIMIT 1;
  SELECT id INTO v_cardamomo          FROM public.inventory_items WHERE name = 'Cardamomo'            LIMIT 1;
  SELECT id INTO v_curcuma            FROM public.inventory_items WHERE name = 'Cúrcuma'              LIMIT 1;
  SELECT id INTO v_miel_agave         FROM public.inventory_items WHERE name = 'Miel de agave'        LIMIT 1;
  SELECT id INTO v_algarroba          FROM public.inventory_items WHERE name = 'Algarroba en polvo'   LIMIT 1;
  SELECT id INTO v_extracto_vainilla  FROM public.inventory_items WHERE name = 'Extracto de vainilla' LIMIT 1;

  -- Solo insertar recetas si los ítems y los insumos existen
  IF v_espresso IS NULL OR v_cafe_molido IS NULL THEN RETURN; END IF;

  -- Espresso (18 g café, 30 ml agua)
  INSERT INTO public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) VALUES
    (v_espresso, v_cafe_molido, 18),
    (v_espresso, v_agua,        30)
  ON CONFLICT DO NOTHING;

  -- Cortado (18 g café, 30 ml agua, 60 ml leche)
  INSERT INTO public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) VALUES
    (v_cortado, v_cafe_molido, 18),
    (v_cortado, v_agua,        30),
    (v_cortado, v_leche,       60)
  ON CONFLICT DO NOTHING;

  -- Capuccino (18 g café, 30 ml agua, 120 ml leche)
  INSERT INTO public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) VALUES
    (v_capuccino, v_cafe_molido, 18),
    (v_capuccino, v_agua,        30),
    (v_capuccino, v_leche,      120)
  ON CONFLICT DO NOTHING;

  -- Latte (18 g café, 30 ml agua, 180 ml leche)
  INSERT INTO public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) VALUES
    (v_latte, v_cafe_molido, 18),
    (v_latte, v_agua,        30),
    (v_latte, v_leche,      180)
  ON CONFLICT DO NOTHING;

  -- Matcha (4 g polvo matcha, 200 ml leche, 30 ml agua)
  INSERT INTO public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) VALUES
    (v_matcha, v_polvo_matcha,   4),
    (v_matcha, v_leche,        200),
    (v_matcha, v_agua,          30)
  ON CONFLICT DO NOTHING;

  -- Masala Chai (10 g mezcla, 180 ml leche, 60 ml agua)
  INSERT INTO public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) VALUES
    (v_masala_chai, v_mezcla_chai, 10),
    (v_masala_chai, v_leche,      180),
    (v_masala_chai, v_agua,        60)
  ON CONFLICT DO NOTHING;

  -- Latte Vainilla (18 g café, 30 ml agua, 180 ml leche, 20 ml sirope vainilla)
  INSERT INTO public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) VALUES
    (v_latte_vainilla, v_cafe_molido,     18),
    (v_latte_vainilla, v_agua,            30),
    (v_latte_vainilla, v_leche,          180),
    (v_latte_vainilla, v_sirope_vainilla, 20)
  ON CONFLICT DO NOTHING;

  -- Miel y canela (18 g café, 30 ml agua, 180 ml leche, 20 ml miel abeja, 2 g canela)
  INSERT INTO public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) VALUES
    (v_miel_y_canela, v_cafe_molido, 18),
    (v_miel_y_canela, v_agua,        30),
    (v_miel_y_canela, v_leche,      180),
    (v_miel_y_canela, v_miel_abeja,  20),
    (v_miel_y_canela, v_canela,       2)
  ON CONFLICT DO NOTHING;

  -- MORENO (18 g café, 30 ml agua, 180 ml leche, 20 ml miel maple, 1 g sal de mar)
  INSERT INTO public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) VALUES
    (v_moreno, v_cafe_molido, 18),
    (v_moreno, v_agua,        30),
    (v_moreno, v_leche,      180),
    (v_moreno, v_miel_maple,  20),
    (v_moreno, v_sal_mar,      1)
  ON CONFLICT DO NOTHING;

  -- La Creme (18 g café, 30 ml agua, 180 ml leche, 20 ml salsa caramelo)
  INSERT INTO public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) VALUES
    (v_la_creme, v_cafe_molido,    18),
    (v_la_creme, v_agua,           30),
    (v_la_creme, v_leche,         180),
    (v_la_creme, v_salsa_caramelo, 20)
  ON CONFLICT DO NOTHING;

  -- Espresso tonic (18 g café, 30 ml agua, 150 ml agua tónica, 0.5 naranja, 1 g cardamomo)
  INSERT INTO public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) VALUES
    (v_espresso_tonic, v_cafe_molido,  18),
    (v_espresso_tonic, v_agua,         30),
    (v_espresso_tonic, v_agua_tonica, 150),
    (v_espresso_tonic, v_naranja,     0.5),
    (v_espresso_tonic, v_cardamomo,     1)
  ON CONFLICT DO NOTHING;

  -- Gold n' Milk (3 g cúrcuma, 15 ml miel agave, 1 g canela, 200 ml leche)
  INSERT INTO public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) VALUES
    (v_gold_milk, v_curcuma,    3),
    (v_gold_milk, v_miel_agave, 15),
    (v_gold_milk, v_canela,      1),
    (v_gold_milk, v_leche,     200)
  ON CONFLICT DO NOTHING;

  -- Is this chocolate? (15 g algarroba, 180 ml leche, 60 ml agua, 5 ml extracto vainilla)
  INSERT INTO public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) VALUES
    (v_is_this_chocolate, v_algarroba,          15),
    (v_is_this_chocolate, v_leche,             180),
    (v_is_this_chocolate, v_agua,               60),
    (v_is_this_chocolate, v_extracto_vainilla,   5)
  ON CONFLICT DO NOTHING;
END;
$$;
