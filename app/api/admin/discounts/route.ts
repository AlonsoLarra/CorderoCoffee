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

// GET /api/admin/discounts — list all discount codes
export async function GET() {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "No pudimos cargar los descuentos." }, { status: 500 });
  }

  return NextResponse.json({ discounts: data ?? [] });
}

type DiscountPayload = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
};

// POST /api/admin/discounts — create discount code
export async function POST(request: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;

  let payload: DiscountPayload;
  try {
    payload = (await request.json()) as DiscountPayload;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!payload.code?.trim()) {
    return NextResponse.json({ error: "El código es requerido." }, { status: 400 });
  }

  if (!["percent", "fixed"].includes(payload.type)) {
    return NextResponse.json({ error: "Tipo de descuento invalido." }, { status: 400 });
  }

  const value = Number(payload.value);
  if (isNaN(value) || value <= 0) {
    return NextResponse.json({ error: "Valor de descuento invalido." }, { status: 400 });
  }

  if (payload.type === "percent" && value > 100) {
    return NextResponse.json({ error: "El porcentaje no puede ser mayor a 100." }, { status: 400 });
  }

  const { data: discount, error } = await auth.supabase
    .from("discount_codes")
    .insert({
      code: payload.code.trim().toUpperCase(),
      type: payload.type,
      value,
      max_uses: payload.maxUses ?? null,
      expires_at: payload.expiresAt ?? null,
      is_active: payload.isActive ?? true,
    } as Record<string, unknown>)
    .select("*")
    .maybeSingle();

  if (error) {
    if ((error as unknown as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "Ya existe un código con ese nombre." }, { status: 409 });
    }
    return NextResponse.json({ error: "No pudimos crear el descuento." }, { status: 500 });
  }

  return NextResponse.json({ discount });
}
