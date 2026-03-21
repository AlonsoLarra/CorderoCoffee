import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type UpdateItemPayload = {
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  sortOrder?: number;
  isActive?: boolean;
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

export async function PATCH(request: Request, context: { params: { itemId: string } }) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return auth.error;
  }

  let payload: UpdateItemPayload;
  try {
    payload = (await request.json()) as UpdateItemPayload;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof payload.categoryId === "string") {
    updates.category_id = payload.categoryId;
  }
  if (typeof payload.name === "string") {
    updates.name = payload.name.trim();
  }
  if (typeof payload.description === "string") {
    updates.description = payload.description.trim() ? payload.description.trim() : null;
  }
  if (typeof payload.price === "number" && Number.isFinite(payload.price)) {
    updates.price = payload.price;
  }
  if (typeof payload.sortOrder === "number") {
    updates.sort_order = payload.sortOrder;
  }
  if (typeof payload.isActive === "boolean") {
    updates.is_active = payload.isActive;
  }

  const itemsTable = auth.supabase.from("menu_items") as unknown as {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        select: (columns: string) => {
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        };
      };
    };
  };

  const { data, error } = (await itemsTable
    .update(updates)
    .eq("id", context.params.itemId)
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
    return NextResponse.json({ error: "No pudimos actualizar el producto." }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
