import Link from "next/link";

import { DraftCart } from "@/components/ordering/draft-cart";
import { COPY } from "@/lib/copy";
import { getActiveMenu, type MenuCategoryWithItems } from "@/lib/services/menu";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrderingPage() {
  let categories: MenuCategoryWithItems[] = [];
  let loadError = false;
  let userEmail: string | null = null;
  let profileName: string | null = null;

  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userEmail = user.email ?? null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        const typedProfile = profile as unknown as { name: string | null };
        profileName = typedProfile.name;
      }
    }

    categories = await getActiveMenu();
  } catch {
    loadError = true;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16 sm:px-10">
      <h1 className="font-heading text-3xl text-cordero-espresso sm:text-4xl">
        {COPY.ordering.title}
      </h1>

      <p className="mt-3 max-w-2xl text-cordero-espresso opacity-80">{COPY.ordering.description}</p>

      <div className="mt-6 rounded-2xl border border-cordero bg-cordero-card p-4 text-sm text-cordero-espresso">
        {userEmail ? (
          <p>
            Modo cliente: {profileName ? profileName : userEmail}
          </p>
        ) : (
          <p>MODO INVITADO: tu carrito se guarda en este dispositivo.</p>
        )}
      </div>

      {loadError ? (
        <div className="mt-8 rounded-2xl border border-cordero bg-cordero-card p-6">
          <p className="text-sm text-cordero-espresso opacity-75">
            No pudimos cargar el menu desde Supabase. Revisa variables de entorno y migraciones.
          </p>
        </div>
      ) : categories.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-cordero bg-cordero-card p-6">
          <p className="text-sm text-cordero-espresso opacity-75">
            Menu sin productos activos aun. Ejecuta el seed inicial o activa items en admin.
          </p>
        </div>
      ) : (
        <DraftCart categories={categories} />
      )}

      <Link className="mt-8 inline-block text-sm underline" href="/">
        {COPY.actions.backToHome}
      </Link>
    </main>
  );
}
