import Image from "next/image";
import Link from "next/link";

import { COPY } from "@/lib/copy";

export default function PublicHomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center overflow-hidden px-6 py-14 sm:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-14 h-80 w-80 -translate-x-1/2 rounded-full bg-cordero-espresso/10 blur-3xl" />
        <div className="absolute bottom-10 left-8 h-44 w-44 rounded-full bg-cordero-card/80 blur-2xl" />
        <div className="absolute right-6 top-1/4 h-52 w-52 rounded-full bg-cordero-espresso/10 blur-3xl" />
      </div>

      <nav className="mb-8 flex w-full max-w-xl items-center justify-center gap-3 rounded-full border border-cordero/80 bg-cordero-card/80 p-2 shadow-sm backdrop-blur">
        <Link
          href="#acerca-de-nosotros"
          className="rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-cordero-espresso transition hover:bg-cordero-cream"
        >
          Acerca de nosotros
        </Link>
        <Link
          href="/acceso"
          className="rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-cordero-espresso transition hover:bg-cordero-cream"
        >
          Iniciar sesion
        </Link>
      </nav>

      <section className="w-full max-w-3xl rounded-[2rem] border border-cordero/70 bg-cordero-card/60 p-6 shadow-[0_30px_80px_-55px_rgba(40,22,12,0.55)] backdrop-blur-sm sm:p-10">
        <div className="relative mx-auto mb-8 w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-cordero/50 bg-cordero-espresso/95 p-3">
          <div className="relative overflow-hidden rounded-[1.2rem]">
            <Image
              src="/logo.png"
              alt="Cordero Coffee Club"
              width={900}
              height={600}
              priority
              className="h-auto w-full object-cover opacity-95 [mask-image:radial-gradient(ellipse_at_center,_black_58%,_transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,_black_58%,_transparent_100%)]"
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_36%,rgba(17,10,6,0.35)_100%)]" />
          </div>
        </div>

        <p
          id="acerca-de-nosotros"
          className="mx-auto max-w-2xl text-center text-xl leading-relaxed text-cordero-espresso/90 sm:text-2xl"
        >
          {COPY.brand.intro}
        </p>

        <div className="mt-10 flex justify-center">
          <Link
            href="/pedido"
            className="rounded-full bg-cordero-espresso px-9 py-4 text-sm font-semibold uppercase tracking-[0.09em] text-cordero-cream shadow-[0_18px_35px_-20px_rgba(44,25,16,0.85)] transition hover:translate-y-[-1px] hover:opacity-95"
          >
            {COPY.actions.startOrder}
          </Link>
        </div>
      </section>
    </main>
  );
}
