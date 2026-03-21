import { createClient } from "@supabase/supabase-js";

import { getPublicEnv, getServiceRoleKey } from "@/lib/config/env";
import type { Database } from "@/lib/types/database";

export function createSupabaseAdminClient() {
  const env = getPublicEnv();
  const serviceRoleKey = getServiceRoleKey();

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
