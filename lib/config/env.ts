type PublicEnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY";
type PrivateEnvKey = "SUPABASE_SERVICE_ROLE_KEY";

const requiredPublicEnvKeys: PublicEnvKey[] = ["NEXT_PUBLIC_SUPABASE_URL"];

function assertEnvValue(key: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function readPublicEnv(key: PublicEnvKey): string {
  return assertEnvValue(key, process.env[key]);
}

function readSupabasePublicKey(): string {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (anonKey) {
    return anonKey;
  }

  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (publishableKey) {
    return publishableKey;
  }

  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
  );
}

function readPrivateEnv(key: PrivateEnvKey): string {
  return assertEnvValue(key, process.env[key]);
}

export function getPublicEnv() {
  const publicSupabaseKey = readSupabasePublicKey();

  return {
    NEXT_PUBLIC_SUPABASE_URL: readPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: publicSupabaseKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: publicSupabaseKey,
  };
}

export function getServiceRoleKey(): string {
  return readPrivateEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function validateEnvironment(options?: { requireServiceRole?: boolean }): void {
  requiredPublicEnvKeys.forEach((key) => {
    readPublicEnv(key);
  });

  readSupabasePublicKey();

  if (options?.requireServiceRole) {
    readPrivateEnv("SUPABASE_SERVICE_ROLE_KEY");
  }
}

export const env = {
  get NEXT_PUBLIC_SUPABASE_URL(): string {
    return assertEnvValue(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY(): string {
    return readSupabasePublicKey();
  },
  get NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY(): string {
    return readSupabasePublicKey();
  },
  get STRIPE_SECRET_KEY(): string {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key && process.env.NODE_ENV === "production") {
      throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
    }
    return key ?? "";
  },
  get STRIPE_WEBHOOK_SECRET(): string {
    const key = process.env.STRIPE_WEBHOOK_SECRET;
    if (!key && process.env.NODE_ENV === "production") {
      throw new Error("Missing required environment variable: STRIPE_WEBHOOK_SECRET");
    }
    return key ?? "";
  },
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  // URL pública de la app (para redirecciones de Stripe, etc.)
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000"),
  // Variables opcionales para notificaciones por email
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  NOTIFICATION_FROM_EMAIL: process.env.NOTIFICATION_FROM_EMAIL ?? "",
};
