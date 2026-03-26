import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ensureStaff() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const typedProfile = profile as unknown as { role?: string } | null;

  const allowedRoles = ["admin", "super_admin", "employee"];
  if (!typedProfile || !allowedRoles.includes(typedProfile.role ?? "")) {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }

  return { supabase };
}

// GET /api/admin/shifts/active — get the currently open shift (if any)
export async function GET() {
  const auth = await ensureStaff();
  if ("error" in auth) return auth.error;

  const { data: shift } = await auth.supabase
    .from("shifts")
    .select("*")
    .eq("status", "open")
    .maybeSingle();

  return NextResponse.json({ shift: shift ?? null });
}
