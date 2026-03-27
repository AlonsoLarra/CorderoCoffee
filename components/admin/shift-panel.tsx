"use client";

import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/ui/toast-provider";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAY_ABBRS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type Shift = {
  id: string;
  opening_cash: number;
  closing_cash: number | null;
  status: "open" | "closed";
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  expected_opening_cash: number | null;
  actual_opening_cash: number | null;
  opening_discrepancy: number | null;
  cash_sales_total: number;
  card_sales_total: number;
  total_cash_drops: number;
  orders_since_threshold: number;
};

type CloseSummary = {
  totalOrders: number;
  deliveredOrders: number;
  revenue: number;
  cashRevenue: number;
  cardRevenue: number;
  cashOrders: number;
  cardOrders: number;
  expectedClosingCash: number;
  actualClosingCash: number;
  closingDiscrepancy: number;
  cashDrops: Array<{ actual_amount: number; created_at: string }>;
};

type CashBalanceInfo = {
  balance: number;
  needsCashDrop: boolean;
  cashDropRequired: boolean;
  suggestedDropAmount: number;
  ordersUntilRequired: number | null;
  minimumCash: number;
};

const mxn = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

function elapsed(from: string): string {
  const ms = Date.now() - new Date(from).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function ShiftPanel() {
  const { showToast } = useToast();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"main" | "open" | "close" | "cash-drop" | "history" | "daily-close">("main");
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [closeSummary, setCloseSummary] = useState<CloseSummary | null>(null);
  const [elapsedTime, setElapsedTime] = useState("");
  const [cashBalance, setCashBalance] = useState<CashBalanceInfo | null>(null);
  const [expectedOpeningCash, setExpectedOpeningCash] = useState<number>(1000);
  const [blindClose, setBlindClose] = useState(true);

  // Cash drop state
  const [dropAmount, setDropAmount] = useState("");
  const [dropNotes, setDropNotes] = useState("");

  // Daily close state
  const [dailyClosePreview, setDailyClosePreview] = useState<Record<string, unknown> | null>(null);
  const [dailyCloseCash, setDailyCloseCash] = useState("");
  const [dailyCloseNotes, setDailyCloseNotes] = useState("");

  // Calendar state
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [monthShifts, setMonthShifts] = useState<Shift[]>([]);
  const [calLoading, setCalLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [activeRes, settingsRes] = await Promise.all([
        fetch("/api/admin/shifts/active"),
        fetch("/api/admin/settings"),
      ]);
      if (activeRes.ok) {
        const body = (await activeRes.json()) as { shift: Shift | null };
        setActiveShift(body.shift);
      }
      if (settingsRes.ok) {
        const body = (await settingsRes.json()) as { settings: Record<string, string> };
        setExpectedOpeningCash(Number(body.settings.minimum_cash_in_drawer ?? 1000));
        setBlindClose(body.settings.blind_close_enabled !== "false");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadCashBalance() {
    try {
      const res = await fetch("/api/admin/cash-balance");
      if (res.ok) {
        const body = (await res.json()) as CashBalanceInfo;
        setCashBalance(body);
      }
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!activeShift) return;
    void loadCashBalance();
    const interval = setInterval(() => {
      setElapsedTime(elapsed(activeShift.opened_at));
      void loadCashBalance();
    }, 30_000);
    setElapsedTime(elapsed(activeShift.opened_at));
    return () => clearInterval(interval);
  }, [activeShift]);

  const loadMonthShifts = useCallback(async (year: number, month: number) => {
    setCalLoading(true);
    try {
      const res = await fetch(`/api/admin/shifts?year=${year}&month=${month + 1}`);
      if (res.ok) {
        const body = (await res.json()) as { shifts: Shift[] };
        setMonthShifts(body.shifts);
      }
    } finally {
      setCalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "history") {
      void loadMonthShifts(calYear, calMonth);
    }
  }, [view, calYear, calMonth, loadMonthShifts]);

  function prevMonth() {
    setSelectedDay(null);
    if (calMonth === 0) { setCalMonth(11); setCalYear((y: number) => y - 1); }
    else setCalMonth((m: number) => m - 1);
  }

  function nextMonth() {
    setSelectedDay(null);
    if (calMonth === 11) { setCalMonth(0); setCalYear((y: number) => y + 1); }
    else setCalMonth((m: number) => m + 1);
  }

  // ── Open Shift ──
  async function openShift() {
    const cash = Number(openingCash);
    if (isNaN(cash) || cash < 0) {
      showToast("Ingresa un monto de apertura válido.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualOpeningCash: cash, notes: shiftNotes }),
      });
      const body = (await res.json()) as { shift?: Shift; expectedOpeningCash?: number; discrepancy?: number; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Error abriendo turno.");

      setActiveShift(body.shift!);
      setElapsedTime(elapsed(body.shift!.opened_at));

      if (body.discrepancy && body.discrepancy !== 0) {
        const sign = body.discrepancy > 0 ? "+" : "";
        showToast(`Turno abierto. Discrepancia: ${sign}${mxn(body.discrepancy)}`, "error");
      } else {
        showToast("Turno abierto.", "success");
      }

      setOpeningCash("");
      setShiftNotes("");
      setView("main");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Close Shift ──
  async function closeShift() {
    const cash = Number(closingCash);
    if (isNaN(cash) || cash < 0) {
      showToast("Ingresa el efectivo en caja.", "error");
      return;
    }

    // Check if cash drop is needed before closing
    if (cashBalance && cashBalance.balance > cashBalance.minimumCash + 50) {
      const confirmClose = window.confirm(
        `Hay ${mxn(cashBalance.balance)} en caja (mínimo: ${mxn(cashBalance.minimumCash)}). ¿Deseas hacer un corte de caja antes de cerrar el turno?`
      );
      if (confirmClose) {
        setView("cash-drop");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/shifts/close", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualClosingCash: cash, notes: shiftNotes }),
      });
      const body = (await res.json()) as { shift?: Shift; summary?: CloseSummary; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Error cerrando turno.");
      setActiveShift(null);
      setCashBalance(null);
      setCloseSummary(body.summary ?? null);
      setClosingCash("");
      setShiftNotes("");
      setView("main");
      showToast("Turno cerrado.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Cash Drop ──
  async function performCashDrop() {
    const amount = Number(dropAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Ingresa un monto válido para el retiro.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/cash-drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualAmount: amount, notes: dropNotes }),
      });
      const body = (await res.json()) as { newBalance?: number; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Error en corte de caja.");
      showToast(`Corte realizado. Nuevo balance: ${mxn(body.newBalance ?? 0)}`, "success");
      setDropAmount("");
      setDropNotes("");
      setView("main");
      void loadCashBalance();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Daily Close ──
  async function loadDailyClosePreview() {
    try {
      const res = await fetch("/api/admin/daily-closing");
      if (res.ok) {
        const body = (await res.json()) as Record<string, unknown>;
        setDailyClosePreview(body);
      }
    } catch {
      showToast("Error cargando datos del cierre.", "error");
    }
  }

  async function performDailyClose() {
    const cash = Number(dailyCloseCash);
    if (isNaN(cash) || cash < 0) {
      showToast("Ingresa el efectivo final.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/daily-closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualFinalCash: cash, notes: dailyCloseNotes }),
      });
      const body = (await res.json()) as { closing?: unknown; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Error en cierre de día.");
      showToast("Día cerrado exitosamente.", "success");
      setDailyCloseCash("");
      setDailyCloseNotes("");
      setDailyClosePreview(null);
      setView("main");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (view === "daily-close") void loadDailyClosePreview();
  }, [view]);

  if (loading) {
    return <p className="mt-4 text-sm text-cordero-espresso opacity-60">Cargando...</p>;
  }

  // ── Open Shift View ──
  if (view === "open") {
    return (
      <div className="mt-4 max-w-sm space-y-4">
        <h3 className="font-heading text-lg text-cordero-espresso">Abrir turno</h3>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            El sistema espera <strong>{mxn(expectedOpeningCash)}</strong> en caja.
          </p>
          <p className="mt-1 text-xs text-blue-600">
            Cuenta el dinero físico en la caja y confirma el monto real.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-cordero-espresso">Efectivo físico en caja</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
          />
          {openingCash !== "" && (
            <p className={`mt-1 text-xs ${Number(openingCash) === expectedOpeningCash ? "text-green-600" : "text-amber-600"}`}>
              {Number(openingCash) === expectedOpeningCash
                ? "Monto coincide con lo esperado."
                : `Discrepancia: ${Number(openingCash) > expectedOpeningCash ? "+" : ""}${mxn(Number(openingCash) - expectedOpeningCash)}`}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-cordero-espresso">Notas (opcional)</label>
          <textarea
            rows={2}
            value={shiftNotes}
            onChange={(e) => setShiftNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openShift}
            disabled={submitting || openingCash === ""}
            className="rounded-full bg-cordero-espresso px-4 py-2 text-sm text-cordero-cream disabled:opacity-50"
          >
            {submitting ? "Abriendo..." : "Confirmar y abrir turno"}
          </button>
          <button
            type="button"
            onClick={() => setView("main")}
            className="rounded-full border border-cordero px-4 py-2 text-sm text-cordero-espresso"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ── Close Shift View ──
  if (view === "close") {
    return (
      <div className="mt-4 max-w-sm space-y-4">
        <h3 className="font-heading text-lg text-cordero-espresso">Cerrar turno</h3>

        {/* Shift summary before close */}
        {activeShift && cashBalance && (
          <div className="rounded-xl border border-cordero bg-cordero-card p-3 space-y-1">
            <p className="text-xs font-medium text-cordero-espresso">Resumen del turno</p>
            <p className="text-xs text-cordero-espresso opacity-70">
              Apertura: {mxn(activeShift.opening_cash)} ·
              Ventas efectivo: {mxn(Number(activeShift.cash_sales_total))} ·
              Cortes: {mxn(Number(activeShift.total_cash_drops))}
            </p>
            {!blindClose && (
              <p className="text-sm font-medium text-cordero-espresso">
                Efectivo esperado: {mxn(cashBalance.balance)}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-cordero-espresso">
            {blindClose ? "Cuenta el efectivo en caja e ingresa el total" : "Efectivo en caja al cerrar"}
          </label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={closingCash}
            onChange={(e) => setClosingCash(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
          />
          {!blindClose && closingCash !== "" && cashBalance && (
            <p className={`mt-1 text-xs ${Math.abs(Number(closingCash) - cashBalance.balance) < 5 ? "text-green-600" : "text-red-600"}`}>
              Discrepancia: {Number(closingCash) - cashBalance.balance > 0 ? "+" : ""}{mxn(Number(closingCash) - cashBalance.balance)}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-cordero-espresso">Notas (opcional)</label>
          <textarea
            rows={2}
            value={shiftNotes}
            onChange={(e) => setShiftNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={closeShift}
            disabled={submitting || closingCash === ""}
            className="rounded-full bg-cordero-espresso px-4 py-2 text-sm text-cordero-cream disabled:opacity-50"
          >
            {submitting ? "Cerrando..." : "Cerrar turno"}
          </button>
          <button
            type="button"
            onClick={() => setView("main")}
            className="rounded-full border border-cordero px-4 py-2 text-sm text-cordero-espresso"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ── Cash Drop View ──
  if (view === "cash-drop") {
    return (
      <div className="mt-4 max-w-sm space-y-4">
        <h3 className="font-heading text-lg text-cordero-espresso">Corte de caja</h3>
        {cashBalance && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
            <p className="text-sm text-amber-800">
              Balance actual: <strong>{mxn(cashBalance.balance)}</strong>
            </p>
            <p className="text-xs text-amber-700">
              Monto sugerido de retiro: <strong>{mxn(cashBalance.suggestedDropAmount)}</strong>
            </p>
            <p className="text-xs text-amber-600">
              Mínimo a dejar en caja: {mxn(cashBalance.minimumCash)}
            </p>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-cordero-espresso">Monto a retirar</label>
          <input
            type="number"
            min="0"
            placeholder={cashBalance ? String(cashBalance.suggestedDropAmount) : "0"}
            value={dropAmount}
            onChange={(e) => setDropAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
          />
          {dropAmount !== "" && cashBalance && (
            <p className="mt-1 text-xs text-cordero-espresso opacity-70">
              Quedarán en caja: {mxn(cashBalance.balance - Number(dropAmount))}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-cordero-espresso">Notas (opcional)</label>
          <textarea
            rows={2}
            value={dropNotes}
            onChange={(e) => setDropNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={performCashDrop}
            disabled={submitting || dropAmount === ""}
            className="rounded-full bg-cordero-espresso px-4 py-2 text-sm text-cordero-cream disabled:opacity-50"
          >
            {submitting ? "Procesando..." : "Confirmar corte"}
          </button>
          <button
            type="button"
            onClick={() => setView("main")}
            className="rounded-full border border-cordero px-4 py-2 text-sm text-cordero-espresso"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ── Daily Close View ──
  if (view === "daily-close") {
    const p = dailyClosePreview as Record<string, unknown> | null;
    const isClosed = p && p.preview === false;
    const hasOpenShift = p && (p.hasOpenShift as boolean);

    return (
      <div className="mt-4 max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg text-cordero-espresso">Cierre de día</h3>
          <button
            type="button"
            onClick={() => setView("main")}
            className="rounded-full border border-cordero px-3 py-1 text-xs text-cordero-espresso"
          >
            Volver
          </button>
        </div>

        {!p ? (
          <p className="text-sm text-cordero-espresso opacity-60">Cargando...</p>
        ) : isClosed ? (
          <div className="rounded-xl border border-green-300 bg-green-50 p-4">
            <p className="font-medium text-green-800">El día ya fue cerrado.</p>
          </div>
        ) : hasOpenShift ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4">
            <p className="text-sm text-red-800">Debes cerrar todos los turnos antes de hacer el cierre de día.</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-cordero bg-cordero-card p-4 space-y-2">
              <p className="font-medium text-cordero-espresso">Resumen del día</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-cordero-espresso">
                <div>Turnos: <strong>{Number(p.totalShifts)}</strong></div>
                <div>Pedidos: <strong>{Number(p.totalOrders)}</strong></div>
                <div>Ventas efectivo: <strong>{mxn(p.totalCashSales as number)}</strong></div>
                <div>Ventas tarjeta: <strong>{mxn(p.totalCardSales as number)}</strong></div>
                <div>Total ventas: <strong>{mxn(p.totalRevenue as number)}</strong></div>
                <div>Cortes de caja: <strong>{mxn(p.totalCashDrops as number)}</strong></div>
              </div>

              {/* Top products */}
              {Array.isArray(p.topProducts) && (p.topProducts as Array<{ name: string; quantity: number }>).length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-cordero-espresso opacity-70">Productos más vendidos</p>
                  {(p.topProducts as Array<{ name: string; quantity: number }>).slice(0, 5).map((prod, i) => (
                    <p key={i} className="text-xs text-cordero-espresso">
                      {i + 1}. {prod.name} — {prod.quantity} uds.
                    </p>
                  ))}
                </div>
              )}

              {/* Hourly sales */}
              {p.hourlySales != null && typeof p.hourlySales === "object" && Object.keys(p.hourlySales as Record<string, number>).length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-cordero-espresso opacity-70">Ventas por hora</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(p.hourlySales as Record<string, number>)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([hour, count]) => (
                        <span key={hour} className="rounded-full bg-cordero-espresso/10 px-2 py-0.5 text-xs text-cordero-espresso">
                          {hour}: {count}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-cordero-espresso">Efectivo final en caja</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={dailyCloseCash}
                onChange={(e) => setDailyCloseCash(e.target.value)}
                className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cordero-espresso">Notas (opcional)</label>
              <textarea
                rows={2}
                value={dailyCloseNotes}
                onChange={(e) => setDailyCloseNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={performDailyClose}
              disabled={submitting || dailyCloseCash === ""}
              className="rounded-full bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {submitting ? "Cerrando día..." : "Cerrar día (irreversible)"}
            </button>
          </>
        )}
      </div>
    );
  }

  // ── History View ──
  if (view === "history") {
    const firstDay = new Date(calYear, calMonth, 1);
    const startIdx = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === calYear && today.getMonth() === calMonth;

    const shiftDays = new Set<number>();
    for (const s of monthShifts) {
      shiftDays.add(new Date(s.opened_at).getDate());
    }

    const dayShifts = selectedDay
      ? monthShifts.filter((s) => new Date(s.opened_at).getDate() === selectedDay)
      : [];

    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg text-cordero-espresso">Historial de turnos</h3>
          <button
            type="button"
            onClick={() => setView("main")}
            className="rounded-full border border-cordero px-3 py-1 text-xs text-cordero-espresso"
          >
            Volver
          </button>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button type="button" onClick={prevMonth} className="rounded-full border border-cordero px-2.5 py-1 text-sm text-cordero-espresso hover:bg-cordero-card">&lt;</button>
          <span className="min-w-[10rem] text-center font-heading text-cordero-espresso">{MONTH_NAMES[calMonth]} {calYear}</span>
          <button type="button" onClick={nextMonth} className="rounded-full border border-cordero px-2.5 py-1 text-sm text-cordero-espresso hover:bg-cordero-card">&gt;</button>
        </div>

        {calLoading ? (
          <p className="text-center text-sm text-cordero-espresso opacity-60">Cargando...</p>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {DAY_ABBRS.map((d) => (
              <div key={d} className="py-1 text-center text-xs font-medium text-cordero-espresso opacity-50">{d}</div>
            ))}
            {Array.from({ length: startIdx }, (_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const hasShifts = shiftDays.has(day);
              const isSelected = selectedDay === day;
              const isToday = isCurrentMonth && today.getDate() === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors ${
                    isSelected ? "bg-cordero-espresso text-cordero-cream"
                      : hasShifts ? "bg-cordero-card border border-cordero text-cordero-espresso hover:opacity-80"
                        : "text-cordero-espresso hover:bg-cordero-card"
                  } ${isToday && !isSelected ? "font-bold" : ""}`}
                >
                  {day}
                  {hasShifts && (
                    <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-cordero-cream" : "bg-cordero-espresso"}`} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selectedDay !== null && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-cordero-espresso">{selectedDay} de {MONTH_NAMES[calMonth]} {calYear}</h4>
            {dayShifts.length === 0 ? (
              <p className="text-sm text-cordero-espresso opacity-60">Sin turnos este día.</p>
            ) : (
              dayShifts.map((s) => (
                <div key={s.id} className="rounded-xl border border-cordero p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-cordero-espresso">{new Date(s.opened_at).toLocaleString("es-MX")}</p>
                      <p className="mt-0.5 text-xs text-cordero-espresso opacity-60">
                        Apertura: {mxn(s.opening_cash)}
                        {s.closing_cash !== null ? ` · Cierre: ${mxn(s.closing_cash)}` : ""}
                      </p>
                      <p className="text-xs text-cordero-espresso opacity-60">
                        Ventas efectivo: {mxn(Number(s.cash_sales_total))} · Tarjeta: {mxn(Number(s.card_sales_total))}
                      </p>
                      {s.notes && <p className="mt-1 text-xs text-cordero-espresso opacity-60">{s.notes}</p>}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${s.status === "open" ? "bg-green-100 text-green-700" : "bg-cordero-card text-cordero-espresso"}`}>
                      {s.status === "open" ? "Abierto" : "Cerrado"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Main View ──
  return (
    <div className="mt-4 space-y-6">
      {/* Close summary */}
      {closeSummary && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 space-y-2">
          <p className="font-medium text-green-800">Turno cerrado</p>
          <div className="grid grid-cols-2 gap-1 text-sm text-green-700">
            <p>{closeSummary.deliveredOrders} pedidos entregados</p>
            <p>Total: {mxn(closeSummary.revenue)}</p>
            <p>Efectivo: {mxn(closeSummary.cashRevenue)} ({closeSummary.cashOrders})</p>
            <p>Tarjeta: {mxn(closeSummary.cardRevenue)} ({closeSummary.cardOrders})</p>
          </div>
          {closeSummary.closingDiscrepancy !== 0 && (
            <p className={`text-sm font-medium ${closeSummary.closingDiscrepancy > 0 ? "text-amber-700" : "text-red-700"}`}>
              Discrepancia: {closeSummary.closingDiscrepancy > 0 ? "+" : ""}{mxn(closeSummary.closingDiscrepancy)}
            </p>
          )}
          {closeSummary.cashDrops.length > 0 && (
            <p className="text-xs text-green-600">
              {closeSummary.cashDrops.length} corte(s) de caja realizados
            </p>
          )}
          <button type="button" onClick={() => setCloseSummary(null)} className="mt-1 text-xs underline text-green-700">
            Cerrar
          </button>
        </div>
      )}

      {/* Cash drop alert */}
      {cashBalance && cashBalance.needsCashDrop && (
        <div className={`rounded-xl border p-4 space-y-2 ${cashBalance.cashDropRequired ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}`}>
          <p className={`font-medium ${cashBalance.cashDropRequired ? "text-red-800" : "text-amber-800"}`}>
            {cashBalance.cashDropRequired ? "Corte de caja obligatorio" : "Se sugiere corte de caja"}
          </p>
          <p className={`text-sm ${cashBalance.cashDropRequired ? "text-red-700" : "text-amber-700"}`}>
            Balance en caja: {mxn(cashBalance.balance)} · Sugerido retirar: {mxn(cashBalance.suggestedDropAmount)}
          </p>
          {cashBalance.ordersUntilRequired !== null && !cashBalance.cashDropRequired && (
            <p className="text-xs text-amber-600">
              {cashBalance.ordersUntilRequired} pedido(s) más antes de que sea obligatorio.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setDropAmount(String(cashBalance.suggestedDropAmount));
              setView("cash-drop");
            }}
            className={`rounded-full px-4 py-1.5 text-sm text-white ${cashBalance.cashDropRequired ? "bg-red-700" : "bg-amber-700"}`}
          >
            Hacer corte de caja
          </button>
        </div>
      )}

      {/* Active shift */}
      {activeShift ? (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-green-800">Turno activo</p>
              <p className="mt-0.5 text-xs text-green-700">
                Abierto: {new Date(activeShift.opened_at).toLocaleString("es-MX")} · Duración: {elapsedTime}
              </p>
              <p className="text-xs text-green-700">Efectivo apertura: {mxn(activeShift.opening_cash)}</p>
              {cashBalance && (
                <p className="text-sm font-medium text-green-800 mt-1">
                  Balance en caja: {mxn(cashBalance.balance)}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView("cash-drop")}
              className="rounded-full border border-amber-600 px-4 py-1.5 text-sm text-amber-800 hover:bg-amber-50"
            >
              Corte de caja
            </button>
            <button
              type="button"
              onClick={() => setView("close")}
              className="rounded-full border border-green-600 px-4 py-1.5 text-sm text-green-800 hover:bg-green-100"
            >
              Entregar turno
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-cordero bg-cordero-card p-4 space-y-3">
          <p className="text-sm text-cordero-espresso opacity-70">No hay turno activo.</p>
          <button
            type="button"
            onClick={() => setView("open")}
            className="rounded-full bg-cordero-espresso px-4 py-2 text-sm text-cordero-cream"
          >
            Abrir turno
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setView("daily-close")}
          className="text-sm underline text-red-700 opacity-70 hover:opacity-100"
        >
          Cierre de día
        </button>
        <button
          type="button"
          onClick={() => setView("history")}
          className="text-sm underline text-cordero-espresso opacity-60 hover:opacity-80"
        >
          Ver historial
        </button>
      </div>
    </div>
  );
}
