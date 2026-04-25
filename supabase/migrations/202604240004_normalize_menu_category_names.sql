update public.menu_categories
set name = regexp_replace(btrim(name), '\\s+', ' ', 'g')
where name <> regexp_replace(btrim(name), '\\s+', ' ', 'g');

with ranked_categories as (
  select
    id,
    first_value(id) over (
      partition by lower(regexp_replace(btrim(name), '\\s+', ' ', 'g'))
      order by is_active desc, sort_order asc, created_at asc, id asc
    ) as canonical_id,
    row_number() over (
      partition by lower(regexp_replace(btrim(name), '\\s+', ' ', 'g'))
      order by is_active desc, sort_order asc, created_at asc, id asc
    ) as row_number_in_group
  from public.menu_categories
), duplicate_categories as (
  select id, canonical_id
  from ranked_categories
  where row_number_in_group > 1
)
update public.menu_items as menu_items
set category_id = duplicate_categories.canonical_id
from duplicate_categories
where menu_items.category_id = duplicate_categories.id;

delete from public.menu_categories as menu_categories
using (
  with ranked_categories as (
    select
      id,
      row_number() over (
        partition by lower(regexp_replace(btrim(name), '\\s+', ' ', 'g'))
        order by is_active desc, sort_order asc, created_at asc, id asc
      ) as row_number_in_group
    from public.menu_categories
  )
  select id
  from ranked_categories
  where row_number_in_group > 1
) as duplicate_categories
where menu_categories.id = duplicate_categories.id;

drop index if exists public.menu_categories_unique_normalized_name_idx;

create unique index if not exists menu_categories_unique_normalized_name_idx
on public.menu_categories ((lower(regexp_replace(btrim(name), '\\s+', ' ', 'g'))));