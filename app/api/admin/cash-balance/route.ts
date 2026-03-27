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

// GET /api/admin/cash-balance — get current cash drawer balance for active shift
export async function GET() {
  const auth = await ensureStaff();
  if ("error" in auth) return auth.error;

  // Get active shift
  const { data: shift } = await auth.supabase
    .from("shifts")
    .select("*")
    .eq("status", "open")
    .maybeSingle();

  if (!shift) {
    return NextResponse.json({ balance: 0, shift: null, needsCashDrop: false, cashDropRequired: false });
  }

  const typedShift = shift as unknown as {
    id: string;
    opening_cash: number;
    cash_sales_total: number;
    total_cash_drops: number;
    orders_since_threshold: number;
  };

  // Calculate current balance
  const balance = Number(typedShift.opening_cash) + Number(typedShift.cash_sales_total) - Number(typedShift.total_cash_drops);

  // Get settings for thresholds
  const { data: settingsData } = await auth.supabase
    .from("store_settings")
    .select("key, value")
    .in("key", ["cash_drop_threshold", "max_orders_after_threshold", "minimum_cash_in_drawer"]);

  const settings: Record<string, string> = {};
  for (const row of (settingsData ?? []) as unknown as Array<{ key: string; value: string }>) {
    settings[row.key] = row.value;
  }

  const threshold = Number(settings.cash_drop_threshold ?? 5000);
  const maxOrders = Number(settings.max_orders_after_threshold ?? 5);
  const minimumCash = Number(settings.minimum_cash_in_drawer ?? 1000);

  const needsCashDrop = balance >= threshold;
  const cashDropRequired = needsCashDrop && typedShift.orders_since_threshold >= maxOrders;
  const suggestedDropAmount = needsCashDrop ? Math.max(0, balance - minimumCash) : 0;

  return NextResponse.json({
    balance,
    shift,
    needsCashDrop,
    cashDropRequired,
    suggestedDropAmount,
    ordersUntilRequired: needsCashDrop ? Math.max(0, maxOrders - typedShift.orders_since_threshold) : null,
    minimumCash,
  });
}
