interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-cordero p-4">
      <p className="text-xs text-cordero-espresso opacity-60">{label}</p>
      <p className="mt-1 font-heading text-xl text-cordero-espresso">{value}</p>
    </div>
  );
}

interface TopProduct {
  name: string;
  total: number;
}

interface ReportsPanelProps {
  todayOrderCount: number;
  todayRevenue: number;
  todayDelivered: number;
  todayPending: number;
  weekOrderCount: number;
  weekRevenue: number;
  topProducts: TopProduct[];
}

const mxnFormat = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

export function ReportsPanel({
  todayOrderCount,
  todayRevenue,
  todayDelivered,
  todayPending,
  weekOrderCount,
  weekRevenue,
  topProducts,
}: ReportsPanelProps) {
  return (
    <section className="mt-12 rounded-2xl border border-cordero bg-cordero-card p-5">
      <h2 className="font-heading text-2xl text-cordero-espresso">Reportes</h2>
      <p className="mt-1 text-sm text-cordero-espresso opacity-70">
        Resumen de actividad del negocio.
      </p>

      {/* Hoy */}
      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
        Hoy
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total de pedidos" value={String(todayOrderCount)} />
        <StatCard label="Ingresos estimados" value={mxnFormat(todayRevenue)} />
        <StatCard
          label="Entregados vs pendientes"
          value={`${todayDelivered} / ${todayPending}`}
        />
      </div>

      {/* Esta semana */}
      <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
        Esta semana
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total de pedidos" value={String(weekOrderCount)} />
        <StatCard label="Ingresos totales" value={mxnFormat(weekRevenue)} />
      </div>

      {/* Top 5 productos */}
      <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
        Top 5 productos mas pedidos (ultimos 7 dias)
      </h3>
      {topProducts.length === 0 ? (
        <p className="mt-3 text-sm text-cordero-espresso opacity-60">
          Sin datos disponibles.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {topProducts.map((product, index) => (
            <li
              key={product.name}
              className="flex items-center justify-between rounded-xl border border-cordero p-4"
            >
              <span className="text-sm text-cordero-espresso">
                <span className="mr-2 font-heading text-base">{index + 1}.</span>
                {product.name}
              </span>
              <span className="font-heading text-base text-cordero-espresso">
                {product.total} uds.
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
