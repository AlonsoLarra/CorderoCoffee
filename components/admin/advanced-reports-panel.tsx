"use client";

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/toast-provider";

const mxn = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

type SalesData = {
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  topProducts: { name: string; total: number }[];
};

type HourlyRow = { hour: number; orders: number; revenue: number };

type PaymentMethodData = {
  paymentMethods: Record<string, { orders: number; revenue: number }>;
  totalRevenue: number;
  totalOrders: number;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card_pending: "Tarjeta al retirar",
  card_online: "Tarjeta en línea",
};

export function AdvancedReportsPanel() {
  const { showToast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(sevenDaysAgo);
  const [to, setTo] = useState(today);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyRow[] | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentMethodData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function loadReports() {
    setLoading(true);
    try {
      const params = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const [salesRes, hourlyRes, paymentRes] = await Promise.all([
        fetch(`/api/admin/reports?type=sales&${params}`),
        fetch(`/api/admin/reports?type=hourly&${params}`),
        fetch(`/api/admin/reports?type=payment-methods&${params}`),
      ]);

      if (salesRes.ok) setSalesData((await salesRes.json()) as SalesData);
      if (hourlyRes.ok) setHourlyData(((await hourlyRes.json()) as { hourly: HourlyRow[] }).hourly);
      if (paymentRes.ok) setPaymentData((await paymentRes.json()) as PaymentMethodData);
    } catch {
      showToast("Error cargando reportes.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Load on mount only
  useEffect(() => { void loadReports(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function exportCSV() {
    setExporting(true);
    try {
      const params = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await fetch(`/api/admin/reports/export?${params}`);
      if (!res.ok) throw new Error("Error exportando.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ventas_${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Error exportando.", "error");
    } finally {
      setExporting(false);
    }
  }

  const maxHourlyOrders = hourlyData ? Math.max(...hourlyData.map((h) => h.orders), 1) : 1;

  return (
    <div className="mt-4 space-y-8">
      {/* Date range filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-cordero-espresso opacity-70">Desde</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 rounded-xl border border-cordero bg-transparent px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-cordero-espresso opacity-70">Hasta</label>
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 rounded-xl border border-cordero bg-transparent px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={loadReports}
          disabled={loading}
          className="rounded-full bg-cordero-espresso px-4 py-2 text-sm text-cordero-cream disabled:opacity-50"
        >
          {loading ? "Cargando..." : "Consultar"}
        </button>
        <button
          type="button"
          onClick={exportCSV}
          disabled={exporting}
          className="rounded-full border border-cordero px-4 py-2 text-sm text-cordero-espresso disabled:opacity-50"
        >
          {exporting ? "Exportando..." : "Exportar CSV"}
        </button>
      </div>

      {/* Summary cards */}
      {salesData && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
            Resumen del período
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-cordero p-4">
              <p className="text-xs text-cordero-espresso opacity-60">Pedidos entregados</p>
              <p className="mt-1 font-heading text-xl text-cordero-espresso">{salesData.totalOrders}</p>
            </div>
            <div className="rounded-xl border border-cordero p-4">
              <p className="text-xs text-cordero-espresso opacity-60">Ingresos totales</p>
              <p className="mt-1 font-heading text-xl text-cordero-espresso">{mxn(salesData.totalRevenue)}</p>
            </div>
            <div className="rounded-xl border border-cordero p-4">
              <p className="text-xs text-cordero-espresso opacity-60">Ticket promedio</p>
              <p className="mt-1 font-heading text-xl text-cordero-espresso">{mxn(salesData.avgTicket)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Hourly distribution */}
      {hourlyData && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
            Distribución por hora
          </h3>
          <div className="mt-3 flex items-end gap-1 overflow-x-auto rounded-xl border border-cordero p-4">
            {hourlyData.map((h) => (
              <div key={h.hour} className="flex flex-1 min-w-[24px] flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-sm bg-cordero-espresso"
                  style={{
                    height: `${Math.round((h.orders / maxHourlyOrders) * 64)}px`,
                    minHeight: h.orders > 0 ? "4px" : "0",
                    opacity: h.orders > 0 ? 0.85 : 0.1,
                  }}
                  title={`${h.orders} pedidos`}
                />
                <span className="text-[10px] text-cordero-espresso opacity-50">{h.hour}</span>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-cordero-espresso opacity-40">Hora del día (pedidos entregados)</p>
        </div>
      )}

      {/* Payment method breakdown */}
      {paymentData && Object.keys(paymentData.paymentMethods).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
            Métodos de pago
          </h3>
          <div className="mt-3 space-y-2">
            {(Object.entries(paymentData.paymentMethods) as Array<[string, { orders: number; revenue: number }]>).map(([method, stats]) => {
              const pct = paymentData.totalRevenue > 0 ? (stats.revenue / paymentData.totalRevenue) * 100 : 0;
              return (
                <div key={method} className="rounded-xl border border-cordero p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-cordero-espresso">{PAYMENT_LABELS[method] ?? method}</span>
                    <span className="text-cordero-espresso">
                      {stats.orders} ped. · {mxn(stats.revenue)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-cordero-espresso/10">
                    <div
                      className="h-1.5 rounded-full bg-cordero-espresso"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top products */}
      {salesData && salesData.topProducts.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
            Top productos
          </h3>
          <ol className="mt-3 space-y-2">
            {salesData.topProducts.map((p, i) => (
              <li key={p.name} className="flex items-center justify-between rounded-xl border border-cordero p-3">
                <span className="text-sm text-cordero-espresso">
                  <span className="mr-2 font-heading">{i + 1}.</span>
                  {p.name}
                </span>
                <span className="font-heading text-base text-cordero-espresso">{p.total} uds.</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!loading && !salesData && (
        <p className="text-sm text-cordero-espresso opacity-60">Sin datos para el período seleccionado.</p>
      )}
    </div>
  );
}
