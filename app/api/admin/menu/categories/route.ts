import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type CreateCategoryPayload = {
  name: string;
  sortOrder?: number;
};

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

  if (!typedProfile || (typedProfile.role !== "admin" && typedProfile.role !== "super_admin")) {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }

  return { supabase };
}

export async function GET() {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("menu_categories")
    .select("id,name,sort_order,is_active")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "No pudimos cargar categorias." }, { status: 500 });
  }

  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return auth.error;
  }

  let payload: CreateCategoryPayload;
  try {
    payload = (await request.json()) as CreateCategoryPayload;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!payload?.name?.trim()) {
    return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
  }

  const categoriesTable = auth.supabase.from("menu_categories") as unknown as {
    insert: (values: Record<string, unknown>) => {
      select: (columns: string) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };

  const { data, error } = (await categoriesTable
    .insert({
      name: payload.name.trim(),
      sort_order: payload.sortOrder ?? 0,
      is_active: true,
    })
    .select("id,name,sort_order,is_active")
    .maybeSingle()) as {
    data: { id: string; name: string; sort_order: number; is_active: boolean } | null;
    error: unknown;
  };

  if (error || !data) {
    return NextResponse.json({ error: "No pudimos crear la categoria." }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}
