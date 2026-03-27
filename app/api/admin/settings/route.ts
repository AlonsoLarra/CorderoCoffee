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

  return { supabase, userId: user.id };
}

const VALID_KEYS = [
  "minimum_cash_in_drawer",
  "cash_drop_threshold",
  "max_orders_after_threshold",
  "store_open_time",
  "store_close_time",
  "blind_close_enabled",
];

// GET /api/admin/settings — get all store settings
export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const typedProfile = profile as unknown as { role?: string } | null;
  const staffRoles = ["admin", "super_admin", "employee"];
  if (!typedProfile || !staffRoles.includes(typedProfile.role ?? "")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { data, error } = await supabase.from("store_settings").select("key, value");

  if (error) {
    return NextResponse.json({ error: "No pudimos obtener la configuración." }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  return NextResponse.json({ settings });
}

// PUT /api/admin/settings — update store settings (admin only)
export async function PUT(request: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;

  let payload: { settings: Record<string, string> };
  try {
    payload = (await request.json()) as { settings: Record<string, string> };
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!payload.settings || typeof payload.settings !== "object") {
    return NextResponse.json({ error: "Formato de configuración invalido." }, { status: 400 });
  }

  const settingsTable = auth.supabase.from("store_settings") as unknown as {
    upsert: (v: Record<string, unknown>) => Promise<{ error: unknown }>;
  };

  for (const [key, value] of Object.entries(payload.settings)) {
    if (!VALID_KEYS.includes(key)) continue;

    const { error } = await settingsTable.upsert({ key, value: String(value) });
    if (error) {
      return NextResponse.json({ error: `Error actualizando ${key}.` }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
