import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ensureSuperAdmin() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const typedProfile = profile as unknown as { role?: string } | null;

  if (!typedProfile || typedProfile.role !== "super_admin") {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }

  return { adminClient: createSupabaseAdminClient() };
}

export async function GET() {
  const auth = await ensureSuperAdmin();
  if ("error" in auth) return auth.error;

  const { data: authData, error: authError } = await auth.adminClient.auth.admin.listUsers({
    perPage: 200,
  });

  if (authError) {
    return NextResponse.json({ error: "No pudimos listar usuarios." }, { status: 500 });
  }

  const userIds = authData.users.map((u) => u.id);

  const { data: profiles, error: profilesError } = await auth.adminClient
    .from("profiles")
    .select("id, role")
    .in("id", userIds);

  if (profilesError) {
    return NextResponse.json({ error: "No pudimos obtener roles." }, { status: 500 });
  }

  const typedProfiles = (profiles ?? []) as unknown as Array<{ id: string; role: string }>;
  const roleById = new Map(typedProfiles.map((p) => [p.id, p.role]));

  const users = authData.users.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    role: roleById.get(u.id) ?? "customer",
    createdAt: u.created_at,
  }));

  return NextResponse.json({ users });
}
