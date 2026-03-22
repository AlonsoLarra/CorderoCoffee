import Link from "next/link";

type ConfirmationPageProps = {
  searchParams?: {
    orderId?: string;
  };
};

export default function ConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const orderId = searchParams?.orderId;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-16 sm:px-10">
      <span className="rounded-full border border-cordero bg-cordero-card px-4 py-1 text-xs uppercase tracking-[0.2em] text-cordero-espresso opacity-80">
        Cordero Coffee Club
      </span>

      <h1 className="mt-5 font-heading text-4xl text-cordero-espresso sm:text-5xl">
        Pedido confirmado
      </h1>

      <p className="mt-4 text-cordero-espresso opacity-85">
        Recibimos tu solicitud y el equipo comenzará a prepararla pronto.
      </p>

      <p className="mt-2 text-sm text-cordero-espresso opacity-75">
        Si hiciste el pedido con sesión iniciada, puedes revisar su estado en tiempo real.
      </p>

      <div className="mt-8 rounded-2xl border border-cordero bg-cordero-card p-5">
        <p className="text-sm text-cordero-espresso opacity-80">Número de pedido</p>
        <p className="mt-1 break-all text-lg font-medium text-cordero-espresso">
          {orderId ?? "No disponible"}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        {orderId ? (
          <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href={`/pedido/estado/${orderId}`}>
            Ver estado del pedido
          </Link>
        ) : null}
        <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href="/pedido">
          Volver al menú
        </Link>
        <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href="/">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
