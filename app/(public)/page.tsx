import Image from "next/image";

export default function ComingSoonPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
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

      {/* Brand logo */}
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

      {/* Heading */}
      <h1
        className="font-heading max-w-md text-balance text-2xl leading-[1.3] sm:text-3xl"
        style={{ color: "hsl(22 38% 18% / 0.82)" }}
      >
        Estamos preparando algo especial
      </h1>

      {/* Subheading */}
      <p
        className="mx-auto mt-5 max-w-sm text-balance text-base leading-relaxed"
        style={{ color: "hsl(22 38% 18% / 0.48)" }}
      >
        Nuestra plataforma está en construcción. Muy pronto podrás ordenar tu café de especialidad en línea.
      </p>

      {/* Decorative coffee bean divider */}
      <div className="mt-12 flex items-center gap-3">
        <div
          className="h-px w-8"
          style={{ background: "hsl(22 38% 18% / 0.10)" }}
        />
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: "hsl(22 38% 18% / 0.28)" }}
        >
          Próximamente
        </span>
        <div
          className="h-px w-8"
          style={{ background: "hsl(22 38% 18% / 0.10)" }}
        />
      </div>

      {/* Footer */}
      <footer className="absolute inset-x-0 bottom-0 px-8 py-8">
        <p
          className="text-center text-[9px] uppercase tracking-[0.25em]"
          style={{ color: "hsl(22 38% 18% / 0.22)" }}
        >
          © {new Date().getFullYear()} — Cordero Coffee Club
        </p>
      </footer>
    </main>
  );
}
