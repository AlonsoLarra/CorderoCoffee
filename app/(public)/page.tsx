import Image from "next/image";
import Link from "next/link";

import { COPY } from "@/lib/copy";

export default function PublicHomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center overflow-hidden px-6 py-12 sm:px-10 sm:py-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(120,90,72,0.14),transparent_33%),radial-gradient(circle_at_85%_12%,rgba(66,38,24,0.08),transparent_28%),radial-gradient(circle_at_50%_70%,rgba(255,255,255,0.56),transparent_42%)]" />
        <div className="absolute left-1/2 top-[42%] h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cordero-espresso/10 blur-[110px]" />
      </div>

      <nav className="mb-12 flex w-full max-w-xl items-center justify-center rounded-full border border-cordero/60 bg-cordero-card/70 p-1.5 shadow-[0_12px_40px_-30px_rgba(0,0,0,0.75)] backdrop-blur">
        <Link
          href="#acerca-de-nosotros"
          className="rounded-full px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cordero-espresso/80 transition hover:bg-cordero-cream/80 hover:text-cordero-espresso"
        >
          Acerca de nosotros
        </Link>
        <Link
          href="/acceso"
          className="rounded-full px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cordero-espresso/80 transition hover:bg-cordero-cream/80 hover:text-cordero-espresso"
        >
          Iniciar sesion
        </Link>
      </nav>

      <section className="w-full max-w-4xl text-center">
        <div className="relative mx-auto w-full max-w-[34rem]">
          <div className="absolute inset-x-8 top-0 h-24 rounded-full bg-cordero-cream/75 blur-3xl" />
          <div className="absolute inset-x-14 bottom-3 h-24 rounded-full bg-cordero-espresso/20 blur-3xl" />
          <Image
            src="/logo.png"
            alt="Cordero Coffee Club"
            width={960}
            height={640}
            priority
            className="relative z-10 mx-auto h-auto w-full object-cover mix-blend-multiply opacity-95 [mask-image:radial-gradient(ellipse_at_center,_black_54%,_black_66%,_transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,_black_54%,_black_66%,_transparent_100%)]"
          />
        </div>

        <p
          id="acerca-de-nosotros"
          className="mx-auto mt-4 max-w-3xl text-balance font-heading text-3xl leading-[1.25] text-cordero-espresso/95 sm:text-4xl"
        >
          {COPY.brand.tagline}
        </p>

        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-relaxed text-cordero-espresso/80 sm:text-xl">
          {COPY.brand.intro}
        </p>

        <div className="mt-10 flex justify-center">
          <Link
            href="/pedido"
            className="rounded-full border border-cordero-espresso/10 bg-cordero-espresso px-10 py-4 text-sm font-semibold uppercase tracking-[0.13em] text-cordero-cream shadow-[0_16px_30px_-18px_rgba(45,25,14,0.9)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_34px_-18px_rgba(45,25,14,0.95)]"
          >
            {COPY.actions.startOrder}
          </Link>
        </div>
      </section>
    </main>
  );
}
