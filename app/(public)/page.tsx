import Image from "next/image";
import Link from "next/link";

import { signOutAction } from "@/app/(public)/acceso/actions";
import { COPY } from "@/lib/copy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRole, isAdminRole } from "@/lib/supabase/roles";

export default async function PublicHomePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await getUserRole(user.id) : null;
  const isAdmin = isAdminRole(role);
  const navActionClass =
    "inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.2em] text-cordero-espresso opacity-40 transition-opacity duration-300 hover:opacity-100";

  return (
    <main>
      {/* ── NAVIGATION ─────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 sm:px-14 sm:py-6">
        <span className="font-heading text-xs uppercase tracking-[0.22em] text-cordero-espresso">
          Cordero
        </span>
        <nav aria-label="Navegación principal" className="flex items-center gap-6 sm:gap-8">
          {isAdmin && (
            <Link href="/admin" className={navActionClass}>
              Consola admin
            </Link>
          )}
          {user ? (
            <form action={signOutAction} className="m-0 flex items-center">
              <button
                type="submit"
                className={`${navActionClass} border-0 bg-transparent p-0 leading-none`}
              >
                {COPY.actions.signOut}
              </button>
            </form>
          ) : (
            <Link href="/acceso" className={navActionClass}>
              Iniciar sesión
            </Link>
          )}
        </nav>
      </header>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div
            className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, hsl(35 27% 87% / 0.7), transparent 70%)",
            }}
          />
        </div>

        {/* Official brand lockup — vertical logo from brand files */}
        <div className="mb-12 w-52 sm:w-64 md:w-72">
          <Image
            src="/logo-secundario-oscuro.svg"
            alt="Cordero Coffee Club"
            width={677}
            height={736}
            priority
            unoptimized
            className="h-auto w-full"
          />
        </div>

        {/* Thin rule */}
        <div
          className="mb-8 h-px w-12"
          style={{ background: "hsl(22 38% 18% / 0.14)" }}
        />

        {/* Tagline */}
        <h1
          className="font-heading max-w-md text-balance text-2xl leading-[1.3] sm:text-3xl"
          style={{ color: "hsl(22 38% 18% / 0.82)" }}
        >
          {COPY.brand.tagline}
        </h1>

        {/* Subheading */}
        <p
          className="mx-auto mt-5 max-w-sm text-balance text-base leading-relaxed"
          style={{ color: "hsl(22 38% 18% / 0.48)" }}
        >
          {COPY.brand.intro}
        </p>

        {/* CTAs */}
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/pedido"
            className="bg-cordero-espresso px-10 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-cordero-cream transition-opacity duration-300 hover:opacity-80"
          >
            {COPY.actions.startOrder}
          </Link>
        </div>
      </section>

      <section className="px-6 pb-20 sm:px-14 sm:pb-24">
        <div className="mx-auto max-w-5xl rounded-3xl border border-cordero bg-cordero-card p-8 sm:p-10">
          <h2 className="font-heading text-2xl text-cordero-espresso sm:text-3xl">Cómo funciona</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <article className="rounded-2xl border border-cordero bg-cordero-cream/40 p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-cordero-espresso/60">Paso 1</p>
              <h3 className="mt-2 text-lg font-semibold text-cordero-espresso">Elige en línea</h3>
              <p className="mt-2 text-sm text-cordero-espresso/75">Explora el menu y agrega tus bebidas al carrito.</p>
            </article>
            <article className="rounded-2xl border border-cordero bg-cordero-cream/40 p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-cordero-espresso/60">Paso 2</p>
              <h3 className="mt-2 text-lg font-semibold text-cordero-espresso">Elige tu momento</h3>
              <p className="mt-2 text-sm text-cordero-espresso/75">Selecciona para ahora o agenda una hora de recolección.</p>
            </article>
            <article className="rounded-2xl border border-cordero bg-cordero-cream/40 p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-cordero-espresso/60">Paso 3</p>
              <h3 className="mt-2 text-lg font-semibold text-cordero-espresso">Llega y recoge</h3>
              <p className="mt-2 text-sm text-cordero-espresso/75">Recibe notificaciones y pasa por tu cafe sin esperar.</p>
            </article>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer
        className="bg-cordero-espresso px-8 py-10 sm:px-14"
        style={{ borderTop: "1px solid hsl(34 26% 88% / 0.08)" }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span
            className="font-heading text-sm tracking-widest"
            style={{ color: "hsl(34 26% 88% / 0.32)" }}
          >
            Cordero Coffee Club
          </span>
          <span
            className="text-[9px] uppercase tracking-[0.25em]"
            style={{ color: "hsl(34 26% 88% / 0.18)" }}
          >
            © {new Date().getFullYear()} — Cordero Coffee Club
          </span>
          {user ? (
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-[10px] uppercase tracking-[0.2em] transition-opacity duration-300 hover:opacity-70"
                style={{ color: "hsl(34 26% 88% / 0.32)" }}
              >
                {COPY.actions.signOut}
              </button>
            </form>
          ) : (
            <Link
              href="/acceso"
              className="text-[10px] uppercase tracking-[0.2em] transition-opacity duration-300 hover:opacity-70"
              style={{ color: "hsl(34 26% 88% / 0.32)" }}
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </footer>
    </main>
  );
}
