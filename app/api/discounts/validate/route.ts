import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST /api/discounts/validate — validate a discount code and return the discount
export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();

  // Must be authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let payload: { code: string; subtotal: number };
  try {
    payload = (await request.json()) as { code: string; subtotal: number };
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!payload.code?.trim()) {
    return NextResponse.json({ error: "Código requerido." }, { status: 400 });
  }

  const { data: rawCode } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("code", payload.code.trim().toUpperCase())
    .eq("is_active", true)
    .maybeSingle();

  if (!rawCode) {
    return NextResponse.json({ error: "Código inválido o inactivo." }, { status: 404 });
  }

  type CodeRow = {
    id: string;
    code: string;
    type: "percent" | "fixed";
    value: number;
    max_uses: number | null;
    used_count: number;
    expires_at: string | null;
  };

  const code = rawCode as unknown as CodeRow;

  // Check expiry
  if (code.expires_at && new Date(code.expires_at) < new Date()) {
    return NextResponse.json({ error: "El código ha expirado." }, { status: 400 });
  }

  // Check max uses
  if (code.max_uses !== null && code.used_count >= code.max_uses) {
    return NextResponse.json({ error: "El código ya alcanzó su límite de usos." }, { status: 400 });
  }

  const subtotal = Number(payload.subtotal ?? 0);
  const discountAmount =
    code.type === "percent"
      ? Math.round((subtotal * Number(code.value)) / 100 * 100) / 100
      : Math.min(Number(code.value), subtotal);

  return NextResponse.json({
    codeId: code.id,
    code: code.code,
    type: code.type,
    value: Number(code.value),
    discountAmount,
  });
}
