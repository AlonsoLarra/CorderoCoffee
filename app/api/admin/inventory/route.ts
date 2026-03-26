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
    .from("inventory_items")
    .select("id,name,unit,current_stock,minimum_stock,created_at,updated_at")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "No pudimos obtener el inventario." }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

type CreatePayload = {
  name: string;
  unit: string;
  currentStock: number;
  minimumStock?: number | null;
};

export async function POST(request: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;

  let payload: CreatePayload;
  try {
    payload = (await request.json()) as CreatePayload;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!payload.name?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido." }, { status: 400 });
  }
  if (!payload.unit?.trim()) {
    return NextResponse.json({ error: "La unidad es requerida." }, { status: 400 });
  }
  if (typeof payload.currentStock !== "number" || payload.currentStock < 0) {
    return NextResponse.json({ error: "Stock inicial invalido." }, { status: 400 });
  }

  type InventoryTable = {
    insert: (values: Record<string, unknown>) => {
      select: (columns: string) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
  const inventoryTable = auth.supabaseAdmin.from("inventory_items") as unknown as InventoryTable;

  const { data, error } = await inventoryTable
    .insert({
      name: payload.name.trim(),
      unit: payload.unit.trim(),
      current_stock: payload.currentStock,
      minimum_stock: payload.minimumStock ?? null,
    })
    .select("id,name,unit,current_stock,minimum_stock,created_at,updated_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "No pudimos crear el insumo." }, { status: 500 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
}
