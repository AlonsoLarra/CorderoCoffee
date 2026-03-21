import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types/domain";

export async function getUserRole(userId: string): Promise<Role | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const roleData = data as unknown as { role: Role };
  return roleData.role;
}

export async function getAuthenticatedUserRole(): Promise<Role | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return getUserRole(user.id);
}

export function isAdminRole(role: Role | null): role is "admin" | "super_admin" {
  return role === "admin" || role === "super_admin";
}
