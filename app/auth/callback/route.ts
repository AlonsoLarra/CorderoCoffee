import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code"); // PKCE flow
  const token_hash = searchParams.get("token_hash"); // OTP flow
  const type = searchParams.get("type");

  const supabase = createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/pedido`);
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "email",
    });
    if (!error) {
      return NextResponse.redirect(`${origin}/pedido`);
    }
  }

  return NextResponse.redirect(
    `${origin}/acceso?error=${encodeURIComponent("El enlace de confirmación no es válido o ya expiró.")}`,
  );
}
