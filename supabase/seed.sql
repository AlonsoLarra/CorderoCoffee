insert into public.menu_categories (name, sort_order, is_active)
values
  ('Cafe caliente', 1, true),
  ('Cafe frio', 2, true),
  ('Panaderia', 3, true),
  ('Barra tradicional', 4, true),
  ('Café', 5, true),
  ('Non Coffee', 6, true)
on conflict do nothing;

with category_hot as (
  select id from public.menu_categories where name = 'Cafe caliente' limit 1
),
category_cold as (
  select id from public.menu_categories where name = 'Cafe frio' limit 1
),
category_traditional as (
  select id from public.menu_categories where name = 'Barra tradicional' limit 1
),
category_cafe as (
  select id from public.menu_categories where name = 'Café' limit 1
),
category_non_coffee as (
  select id from public.menu_categories where name = 'Non Coffee' limit 1
)
insert into public.menu_items (category_id, name, description, price, is_active, sort_order)
values
  ((select id from category_hot), 'Latte de la casa', 'Espresso doble con leche vaporizada', 75, true, 1),
  ((select id from category_hot), 'Americano', 'Espresso con agua filtrada', 48, true, 2),
  ((select id from category_cold), 'Cold Brew', 'Extraccion lenta, servido en frio', 70, true, 1),
  -- Barra tradicional
  ((select id from category_traditional), 'Espresso', NULL, 45, true, 1),
  ((select id from category_traditional), 'Cortado', NULL, 55, true, 2),
  ((select id from category_traditional), 'Capuccino', NULL, 70, true, 3),
  ((select id from category_traditional), 'Latte', NULL, 70, true, 4),
  ((select id from category_traditional), 'Matcha', NULL, 65, true, 5),
  ((select id from category_traditional), 'Masala Chai', NULL, 60, true, 6),
  -- Café
  ((select id from category_cafe), 'Latte Vainilla', NULL, 85, true, 1),
  ((select id from category_cafe), 'Miel y canela', 'Espresso doble con miel de abeja, canela en polvo y leche', 90, true, 2),
  ((select id from category_cafe), 'MORENO', 'Miel maple + con sal de mar, espresso doble + leche', 90, true, 3),
  ((select id from category_cafe), 'La Creme', 'Espresso doble con salsa de caramelo con mantequilla y leche cremosa', 90, true, 4),
  ((select id from category_cafe), 'Espresso tonic', 'Espresso doble, agua tónica y naranja cardamomo', 85, true, 5),
  -- Non Coffee
  ((select id from category_non_coffee), 'Gold n'' Milk', 'Cúrcuma endulzada con miel de agave, un toque de canela y leche a tu elección', 90, true, 1),
  ((select id from category_non_coffee), 'Is this chocolate?', 'Autentica algarroba a base de agua o leche y endulzada con un poco de vainilla (pruébalo con espresso)', 100, true, 2)
on conflict do nothing;

-- ───────────────────────────────────────────────
-- Modificadores de tamaño (dos precios = Chico / Grande)
-- ───────────────────────────────────────────────
do $$
declare
  v_miel_y_canela     uuid;
  v_moreno            uuid;
  v_la_creme          uuid;
  v_is_this_chocolate uuid;
begin
  select id into v_miel_y_canela     from public.menu_items where name = 'Miel y canela'      limit 1;
  select id into v_moreno            from public.menu_items where name = 'MORENO'              limit 1;
  select id into v_la_creme          from public.menu_items where name = 'La Creme'            limit 1;
  select id into v_is_this_chocolate from public.menu_items where name = 'Is this chocolate?' limit 1;

  insert into public.item_modifiers (item_id, name, options, is_required)
  values
    (v_miel_y_canela,     'Tamaño', '[{"name":"Chico","price_change":0},{"name":"Grande","price_change":10}]'::jsonb, true),
    (v_moreno,            'Tamaño', '[{"name":"Chico","price_change":0},{"name":"Grande","price_change":10}]'::jsonb, true),
    (v_la_creme,          'Tamaño', '[{"name":"Chico","price_change":0},{"name":"Grande","price_change":10}]'::jsonb, true),
    (v_is_this_chocolate, 'Tamaño', '[{"name":"Chico","price_change":0},{"name":"Grande","price_change":10}]'::jsonb, true)
  on conflict do nothing;
end;
$$;

-- ───────────────────────────────────────────────
-- Catálogo de insumos
-- ───────────────────────────────────────────────
insert into public.inventory_items (name, unit, current_stock, minimum_stock)
values
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
on conflict do nothing;

-- ───────────────────────────────────────────────
-- Recetas (insumos por ítem de menú)
-- ───────────────────────────────────────────────
do $$
declare
  v_espresso          uuid; v_cortado           uuid; v_capuccino         uuid;
  v_latte             uuid; v_matcha            uuid; v_masala_chai       uuid;
  v_latte_vainilla    uuid; v_miel_y_canela     uuid; v_moreno            uuid;
  v_la_creme          uuid; v_espresso_tonic    uuid; v_gold_milk         uuid;
  v_is_this_chocolate uuid;

  v_cafe_molido       uuid; v_leche             uuid; v_agua              uuid;
  v_miel_abeja        uuid; v_canela            uuid; v_miel_maple        uuid;
  v_sal_mar           uuid; v_salsa_caramelo    uuid; v_sirope_vainilla   uuid;
  v_polvo_matcha      uuid; v_mezcla_chai       uuid; v_agua_tonica       uuid;
  v_naranja           uuid; v_cardamomo         uuid; v_curcuma           uuid;
  v_miel_agave        uuid; v_algarroba         uuid; v_extracto_vainilla uuid;
begin
  select id into v_espresso          from public.menu_items where name = 'Espresso'            limit 1;
  select id into v_cortado           from public.menu_items where name = 'Cortado'             limit 1;
  select id into v_capuccino         from public.menu_items where name = 'Capuccino'           limit 1;
  select id into v_latte             from public.menu_items where name = 'Latte'               limit 1;
  select id into v_matcha            from public.menu_items where name = 'Matcha'              limit 1;
  select id into v_masala_chai       from public.menu_items where name = 'Masala Chai'         limit 1;
  select id into v_latte_vainilla    from public.menu_items where name = 'Latte Vainilla'      limit 1;
  select id into v_miel_y_canela     from public.menu_items where name = 'Miel y canela'       limit 1;
  select id into v_moreno            from public.menu_items where name = 'MORENO'              limit 1;
  select id into v_la_creme          from public.menu_items where name = 'La Creme'            limit 1;
  select id into v_espresso_tonic    from public.menu_items where name = 'Espresso tonic'      limit 1;
  select id into v_gold_milk         from public.menu_items where name = 'Gold n'' Milk'       limit 1;
  select id into v_is_this_chocolate from public.menu_items where name = 'Is this chocolate?'  limit 1;

  select id into v_cafe_molido        from public.inventory_items where name = 'Café molido'          limit 1;
  select id into v_leche              from public.inventory_items where name = 'Leche'                limit 1;
  select id into v_agua               from public.inventory_items where name = 'Agua filtrada'        limit 1;
  select id into v_miel_abeja         from public.inventory_items where name = 'Miel de abeja'        limit 1;
  select id into v_canela             from public.inventory_items where name = 'Canela en polvo'      limit 1;
  select id into v_miel_maple         from public.inventory_items where name = 'Miel maple'           limit 1;
  select id into v_sal_mar            from public.inventory_items where name = 'Sal de mar'           limit 1;
  select id into v_salsa_caramelo     from public.inventory_items where name = 'Salsa de caramelo'    limit 1;
  select id into v_sirope_vainilla    from public.inventory_items where name = 'Sirope de vainilla'   limit 1;
  select id into v_polvo_matcha       from public.inventory_items where name = 'Polvo de matcha'      limit 1;
  select id into v_mezcla_chai        from public.inventory_items where name = 'Mezcla Masala Chai'   limit 1;
  select id into v_agua_tonica        from public.inventory_items where name = 'Agua tónica'          limit 1;
  select id into v_naranja            from public.inventory_items where name = 'Naranja'              limit 1;
  select id into v_cardamomo          from public.inventory_items where name = 'Cardamomo'            limit 1;
  select id into v_curcuma            from public.inventory_items where name = 'Cúrcuma'              limit 1;
  select id into v_miel_agave         from public.inventory_items where name = 'Miel de agave'        limit 1;
  select id into v_algarroba          from public.inventory_items where name = 'Algarroba en polvo'   limit 1;
  select id into v_extracto_vainilla  from public.inventory_items where name = 'Extracto de vainilla' limit 1;

  -- Espresso
  insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) values
    (v_espresso, v_cafe_molido, 18), (v_espresso, v_agua, 30) on conflict do nothing;

  -- Cortado
  insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) values
    (v_cortado, v_cafe_molido, 18), (v_cortado, v_agua, 30), (v_cortado, v_leche, 60) on conflict do nothing;

  -- Capuccino
  insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) values
    (v_capuccino, v_cafe_molido, 18), (v_capuccino, v_agua, 30), (v_capuccino, v_leche, 120) on conflict do nothing;

  -- Latte
  insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) values
    (v_latte, v_cafe_molido, 18), (v_latte, v_agua, 30), (v_latte, v_leche, 180) on conflict do nothing;

  -- Matcha
  insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) values
    (v_matcha, v_polvo_matcha, 4), (v_matcha, v_leche, 200), (v_matcha, v_agua, 30) on conflict do nothing;

  -- Masala Chai
  insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) values
    (v_masala_chai, v_mezcla_chai, 10), (v_masala_chai, v_leche, 180), (v_masala_chai, v_agua, 60) on conflict do nothing;

  -- Latte Vainilla
  insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) values
    (v_latte_vainilla, v_cafe_molido, 18), (v_latte_vainilla, v_agua, 30),
    (v_latte_vainilla, v_leche, 180),      (v_latte_vainilla, v_sirope_vainilla, 20) on conflict do nothing;

  -- Miel y canela
  insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) values
    (v_miel_y_canela, v_cafe_molido, 18), (v_miel_y_canela, v_agua, 30),
    (v_miel_y_canela, v_leche, 180),      (v_miel_y_canela, v_miel_abeja, 20),
    (v_miel_y_canela, v_canela, 2) on conflict do nothing;

  -- MORENO
  insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) values
    (v_moreno, v_cafe_molido, 18), (v_moreno, v_agua, 30),
    (v_moreno, v_leche, 180),      (v_moreno, v_miel_maple, 20),
    (v_moreno, v_sal_mar, 1) on conflict do nothing;

  -- La Creme
  insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) values
    (v_la_creme, v_cafe_molido, 18),   (v_la_creme, v_agua, 30),
    (v_la_creme, v_leche, 180),        (v_la_creme, v_salsa_caramelo, 20) on conflict do nothing;

  -- Espresso tonic
  insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) values
    (v_espresso_tonic, v_cafe_molido, 18),  (v_espresso_tonic, v_agua, 30),
    (v_espresso_tonic, v_agua_tonica, 150), (v_espresso_tonic, v_naranja, 0.5),
    (v_espresso_tonic, v_cardamomo, 1) on conflict do nothing;

  -- Gold n' Milk
  insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) values
    (v_gold_milk, v_curcuma, 3),  (v_gold_milk, v_miel_agave, 15),
    (v_gold_milk, v_canela, 1),   (v_gold_milk, v_leche, 200) on conflict do nothing;

  -- Is this chocolate?
  insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity) values
    (v_is_this_chocolate, v_algarroba, 15),          (v_is_this_chocolate, v_leche, 180),
    (v_is_this_chocolate, v_agua, 60),               (v_is_this_chocolate, v_extracto_vainilla, 5)
  on conflict do nothing;
end;
$$;

insert into public.profiles (id, role)
select au.id, 'super_admin'::public.role
from auth.users au
where au.email = 'alonzo.larraguibel@gmail.com'
on conflict (id) do update set role = excluded.role;
