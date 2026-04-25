create temporary table menu_category_duplicates on commit drop as
with ranked_categories as (
  select
    id,
    first_value(id) over (
      partition by lower(btrim(name))
      order by is_active desc, sort_order asc, created_at asc, id asc
    ) as canonical_id,
    row_number() over (
      partition by lower(btrim(name))
      order by is_active desc, sort_order asc, created_at asc, id asc
    ) as row_number_in_group
  from public.menu_categories
)
select id, canonical_id
from ranked_categories
where row_number_in_group > 1;

update public.menu_items as menu_items
set category_id = menu_category_duplicates.canonical_id
from menu_category_duplicates
where menu_items.category_id = menu_category_duplicates.id;

delete from public.menu_categories as menu_categories
using menu_category_duplicates
where menu_categories.id = menu_category_duplicates.id;

create unique index if not exists menu_categories_unique_normalized_name_idx
on public.menu_categories ((lower(btrim(name))));