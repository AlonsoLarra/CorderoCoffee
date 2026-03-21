import Image from "next/image";
import Link from "next/link";

import { COPY } from "@/lib/copy";

export default function PublicHomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-start justify-center px-6 py-16 sm:px-10">
      <nav className="mb-8 flex items-center gap-3">
        <Link
          href="#acerca-de-nosotros"
          className="rounded-full border border-cordero px-5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-cordero-espresso transition hover:bg-cordero-card"
        >
          Acerca de nosotros
        </Link>
        <Link
          href="/acceso"
          className="rounded-full border border-cordero px-5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-cordero-espresso transition hover:bg-cordero-card"
        >
          Iniciar sesion
        </Link>
      </nav>

      <Image
        src="/logo.png"
        alt="Cordero Coffee Club"
        width={360}
        height={255}
        priority
        className="mb-8"
      />

      <p
        id="acerca-de-nosotros"
        className="mt-5 max-w-2xl text-base leading-relaxed text-cordero-espresso opacity-90 sm:text-lg"
      >
        {COPY.brand.intro}
      </p>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/pedido"
          className="rounded-full bg-cordero-espresso px-6 py-3 text-sm font-medium text-cordero-cream transition hover:opacity-90"
        >
          {COPY.actions.startOrder}
        </Link>
      </div>
    </main>
  );
}
