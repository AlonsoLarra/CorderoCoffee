import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types/domain";

const ASSIGNABLE_ROLES: Role[] = ["customer", "admin"];

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

  return { callerId: user.id, adminClient: createSupabaseAdminClient() };
}

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  const auth = await ensureSuperAdmin();
  if ("error" in auth) return auth.error;

  const { userId } = params;

  if (userId === auth.callerId) {
    return NextResponse.json({ error: "No puedes cambiar tu propio rol." }, { status: 400 });
  }

  let body: { role?: string };
  try {
    body = (await request.json()) as { role?: string };
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const newRole = body.role as Role;
  if (!ASSIGNABLE_ROLES.includes(newRole)) {
    return NextResponse.json({ error: "Rol no permitido." }, { status: 400 });
  }

  const profilesTable = auth.adminClient.from("profiles") as unknown as {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: unknown }>;
    };
  };

  const { error } = (await profilesTable
    .update({ role: newRole })
    .eq("id", userId)) as { error: unknown };

  if (error) {
    return NextResponse.json({ error: "No pudimos actualizar el rol." }, { status: 500 });
  }

  return NextResponse.json({ userId, role: newRole });
}
