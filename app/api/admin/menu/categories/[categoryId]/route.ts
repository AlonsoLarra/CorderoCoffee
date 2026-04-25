import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type UpdateCategoryPayload = {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
};

function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function getDuplicateCategoryMessage(error: unknown) {
  const typedError = error as { code?: string; message?: string } | null;
  if (typedError?.code === "23505") {
    return "Ya existe una categoría con ese nombre.";
  }

  if (typedError?.message?.toLowerCase().includes("duplicate")) {
    return "Ya existe una categoría con ese nombre.";
  }

  return null;
}

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

export async function PATCH(request: Request, context: { params: { categoryId: string } }) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return auth.error;
  }

  let payload: UpdateCategoryPayload;
  try {
    payload = (await request.json()) as UpdateCategoryPayload;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof payload.name === "string") {
    updates.name = normalizeCategoryName(payload.name);
  }
  if (typeof payload.sortOrder === "number") {
    updates.sort_order = payload.sortOrder;
  }
  if (typeof payload.isActive === "boolean") {
    updates.is_active = payload.isActive;
  }

  const categoriesTable = auth.supabase.from("menu_categories") as unknown as {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        select: (columns: string) => {
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        };
      };
    };
  };

  const { data, error } = (await categoriesTable
    .update(updates)
    .eq("id", context.params.categoryId)
    .select("id,name,sort_order,is_active")
    .maybeSingle()) as {
    data: { id: string; name: string; sort_order: number; is_active: boolean } | null;
    error: unknown;
  };

  if (error || !data) {
    const duplicateMessage = getDuplicateCategoryMessage(error);
    if (duplicateMessage) {
      return NextResponse.json({ error: duplicateMessage }, { status: 409 });
    }

    return NextResponse.json({ error: "No pudimos actualizar la categoria." }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}
