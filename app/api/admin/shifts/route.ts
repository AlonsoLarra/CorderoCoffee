import { type NextRequest, NextResponse } from "next/server";

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

// GET /api/admin/shifts — list shifts. Optional ?year=YYYY&month=M for calendar filtering.
export async function GET(request: NextRequest) {
  const auth = await ensureStaff();
  if ("error" in auth) return auth.error;

  const yearParam = request.nextUrl.searchParams.get("year");
  const monthParam = request.nextUrl.searchParams.get("month");

  let query = auth.supabase
    .from("shifts")
    .select("*")
    .order("opened_at", { ascending: false });

  if (yearParam && monthParam) {
    const year = parseInt(yearParam, 10);
    const month = parseInt(monthParam, 10); // 1-12
    if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
      const start = `${year}-${String(month).padStart(2, "0")}-01T00:00:00`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00`;
      query = query.gte("opened_at", start).lt("opened_at", end);
    } else {
      query = query.limit(30);
    }
  } else {
    query = query.limit(30);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "No pudimos obtener los turnos." }, { status: 500 });
  }

  return NextResponse.json({ shifts: data ?? [] });
}

// POST /api/admin/shifts — open a new shift
export async function POST(request: Request) {
  const auth = await ensureStaff();
  if ("error" in auth) return auth.error;

  // Check for open shift
  const { data: openShift } = await auth.supabase
    .from("shifts")
    .select("id")
    .eq("status", "open")
    .maybeSingle();

  if (openShift) {
    return NextResponse.json({ error: "Ya hay un turno abierto." }, { status: 409 });
  }

  let payload: { actualOpeningCash: number; notes?: string };
  try {
    payload = (await request.json()) as { actualOpeningCash: number; notes?: string };
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const actualOpeningCash = Number(payload.actualOpeningCash ?? 0);
  if (isNaN(actualOpeningCash) || actualOpeningCash < 0) {
    return NextResponse.json({ error: "Monto de apertura invalido." }, { status: 400 });
  }

  // Get expected opening cash from store settings
  const { data: settingsData } = await auth.supabase
    .from("store_settings")
    .select("key, value")
    .eq("key", "minimum_cash_in_drawer")
    .maybeSingle();

  const expectedOpeningCash = Number(
    (settingsData as unknown as { value: string } | null)?.value ?? 1000
  );

  const discrepancy = actualOpeningCash - expectedOpeningCash;

  const shiftsTable = auth.supabase.from("shifts") as unknown as {
    insert: (v: Record<string, unknown>) => {
      select: (cols: string) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
    };
  };
  const { data: shift, error } = (await shiftsTable
    .insert({
      opened_by: auth.userId,
      opening_cash: actualOpeningCash,
      expected_opening_cash: expectedOpeningCash,
      actual_opening_cash: actualOpeningCash,
      opening_discrepancy: discrepancy,
      opening_confirmed_at: new Date().toISOString(),
      notes: payload.notes?.trim() || null,
      status: "open",
    })
    .select("*")
    .maybeSingle()) as { data: unknown; error: unknown };

  if (error || !shift) {
    return NextResponse.json({ error: "No pudimos abrir el turno." }, { status: 500 });
  }

  // Record opening cash movement
  const movementsTable = auth.supabase.from("cash_movements") as unknown as {
    insert: (v: Record<string, unknown>) => Promise<{ error: unknown }>;
  };

  const typedShift = shift as unknown as { id: string };
  await movementsTable.insert({
    shift_id: typedShift.id,
    type: "opening",
    amount: actualOpeningCash,
    balance_after: actualOpeningCash,
    performed_by: auth.userId,
    notes: discrepancy !== 0
      ? `Apertura con discrepancia de ${discrepancy > 0 ? "+" : ""}${discrepancy}`
      : "Apertura de turno",
  });

  return NextResponse.json({ shift, expectedOpeningCash, discrepancy });
}
