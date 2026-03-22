"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getStringValue(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function toAccessError(message: string): never {
  redirect(`/acceso?error=${encodeURIComponent(message)}`);
}

export async function signInAction(formData: FormData): Promise<void> {
  const email = getStringValue(formData.get("email"));
  const password = getStringValue(formData.get("password"));

  if (!email || !password) {
    toAccessError("Completa tu correo y contraseña para continuar.");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    toAccessError("No pudimos iniciar sesión con esos datos.");
  }

  redirect("/pedido");
}

export async function signUpAction(formData: FormData): Promise<void> {
  const email = getStringValue(formData.get("email"));
  const password = getStringValue(formData.get("password"));

  if (!email || !password) {
    toAccessError("Completa tu correo y contraseña para continuar.");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    toAccessError("Ocurrió un error. Intenta de nuevo.");
  }

  redirect(`/acceso?success=${encodeURIComponent("Cuenta creada. Revisa tu correo para confirmar tu acceso.")}`);
}

export async function signOutAction(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
