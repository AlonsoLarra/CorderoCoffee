insert into public.menu_categories (name, sort_order, is_active)
values
  ('Cafe caliente', 1, true),
  ('Cafe frio', 2, true),
  ('Panaderia', 3, true)
on conflict do nothing;

with category_hot as (
  select id from public.menu_categories where name = 'Cafe caliente' limit 1
),
category_cold as (
  select id from public.menu_categories where name = 'Cafe frio' limit 1
)
insert into public.menu_items (category_id, name, description, price, is_active, sort_order)
values
  ((select id from category_hot), 'Latte de la casa', 'Espresso doble con leche vaporizada', 75, true, 1),
  ((select id from category_hot), 'Americano', 'Espresso con agua filtrada', 48, true, 2),
  ((select id from category_cold), 'Cold Brew', 'Extraccion lenta, servido en frio', 70, true, 1)
on conflict do nothing;

insert into public.profiles (id, role)
select au.id, 'super_admin'::public.role
from auth.users au
where au.email = 'alonzo.larraguibel@gmail.com'
on conflict (id) do update set role = excluded.role;
