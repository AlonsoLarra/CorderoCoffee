"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cordero-cream px-6 text-center text-cordero-espresso">
      <h1 className="font-heading text-2xl">Algo salió mal</h1>
      <p className="max-w-xs text-sm opacity-60">
        Ocurrió un error inesperado. Por favor intenta de nuevo.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-cordero-espresso px-6 py-2.5 text-sm font-semibold text-cordero-cream transition-opacity hover:opacity-80"
        >
          Reintentar
        </button>
        <a
          href="/"
          className="rounded-full border border-cordero px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-60"
        >
          Inicio
        </a>
      </div>
    </main>
  );
}
