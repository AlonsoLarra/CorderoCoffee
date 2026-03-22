insert into public.menu_categories (name, sort_order, is_active)
values
  ('Cafe caliente', 1, true),
  ('Cafe frio', 2, true),
  ('Panaderia', 3, true)
on conflict do nothing;
  ('Barra tradicional', 4, true),
  ('Café', 5, true),
  ('Non Coffee', 6, true)
on conflict do nothing;

with category_hot as (
  select id from public.menu_categories where name = 'Cafe caliente' limit 1
),
category_cold as (
  select id from public.menu_categories where name = 'Cafe frio' limit 1
)
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
  ((select id from category_cold), 'Cold Brew', 'Extraccion lenta, servido en frio', 70, true, 1)
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

insert into public.profiles (id, role)
select au.id, 'super_admin'::public.role
from auth.users au
where au.email = 'alonzo.larraguibel@gmail.com'
on conflict (id) do update set role = excluded.role;
