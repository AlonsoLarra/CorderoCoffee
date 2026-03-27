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

  return { supabase, userId: user.id };
}

// GET /api/admin/cash-drops — list cash drops for current or specific shift
export async function GET(request: Request) {
  const auth = await ensureStaff();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const shiftId = url.searchParams.get("shiftId");

  let query = auth.supabase
    .from("cash_drops")
    .select("*")
    .order("created_at", { ascending: false });

  if (shiftId) {
    query = query.eq("shift_id", shiftId);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    return NextResponse.json({ error: "No pudimos obtener los cortes de caja." }, { status: 500 });
  }

  return NextResponse.json({ cashDrops: data ?? [] });
}

// POST /api/admin/cash-drops — perform a cash drop
export async function POST(request: Request) {
  const auth = await ensureStaff();
  if ("error" in auth) return auth.error;

  let payload: { actualAmount: number; notes?: string };
  try {
    payload = (await request.json()) as { actualAmount: number; notes?: string };
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const actualAmount = Number(payload.actualAmount);
  if (isNaN(actualAmount) || actualAmount <= 0) {
    return NextResponse.json({ error: "Monto de retiro invalido." }, { status: 400 });
  }

  // Get active shift
  const { data: shift } = await auth.supabase
    .from("shifts")
    .select("*")
    .eq("status", "open")
    .maybeSingle();

  if (!shift) {
    return NextResponse.json({ error: "No hay un turno abierto." }, { status: 404 });
  }

  const typedShift = shift as unknown as {
    id: string;
    opening_cash: number;
    cash_sales_total: number;
    total_cash_drops: number;
  };

  // Calculate current balance
  const currentBalance = Number(typedShift.opening_cash) + Number(typedShift.cash_sales_total) - Number(typedShift.total_cash_drops);

  if (actualAmount > currentBalance) {
    return NextResponse.json({ error: "No puedes retirar más de lo que hay en caja." }, { status: 400 });
  }

  // Get minimum cash setting
  const { data: settingsData } = await auth.supabase
    .from("store_settings")
    .select("key, value")
    .eq("key", "minimum_cash_in_drawer")
    .maybeSingle();

  const minimumCash = Number((settingsData as unknown as { value: string } | null)?.value ?? 1000);
  const suggestedAmount = Math.max(0, currentBalance - minimumCash);
  const remainingAfter = currentBalance - actualAmount;

  // Create cash drop record
  const cashDropsTable = auth.supabase.from("cash_drops") as unknown as {
    insert: (v: Record<string, unknown>) => {
      select: (cols: string) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
    };
  };

  const { data: cashDrop, error: dropError } = (await cashDropsTable
    .insert({
      shift_id: typedShift.id,
      suggested_amount: suggestedAmount,
      actual_amount: actualAmount,
      remaining_in_drawer: remainingAfter,
      performed_by: auth.userId,
      status: "confirmed",
      notes: payload.notes?.trim() || null,
      confirmed_at: new Date().toISOString(),
    })
    .select("*")
    .maybeSingle()) as { data: unknown; error: unknown };

  if (dropError) {
    return NextResponse.json({ error: "No pudimos registrar el corte de caja." }, { status: 500 });
  }

  // Record cash movement
  const movementsTable = auth.supabase.from("cash_movements") as unknown as {
    insert: (v: Record<string, unknown>) => Promise<{ error: unknown }>;
  };

  await movementsTable.insert({
    shift_id: typedShift.id,
    type: "cash_drop",
    amount: -actualAmount,
    balance_after: remainingAfter,
    performed_by: auth.userId,
    notes: payload.notes?.trim() || `Corte de caja: ${actualAmount}`,
  });

  // Update shift totals
  const shiftsTable = auth.supabase.from("shifts") as unknown as {
    update: (v: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: unknown }>;
    };
  };

  await shiftsTable
    .update({
      total_cash_drops: Number(typedShift.total_cash_drops) + actualAmount,
      orders_since_threshold: 0, // Reset counter after cash drop
    })
    .eq("id", typedShift.id);

  return NextResponse.json({
    cashDrop,
    newBalance: remainingAfter,
  });
}
