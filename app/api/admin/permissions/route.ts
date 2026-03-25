import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminTabKey } from "@/lib/types/domain";

// Tabs that can be configured per-role (usuarios is hardcoded to super_admin only)
const CONFIGURABLE_TABS: AdminTabKey[] = ["pedidos", "alta", "menu", "reportes", "permisos"];

// Roles whose permissions can be stored in DB (super_admin is always full-access, hardcoded)
const CONFIGURABLE_ROLES = ["admin", "employee"] as const;
type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number];

type PermissionRow = { role: string; tab_key: string; allowed: boolean };

async function getCallerRole(): Promise<{ role: string; userId: string } | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const typedProfile = profile as unknown as { role?: string } | null;

  if (!typedProfile?.role) return null;

  return { role: typedProfile.role, userId: user.id };
}

// GET /api/admin/permissions
// Returns all role permissions. Admin sees employee perms; super_admin sees all.
export async function GET() {
  const caller = await getCallerRole();

  if (!caller || (caller.role !== "admin" && caller.role !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("role_permissions")
    .select("role, tab_key, allowed")
    .order("role")
    .order("tab_key");

  if (error) {
    return NextResponse.json({ error: "No pudimos obtener permisos." }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as PermissionRow[];

  // Filter roles visible to caller: admin can only see employee; super_admin sees all
  const visibleRoles: string[] =
    caller.role === "super_admin" ? [...CONFIGURABLE_ROLES] : ["employee"];

  const result = visibleRoles.map((role) => ({
    role,
    permissions: CONFIGURABLE_TABS.map((tab_key) => {
      const row = rows.find((r) => r.role === role && r.tab_key === tab_key);
      return { tab_key, allowed: row?.allowed ?? false };
    }),
  }));

  return NextResponse.json({ permissions: result });
}

// PUT /api/admin/permissions
// Body: { role: string, tab_key: string, allowed: boolean }
// Admin can update employee perms; super_admin can update admin and employee perms.
export async function PUT(request: Request) {
  const caller = await getCallerRole();

  if (!caller || (caller.role !== "admin" && caller.role !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let body: { role?: string; tab_key?: string; allowed?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const { role, tab_key, allowed } = body;

  if (!role || !tab_key || allowed === undefined) {
    return NextResponse.json({ error: "Faltan campos requeridos." }, { status: 400 });
  }

  if (!CONFIGURABLE_ROLES.includes(role as ConfigurableRole)) {
    return NextResponse.json({ error: "Rol no configurable." }, { status: 400 });
  }

  if (!CONFIGURABLE_TABS.includes(tab_key as AdminTabKey)) {
    return NextResponse.json({ error: "Tab no configurable." }, { status: 400 });
  }

  // Admin can only modify employee permissions
  if (caller.role === "admin" && role !== "employee") {
    return NextResponse.json({ error: "Solo puedes configurar permisos de empleados." }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();

  const permissionsTable = supabase.from("role_permissions") as unknown as {
    upsert: (
      values: Record<string, unknown>,
      options: { onConflict: string },
    ) => Promise<{ error: unknown }>;
  };

  const { error } = await permissionsTable.upsert(
    { role, tab_key, allowed, updated_at: new Date().toISOString() },
    { onConflict: "role,tab_key" },
  );

  if (error) {
    return NextResponse.json({ error: "No pudimos actualizar el permiso." }, { status: 500 });
  }

  return NextResponse.json({ role, tab_key, allowed });
}
