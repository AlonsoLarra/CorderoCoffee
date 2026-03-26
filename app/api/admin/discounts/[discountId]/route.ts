import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type DiscountUpdate = Database["public"]["Tables"]["discount_codes"]["Update"];

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

// PATCH /api/admin/discounts/[discountId] — toggle active or update
export async function PATCH(request: Request, context: { params: { discountId: string } }) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;

  let payload: Partial<{ isActive: boolean; maxUses: number | null; expiresAt: string | null }>;
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const update: DiscountUpdate = {};
  if (typeof payload.isActive === "boolean") update.is_active = payload.isActive;
  if ("maxUses" in payload) update.max_uses = payload.maxUses ?? null;
  if ("expiresAt" in payload) update.expires_at = payload.expiresAt ?? null;

  const { error } = await auth.supabase
    .from("discount_codes")
    .update(update)
    .eq("id", context.params.discountId);

  if (error) {
    return NextResponse.json({ error: "No pudimos actualizar el descuento." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/discounts/[discountId]
export async function DELETE(_request: Request, context: { params: { discountId: string } }) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;

  const deleteUpdate: DiscountUpdate = { is_active: false };
  const { error } = await auth.supabase
    .from("discount_codes")
    .update(deleteUpdate)
    .eq("id", context.params.discountId);

  if (error) {
    return NextResponse.json({ error: "No pudimos eliminar el descuento." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
