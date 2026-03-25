import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cordero-cream px-6 text-center text-cordero-espresso">
      <p className="font-heading text-8xl font-semibold opacity-20">404</p>
      <h1 className="font-heading text-2xl">Página no encontrada</h1>
      <p className="max-w-xs text-sm opacity-60">
        La página que buscas no existe o fue movida.
      </p>
      <Link
        href="/"
        className="rounded-full bg-cordero-espresso px-6 py-2.5 text-sm font-semibold text-cordero-cream transition-opacity hover:opacity-80"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
