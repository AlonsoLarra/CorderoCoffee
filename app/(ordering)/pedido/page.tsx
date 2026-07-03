import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginBanner } from "@/components/ordering/login-banner";
import { LocalOrdersPanel } from "@/components/ordering/local-orders-panel";
import { OrderingShell } from "@/components/ordering/ordering-shell";
import { COPY } from "@/lib/copy";
import { getActiveMenu, type MenuCategoryWithItems } from "@/lib/services/menu";
import {
  getEmailVerificationErrorMessage,
  isEmailVerified,
} from "@/lib/supabase/email-verification";
import { getUserRole, isAdminRole } from "@/lib/supabase/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrderingPage() {
  let categories: MenuCategoryWithItems[] = [];
  let loadError = false;
  let loadErrorMessage = "No pudimos cargar el menu desde Supabase. Revisa variables de entorno y migraciones.";
  let userEmail: string | null = null;
  let profileName: string | null = null;
  let rewardPoints: number | null = null;
  let isAdmin = false;

  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      if (!isEmailVerified(user)) {
        redirect(`/acceso?error=${encodeURIComponent(getEmailVerificationErrorMessage())}`);
      }

      userEmail = user.email ?? null;

      const [{ data: profile }, role] = await Promise.all([
        supabase.from("profiles").select("name,reward_points").eq("id", user.id).maybeSingle(),
        getUserRole(user.id),
      ]);
      isAdmin = isAdminRole(role);

      if (profile) {
        const typedProfile = profile as unknown as { name: string | null; reward_points: number };
        profileName = typedProfile.name;
        rewardPoints = typedProfile.reward_points ?? 0;
      }
    }

    categories = await getActiveMenu();
  } catch (error) {
    console.error("[ordering] failed to load menu", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "PGRST205"
    ) {
      loadErrorMessage =
        "Faltan migraciones en Supabase: no existe la tabla public.menu_categories. Ejecuta supabase/migrations/202603210001_init.sql y luego supabase/seed.sql en tu proyecto.";
    }

    loadError = true;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-6 sm:py-10">
      <LoginBanner userEmail={userEmail} profileName={profileName} rewardPoints={rewardPoints} />

      {loadError ? (
        <div className="mt-8 rounded-[20px] bg-cordero-card p-6 shadow-cordero-card">
          <p className="text-sm text-[hsl(var(--color-espresso)/0.75)]">{loadErrorMessage}</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="mt-8 rounded-[20px] bg-cordero-card p-6 shadow-cordero-card">
          <p className="text-sm text-[hsl(var(--color-espresso)/0.75)]">
            Menú sin productos activos aún. Ejecuta el seed inicial o activa items en admin.
          </p>
        </div>
      ) : (
        <OrderingShell categories={categories} />
      )}

      <LocalOrdersPanel />

      <div className="mt-8 flex flex-wrap gap-4 pb-6">
        <Link className="text-sm text-[hsl(var(--color-espresso)/0.6)] underline" href="/">
          {COPY.actions.backToHome}
        </Link>
        {/* Only logged-in users have order history */}
        <Link className="text-sm text-[hsl(var(--color-espresso)/0.6)] underline" href="/pedido/historial">
          {COPY.ordering.historialLink}
        </Link>
        {isAdmin && (
          <Link className="text-sm text-[hsl(var(--color-espresso)/0.6)] underline" href="/admin">
            {COPY.actions.openAdmin}
          </Link>
        )}
      </div>
    </main>
  );
}
