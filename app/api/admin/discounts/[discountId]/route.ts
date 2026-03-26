import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const update: { is_active?: boolean; max_uses?: number | null; expires_at?: string | null } = {};
  if (typeof payload.isActive === "boolean") update.is_active = payload.isActive;
  if ("maxUses" in payload) update.max_uses = payload.maxUses ?? null;
  if ("expiresAt" in payload) update.expires_at = payload.expiresAt ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (auth.supabase as any)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (auth.supabase as any)
    .from("discount_codes")
    .update({ is_active: false })
    .eq("id", context.params.discountId);

  if (error) {
    return NextResponse.json({ error: "No pudimos eliminar el descuento." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
