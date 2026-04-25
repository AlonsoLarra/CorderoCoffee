"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@/lib/config/env";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  sendPasswordResetRequestedEmail,
  sendWelcomePendingConfirmationEmail,
} from "@/lib/services/account-emails";
import {
  getEmailVerificationErrorMessage,
  isEmailVerified,
} from "@/lib/supabase/email-verification";
import {
  createEmailVerificationToken,
} from "@/lib/supabase/email-tokens";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRole, isAdminRole } from "@/lib/supabase/roles";

function getStringValue(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getSafeRedirectPath(value: string): string {
  if (!value) return "";
  if (!value.startsWith("/")) return "";
  // Prevent external/protocol-relative URLs.
  if (value.startsWith("//")) return "";
  return value;
}

function getRequestFingerprint(): string {
  const headersList = headers();
  const forwarded = headersList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headersList.get("x-real-ip")?.trim();
  const userAgent = headersList.get("user-agent")?.trim() ?? "unknown-ua";
  return `${forwarded ?? realIp ?? "unknown-ip"}:${userAgent}`;
}

function getAppBaseUrl(): string {
  const raw = (env.APP_URL || "").trim();
  if (!raw) {
    return "http://localhost:3000";
  }

  try {
    const parsed = new URL(raw);
    return parsed.origin;
  } catch {
    return "http://localhost:3000";
  }
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
  const redirectTo = getSafeRedirectPath(getStringValue(formData.get("redirectTo")));

  if (!email || !password) {
    toAccessError("Completa tu correo y contraseña para continuar.");
  }

  const signInRate = await checkRateLimit(`signin:${getRequestFingerprint()}`, 12, 60_000);
  if (!signInRate.allowed) {
    toAccessError("Demasiados intentos de acceso. Intenta de nuevo en un minuto.");
  }

  const supabase = createSupabaseServerClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      toAccessError("Tu correo aún no está confirmado. Revisa tu bandeja de entrada.");
    }
    toAccessError("Correo o contraseña incorrectos.");
  }

  if (authData?.user && !isEmailVerified(authData.user)) {
    toAccessError(getEmailVerificationErrorMessage());
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
  const confirmPassword = getStringValue(formData.get("confirmPassword"));

  if (!email || !password) {
    toRegistroError("Completa tu correo y contraseña para continuar.");
  }

  if (password.length < 8) {
    toRegistroError("La contraseña debe tener al menos 8 caracteres.");
  }

  if (password !== confirmPassword) {
    toRegistroError("Las contraseñas no coinciden.");
  }

  const signUpRate = await checkRateLimit(`signup:${getRequestFingerprint()}`, 5, 15 * 60_000);
  if (!signUpRate.allowed) {
    toRegistroError("Demasiados intentos de registro. Intenta de nuevo en unos minutos.");
  }

  const supabase = createSupabaseServerClient();
  const appBaseUrl = getAppBaseUrl();

  // Sign up in Supabase (with email redirect but we'll use custom token)
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appBaseUrl}/acceso`,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already been registered")) {
      toRegistroError("Ese correo ya está registrado. Inicia sesión o recupera tu contraseña.");
    }
    if (msg.includes("password")) {
      toRegistroError("La contraseña no cumple con los requisitos de seguridad.");
    }
    toRegistroError("No pudimos crear tu cuenta en este momento.");
  }

  // Create verification token for custom email flow
  const tokenData = await createEmailVerificationToken({
    userId: authData?.user?.id,
    email,
    tokenType: "signup_verification",
  });

  if (tokenData) {
    // Send email via Resend with verification link (PRIMARY)
    void sendWelcomePendingConfirmationEmail({
      toEmail: email,
      appBaseUrl,
      verificationToken: tokenData.token,
    });
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

  const forgotRate = await checkRateLimit(`forgot:${getRequestFingerprint()}`, 4, 15 * 60_000);
  if (!forgotRate.allowed) {
    toRecuperarError("Ya hiciste varios intentos. Espera unos minutos para volver a solicitar el enlace.");
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const appBaseUrl = getAppBaseUrl();

  const normalizedEmail = email.toLowerCase();
  let matchedUserId: string | undefined;
  let page = 1;

  while (!matchedUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error("Failed to list users for password reset:", error);
      break;
    }

    const users = data.users ?? [];
    const matchedUser = users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (matchedUser) {
      matchedUserId = matchedUser.id;
      break;
    }

    if (users.length < 200) {
      break;
    }

    page += 1;
  }

  if (matchedUserId) {
    const tokenData = await createEmailVerificationToken({
      userId: matchedUserId,
      email,
      tokenType: "password_reset",
    });

    if (tokenData) {
    void sendPasswordResetRequestedEmail({
      toEmail: email,
      appBaseUrl,
        verificationToken: tokenData.token,
    });
    }
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

export async function resendConfirmationAction(formData: FormData): Promise<void> {
  const email = getStringValue(formData.get("email"));

  if (!email) {
    toAccessError("Ingresa tu correo para reenviar la confirmación.");
  }

  const resendRate = await checkRateLimit(`resend-confirmation:${getRequestFingerprint()}`, 4, 15 * 60_000);
  if (!resendRate.allowed) {
    toAccessError("Ya solicitaste varios reenvíos. Intenta de nuevo en unos minutos.");
  }

  const appBaseUrl = getAppBaseUrl();
  const supabase = createSupabaseServerClient();

  // Use Supabase resend as canonical re-verification flow.
  void supabase.auth
    .resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${appBaseUrl}/acceso`,
      },
    })
    .catch(() => {
      // Silently fail if Supabase resend fails
    });

  redirect(
    `/acceso?success=${encodeURIComponent(
      "Si existe una cuenta pendiente de confirmar, te enviamos un nuevo enlace de verificación.",
    )}`,
  );
}
