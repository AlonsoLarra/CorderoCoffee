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

type UpdatePayload = {
  name?: string;
  unit?: string;
  currentStock?: number;
  minimumStock?: number | null;
};

export async function PATCH(request: Request, context: { params: { itemId: string } }) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;

  let payload: UpdatePayload;
  try {
    payload = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof payload.name === "string" && payload.name.trim()) {
    updates.name = payload.name.trim();
  }
  if (typeof payload.unit === "string" && payload.unit.trim()) {
    updates.unit = payload.unit.trim();
  }
  if (typeof payload.currentStock === "number" && payload.currentStock >= 0) {
    updates.current_stock = payload.currentStock;
  }
  if ("minimumStock" in payload) {
    updates.minimum_stock =
      typeof payload.minimumStock === "number" && payload.minimumStock >= 0
        ? payload.minimumStock
        : null;
  }

  const { data, error } = await auth.supabaseAdmin
    .from("inventory_items")
    .update(updates)
    .eq("id", context.params.itemId)
    .select("id,name,unit,current_stock,minimum_stock,created_at,updated_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "No pudimos actualizar el insumo." }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

export async function DELETE(_request: Request, context: { params: { itemId: string } }) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;

  const { error } = await auth.supabaseAdmin
    .from("inventory_items")
    .delete()
    .eq("id", context.params.itemId);

  if (error) {
    return NextResponse.json({ error: "No pudimos eliminar el insumo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
