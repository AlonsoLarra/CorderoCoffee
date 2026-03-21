import Link from "next/link";

import { signOutAction } from "@/app/(public)/acceso/actions";
import { COPY } from "@/lib/copy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PublicHomePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-start justify-center px-6 py-16 sm:px-10">
      <span className="mb-4 rounded-full border border-cordero bg-cordero-card px-4 py-1 text-xs uppercase tracking-[0.2em] text-cordero-espresso opacity-80">
        Cordero Coffee Club
      </span>

      <h1 className="font-heading text-4xl leading-tight text-cordero-espresso sm:text-6xl">
        {COPY.brand.tagline}
      </h1>

      <p className="mt-5 max-w-2xl text-base leading-relaxed text-cordero-espresso opacity-90 sm:text-lg">
        {COPY.brand.intro}
      </p>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/acceso"
          className="rounded-full border border-cordero px-6 py-3 text-sm font-medium text-cordero-espresso transition hover:bg-cordero-card"
        >
          {COPY.actions.accessAccount}
        </Link>
        <Link
          href="/pedido"
          className="rounded-full bg-cordero-espresso px-6 py-3 text-sm font-medium text-cordero-cream transition hover:opacity-90"
        >
          {COPY.actions.startOrder}
        </Link>
        <Link
          href="/admin"
          className="rounded-full border border-cordero px-6 py-3 text-sm font-medium text-cordero-espresso transition hover:bg-cordero-card"
        >
          {COPY.actions.openAdmin}
        </Link>
      </div>

      {user ? (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-cordero bg-cordero-card px-4 py-3 text-sm">
          <span>
            {COPY.auth.loggedInPrefix}: {user.email}
          </span>
          <form action={signOutAction}>
            <button className="rounded-full border border-cordero px-3 py-1 text-xs" type="submit">
              {COPY.actions.signOut}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
