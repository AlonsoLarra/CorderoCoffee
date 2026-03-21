import Image from "next/image";
import Link from "next/link";

import { COPY } from "@/lib/copy";

export default function PublicHomePage() {
  return (
    <main>
      {/* ── NAVIGATION ─────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 sm:px-14 sm:py-6">
        <span className="font-heading text-xs uppercase tracking-[0.22em] text-cordero-espresso">
          Cordero
        </span>
        <nav className="flex items-center gap-6 sm:gap-8">
          <Link
            href="#nosotros"
            className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-cordero-espresso opacity-40 transition-opacity duration-300 hover:opacity-100 sm:block"
          >
            Acerca de nosotros
          </Link>
          <Link
            href="/acceso"
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cordero-espresso opacity-40 transition-opacity duration-300 hover:opacity-100"
          >
            Iniciar sesión
          </Link>
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
          <Link
            href="#nosotros"
            className="px-10 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-cordero-espresso transition-opacity duration-300 hover:opacity-50"
            style={{ border: "1px solid hsl(22 38% 18% / 0.18)" }}
          >
            Conocer más
          </Link>
        </div>

        {/* Scroll whisper */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ opacity: 0.22 }}
          aria-hidden
        >
          <span className="text-[8px] uppercase tracking-[0.3em] text-cordero-espresso">
            scroll
          </span>
          <div className="h-8 w-px bg-cordero-espresso" />
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      <section id="nosotros" className="px-6 py-28 sm:px-14">
        <div className="mx-auto max-w-5xl">
          {/* Section label */}
          <div className="mb-20 flex items-center gap-5">
            <div
              className="h-px flex-1"
              style={{ background: "hsl(22 38% 18% / 0.1)" }}
            />
            <span
              className="text-[9px] font-semibold uppercase tracking-[0.36em]"
              style={{ color: "hsl(22 38% 18% / 0.32)" }}
            >
              Cómo funciona
            </span>
            <div
              className="h-px flex-1"
              style={{ background: "hsl(22 38% 18% / 0.1)" }}
            />
          </div>

          <div className="grid gap-14 md:grid-cols-3 md:gap-10">
            {[
              {
                n: "01",
                title: "Ordena en línea",
                body: "Explora el menú completo y arma tu pedido desde donde estés, sin filas ni esperas innecesarias.",
              },
              {
                n: "02",
                title: "Elige tu momento",
                body: "Agenda la hora de recolección o pide para cuando llegues. Tu ritmo, tu café.",
              },
              {
                n: "03",
                title: "Sigue tu bebida",
                body: "Monitorea el estado en tiempo real. Sabrás exactamente cuándo estará listo.",
              },
            ].map((f) => (
              <article key={f.n} className="flex flex-col">
                <span
                  className="mb-5 font-heading text-6xl font-medium leading-none"
                  style={{ color: "hsl(22 38% 18% / 0.06)" }}
                >
                  {f.n}
                </span>
                <div
                  className="mb-5 h-px w-8"
                  style={{ background: "hsl(19 47% 47% / 0.55)" }}
                />
                <h3 className="mb-3 font-heading text-xl text-cordero-espresso">
                  {f.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "hsl(22 38% 18% / 0.52)" }}
                >
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── MANIFESTO ──────────────────────────────────────────── */}
      <section className="bg-cordero-espresso px-6 py-28 sm:px-14">
        <div className="mx-auto max-w-3xl text-center">
          {/* Official lamb icon — cream version on dark bg */}
          <div className="mx-auto mb-10 h-14 w-14 opacity-30">
            <Image
              src="/icono-crema.svg"
              alt=""
              width={621}
              height={736}
              className="h-full w-full"
              unoptimized
            />
          </div>
          <p className="font-heading text-3xl leading-[1.35] text-cordero-cream sm:text-4xl md:text-[2.75rem]">
            &ldquo;Un café bien hecho,
            <br />
            en el barrio que amás.&rdquo;
          </p>
          <div
            className="mx-auto my-10 h-px w-12"
            style={{ background: "hsl(34 26% 88% / 0.2)" }}
          />
          <Link
            href="/pedido"
            className="inline-block px-10 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-cordero-cream transition-opacity duration-300 hover:opacity-60"
            style={{ border: "1px solid hsl(34 26% 88% / 0.28)" }}
          >
            {COPY.actions.startOrder}
          </Link>
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
            © {new Date().getFullYear()} — Café artesanal con alma de barrio
          </span>
          <Link
            href="/acceso"
            className="text-[10px] uppercase tracking-[0.2em] transition-opacity duration-300 hover:opacity-70"
            style={{ color: "hsl(34 26% 88% / 0.32)" }}
          >
            Iniciar sesión
          </Link>
        </div>
      </footer>
    </main>
  );
}
