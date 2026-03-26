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

  let payload: { openingCash: number; notes?: string };
  try {
    payload = (await request.json()) as { openingCash: number; notes?: string };
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const openingCash = Number(payload.openingCash ?? 0);
  if (isNaN(openingCash) || openingCash < 0) {
    return NextResponse.json({ error: "Monto de apertura invalido." }, { status: 400 });
  }

  const shiftsTable = auth.supabase.from("shifts") as unknown as {
    insert: (v: Record<string, unknown>) => {
      select: (cols: string) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
    };
  };
  const { data: shift, error } = (await shiftsTable
    .insert({
      opened_by: auth.userId,
      opening_cash: openingCash,
      notes: payload.notes?.trim() || null,
      status: "open",
    })
    .select("*")
    .maybeSingle()) as { data: unknown; error: unknown };

  if (error || !shift) {
    return NextResponse.json({ error: "No pudimos abrir el turno." }, { status: 500 });
  }

  return NextResponse.json({ shift });
}
