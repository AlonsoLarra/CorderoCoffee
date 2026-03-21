import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type CreateItemPayload = {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
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
    .from("menu_items")
    .select("id,category_id,name,description,price,is_active,sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "No pudimos cargar productos." }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return auth.error;
  }

  let payload: CreateItemPayload;
  try {
    payload = (await request.json()) as CreateItemPayload;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!payload?.categoryId || !payload?.name?.trim() || !Number.isFinite(Number(payload.price))) {
    return NextResponse.json({ error: "Datos incompletos para crear producto." }, { status: 400 });
  }

  const itemsTable = auth.supabase.from("menu_items") as unknown as {
    insert: (values: Record<string, unknown>) => {
      select: (columns: string) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };

  const { data, error } = (await itemsTable
    .insert({
      category_id: payload.categoryId,
      name: payload.name.trim(),
      description: payload.description?.trim() ? payload.description.trim() : null,
      price: Number(payload.price),
      is_active: true,
      sort_order: payload.sortOrder ?? 0,
    })
    .select("id,category_id,name,description,price,is_active,sort_order")
    .maybeSingle()) as {
    data:
      | {
          id: string;
          category_id: string;
          name: string;
          description: string | null;
          price: number;
          is_active: boolean;
          sort_order: number;
        }
      | null;
    error: unknown;
  };

  if (error || !data) {
    return NextResponse.json({ error: "No pudimos crear el producto." }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
