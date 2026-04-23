import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a random token for email verification
 */
function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
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

  const { data, error } = await supabase
    .from("email_verification_tokens")
    .select("email, user_id, expires_at, used")
    .eq("token", params.token)
    .eq("token_type", params.tokenType)
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to verify email token:", error);
    return null;
  }

  if (data.used) {
    console.warn("Email token already used:", params.token);
    return null;
  }

  const expiresAt = new Date(data.expires_at);
  if (expiresAt < new Date()) {
    console.warn("Email token expired:", params.token);
    return null;
  }

  // Mark token as used
  await supabase
    .from("email_verification_tokens")
    .update({ used: true, updated_at: new Date().toISOString() })
    .eq("token", params.token);

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
