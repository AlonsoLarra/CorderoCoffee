import { randomBytes } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const TOKEN_BYTES = 32;
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a random token for email verification
 */
function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/**
 * Create an email verification token in the database
 */
export async function createEmailVerificationToken(params: {
  userId?: string;
  email: string;
  tokenType: "signup_verification" | "password_reset";
}): Promise<{ token: string; expiresAt: Date } | null> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("email_verification_tokens").insert({
    user_id: params.userId || null,
    email: params.email,
    token,
    token_type: params.tokenType,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error("Failed to create email verification token:", error);
    return null;
  }

  return { token, expiresAt };
}

/**
 * Verify an email token and return the associated email/user
 */
export async function verifyEmailToken(params: {
  token: string;
  tokenType: "signup_verification" | "password_reset";
}): Promise<{ email: string; userId: string | null } | null> {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("email_verification_tokens")
    .update({ used: true, updated_at: now })
    .select("email, user_id")
    .eq("token", params.token)
    .eq("token_type", params.tokenType)
    .eq("used", false)
    .gt("expires_at", now)
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to verify email token:", error);
    return null;
  }

  return {
    email: data.email,
    userId: data.user_id,
  };
}

/**
 * Get verification link for an email token
 */
export function getVerificationLink(params: {
  baseUrl: string;
  token: string;
  type: "signup" | "password_reset";
}): string {
  const path = params.type === "signup" ? "/acceso/verificar-email" : "/acceso/nueva-contrasena";
  return `${params.baseUrl}${path}?token=${params.token}`;
}

/**
 * Clean up expired tokens (can be called periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const supabase = createSupabaseAdminClient();

  await supabase
    .from("email_verification_tokens")
    .delete()
    .lt("expires_at", new Date().toISOString());
}
