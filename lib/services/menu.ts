import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MenuItemLite = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

export type MenuCategoryWithItems = {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItemLite[];
};

type RawCategory = {
  id: string;
  name: string;
  sort_order: number;
};

type RawItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  sort_order: number;
};

export async function getActiveMenu(): Promise<MenuCategoryWithItems[]> {
  const supabase = createSupabaseServerClient();

  const [{ data: categories, error: categoriesError }, { data: items, error: itemsError }] =
    await Promise.all([
      supabase
        .from("menu_categories")
        .select("id,name,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("menu_items")
        .select("id,category_id,name,description,price,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (categoriesError) {
    throw categoriesError;
  }

  if (itemsError) {
    throw itemsError;
  }

  const typedCategories = (categories ?? []) as unknown as RawCategory[];
  const typedItems = (items ?? []) as unknown as RawItem[];

  return typedCategories.map((category) => {
    const categoryItems = typedItems
      .filter((item) => item.category_id === category.id)
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
      }));

    return {
      id: category.id,
      name: category.name,
      sortOrder: category.sort_order,
      items: categoryItems,
    };
  });
}
