import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/config/env";
import type { Database } from "@/lib/types/database";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            return;
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch {
            return;
          }
        },
      },
    },
  );
}
