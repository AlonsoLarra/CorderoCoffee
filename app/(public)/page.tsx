import Link from "next/link";

import { COPY } from "@/lib/copy";

function LambIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Body — organic fluffy curve, not a geometric ellipse */}
      <path
        d="M 48 92 C 44 74 58 60 82 57 C 106 54 126 62 132 78 C 138 94 130 116 110 124 C 90 132 62 128 48 114 C 36 102 40 96 48 92 Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Neck */}
      <path
        d="M 126 78 C 130 68 132 60 130 52"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Head */}
      <path
        d="M 130 52 C 128 40 138 32 150 36 C 162 40 166 54 158 64 C 150 74 136 73 130 64 C 128 60 128 56 130 52 Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Left ear */}
      <path
        d="M 136 38 C 130 26 138 18 144 30"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right ear */}
      <path
        d="M 150 34 C 152 22 162 24 156 36"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Eye */}
      <circle cx="150" cy="50" r="3" fill="currentColor" />
      {/* Muzzle */}
      <path
        d="M 158 60 C 162 64 160 70 155 70"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Front right leg — slightly raised/forward for walking pose */}
      <path
        d="M 108 122 C 108 136 106 152 104 168"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Front left leg */}
      <path
        d="M 94 126 C 94 140 94 156 94 172"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Back right leg */}
      <path
        d="M 70 126 C 68 140 66 156 64 170"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Back left leg */}
      <path
        d="M 56 120 C 53 134 50 150 48 164"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Tail */}
      <path
        d="M 48 88 C 38 78 36 66 44 60"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

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

        {/* Brand lockup — vertical logo as in brand manual */}
        <div className="mb-12 flex flex-col items-center">
          <LambIcon className="mb-5 h-20 w-20 text-cordero-espresso sm:h-24 sm:w-24" />

          <p
            className="font-heading text-5xl font-bold uppercase leading-none tracking-[0.06em] text-cordero-espresso sm:text-6xl md:text-7xl"
          >
            Cordero
          </p>
          <p
            className="mt-2 font-heading text-[11px] font-semibold uppercase tracking-[0.52em]"
            style={{ color: "hsl(22 38% 18% / 0.6)" }}
          >
            Coffee Club
          </p>
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
          {/* Lamb icon inverted */}
          <LambIcon className="mx-auto mb-10 h-14 w-14 text-cordero-cream opacity-25" />
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
