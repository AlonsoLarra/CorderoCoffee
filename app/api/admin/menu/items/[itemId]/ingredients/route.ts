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

export async function GET(_request: Request, context: { params: { itemId: string } }) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabaseAdmin
    .from("menu_item_ingredients")
    .select("id,menu_item_id,inventory_item_id,quantity,inventory_items(id,name,unit,current_stock,minimum_stock)")
    .eq("menu_item_id", context.params.itemId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "No pudimos obtener los ingredientes." }, { status: 500 });
  }

  return NextResponse.json({ ingredients: data ?? [] });
}

type IngredientLine = {
  inventoryItemId: string;
  quantity: number;
};

type PutPayload = {
  ingredients: IngredientLine[];
};

export async function PUT(request: Request, context: { params: { itemId: string } }) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;

  let payload: PutPayload;
  try {
    payload = (await request.json()) as PutPayload;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!Array.isArray(payload.ingredients)) {
    return NextResponse.json({ error: "Se requiere un arreglo de ingredientes." }, { status: 400 });
  }

  for (const line of payload.ingredients) {
    if (!line.inventoryItemId || typeof line.quantity !== "number" || line.quantity <= 0) {
      return NextResponse.json(
        { error: "Cada ingrediente debe tener inventoryItemId y quantity mayor a cero." },
        { status: 400 },
      );
    }
  }

  // Reemplazar toda la receta: borrar existentes e insertar nuevas
  const { error: deleteError } = await auth.supabaseAdmin
    .from("menu_item_ingredients")
    .delete()
    .eq("menu_item_id", context.params.itemId);

  if (deleteError) {
    return NextResponse.json({ error: "No pudimos actualizar la receta." }, { status: 500 });
  }

  if (payload.ingredients.length === 0) {
    return NextResponse.json({ ingredients: [] });
  }

  const rows = payload.ingredients.map((line) => ({
    menu_item_id: context.params.itemId,
    inventory_item_id: line.inventoryItemId,
    quantity: line.quantity,
  }));

  const { data, error: insertError } = await auth.supabaseAdmin
    .from("menu_item_ingredients")
    .insert(rows)
    .select("id,menu_item_id,inventory_item_id,quantity,inventory_items(id,name,unit,current_stock,minimum_stock)");

  if (insertError) {
    return NextResponse.json({ error: "No pudimos guardar la receta." }, { status: 500 });
  }

  return NextResponse.json({ ingredients: data ?? [] });
}
