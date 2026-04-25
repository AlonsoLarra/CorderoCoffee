import type { User } from "@supabase/supabase-js";

function hasConfirmedAt(user: User): boolean {
  const maybeConfirmedAt = (user as User & { confirmed_at?: string | null }).confirmed_at;
  return Boolean(user.email_confirmed_at || maybeConfirmedAt);
}

function hasVerifiedMetadata(user: User): boolean {
  const metadata = user.user_metadata as Record<string, unknown> | null;
  const emailVerified = metadata?.email_verified;
  return emailVerified === true;
}

export function isEmailVerified(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  return hasConfirmedAt(user) || hasVerifiedMetadata(user);
}

export function getEmailVerificationErrorMessage(): string {
  return "Tu correo aun no esta verificado. Revisa tu bandeja y confirma tu cuenta antes de continuar.";
}
