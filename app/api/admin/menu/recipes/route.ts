import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ensureAdmin() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const typedProfile = profile as unknown as { role?: string } | null;
  if (!typedProfile || (typedProfile.role !== "admin" && typedProfile.role !== "super_admin")) {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }

  return { supabaseAdmin: createSupabaseAdminClient() };
}

export async function GET() {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabaseAdmin
    .from("menu_item_ingredients")
    .select("menu_item_id,inventory_item_id,quantity,menu_items(name)");

  if (error) {
    return NextResponse.json({ error: "No pudimos obtener las recetas." }, { status: 500 });
  }

  type RawRow = {
    menu_item_id: string;
    inventory_item_id: string;
    quantity: number;
    menu_items: { name: string } | null;
  };

  const recipes = ((data ?? []) as unknown as RawRow[]).map((row) => ({
    menu_item_id: row.menu_item_id,
    inventory_item_id: row.inventory_item_id,
    quantity: row.quantity,
    menu_item_name: row.menu_items?.name ?? "",
  }));

  return NextResponse.json({ recipes });
}
