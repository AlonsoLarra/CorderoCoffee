import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type StockPayload = {
  itemId: string;
  stockQuantity: number | null;
  trackStock: boolean;
  lowStockAlert?: number;
};

async function ensureAdmin() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const typedProfile = profile as unknown as { role?: string } | null;

  const allowedRoles = ["admin", "super_admin"];
  if (!typedProfile || !allowedRoles.includes(typedProfile.role ?? "")) {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }

  return { supabase };
}

export async function PATCH(request: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;

  let payload: StockPayload;
  try {
    payload = (await request.json()) as StockPayload;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!payload.itemId) {
    return NextResponse.json({ error: "itemId requerido." }, { status: 400 });
  }

  const menuTable = auth.supabase.from("menu_items") as unknown as {
    update: (v: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
  };
  const { error } = await menuTable
    .update({
      track_stock: payload.trackStock,
      stock_quantity: payload.trackStock ? (payload.stockQuantity ?? null) : null,
      low_stock_alert: payload.lowStockAlert ?? 5,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.itemId);

  if (error) {
    return NextResponse.json({ error: "No pudimos actualizar el inventario." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
