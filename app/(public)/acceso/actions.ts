"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRole, isAdminRole } from "@/lib/supabase/roles";

function getStringValue(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function toAccessError(message: string): never {
  redirect(`/acceso?error=${encodeURIComponent(message)}`);
}

function toRecuperarError(message: string): never {
  redirect(`/acceso/recuperar?error=${encodeURIComponent(message)}`);
}

function toRegistroError(message: string): never {
  redirect(`/acceso/registro?error=${encodeURIComponent(message)}`);
}

function toNuevaContrasenaError(message: string): never {
  redirect(`/acceso/nueva-contrasena?error=${encodeURIComponent(message)}`);
}

export async function signInAction(formData: FormData): Promise<void> {
  const email = getStringValue(formData.get("email"));
  const password = getStringValue(formData.get("password"));
  const redirectTo = getStringValue(formData.get("redirectTo"));

  if (!email || !password) {
    toAccessError("Completa tu correo y contraseña para continuar.");
  }

  const supabase = createSupabaseServerClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    toAccessError("No pudimos iniciar sesión con esos datos.");
  }

  const role = authData?.user ? await getUserRole(authData.user.id) : null;
  if (isAdminRole(role)) {
    redirect("/admin");
  }
  redirect(redirectTo || "/pedido");
}

export async function signUpAction(formData: FormData): Promise<void> {
  const email = getStringValue(formData.get("email"));
  const password = getStringValue(formData.get("password"));

  if (!email || !password) {
    toRegistroError("Completa tu correo y contraseña para continuar.");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    toRegistroError("Ocurrió un error. Intenta de nuevo.");
  }

  redirect(`/acceso?success=${encodeURIComponent("Cuenta creada. Revisa tu correo para confirmar tu acceso.")}`);
}

export async function signOutAction(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function forgotPasswordAction(formData: FormData): Promise<void> {
  const email = getStringValue(formData.get("email"));

  if (!email) {
    toRecuperarError("Ingresa tu correo para continuar.");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/acceso/nueva-contrasena`,
  });

  if (error) {
    toRecuperarError("Ocurrió un error. Intenta de nuevo.");
  }

  redirect(
    `/acceso/recuperar?success=${encodeURIComponent(
      "Revisa tu correo. Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.",
    )}`,
  );
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const password = getStringValue(formData.get("password"));
  const confirmPassword = getStringValue(formData.get("confirmPassword"));

  if (!password) {
    toNuevaContrasenaError("Ingresa tu nueva contraseña.");
  }

  if (password.length < 8) {
    toNuevaContrasenaError("La contraseña debe tener al menos 8 caracteres.");
  }

  if (password !== confirmPassword) {
    toNuevaContrasenaError("Las contraseñas no coinciden.");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    toNuevaContrasenaError("Ocurrió un error al actualizar tu contraseña. Intenta de nuevo.");
  }

  redirect(`/acceso?success=${encodeURIComponent("Tu contraseña fue actualizada. Ya puedes iniciar sesión.")}`);
}
