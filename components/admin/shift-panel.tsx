"use client";

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/toast-provider";

type Shift = {
  id: string;
  opening_cash: number;
  closing_cash: number | null;
  status: "open" | "closed";
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
};

type ShiftSummary = {
  totalOrders: number;
  deliveredOrders: number;
  revenue: number;
  cashOrders: number;
  cardOrders: number;
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
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"main" | "open" | "close" | "history">("main");
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [closeSummary, setCloseSummary] = useState<ShiftSummary | null>(null);
  const [elapsedTime, setElapsedTime] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [activeRes, listRes] = await Promise.all([
        fetch("/api/admin/shifts/active"),
        fetch("/api/admin/shifts"),
      ]);
      if (activeRes.ok) {
        const body = (await activeRes.json()) as { shift: Shift | null };
        setActiveShift(body.shift);
      }
      if (listRes.ok) {
        const body = (await listRes.json()) as { shifts: Shift[] };
        setShifts(body.shifts);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!activeShift) return;
    const interval = setInterval(() => setElapsedTime(elapsed(activeShift.opened_at)), 30_000);
    setElapsedTime(elapsed(activeShift.opened_at));
    return () => clearInterval(interval);
  }, [activeShift]);

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
        body: JSON.stringify({ openingCash: cash, notes: shiftNotes }),
      });
      const body = (await res.json()) as { shift?: Shift; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Error abriendo turno.");
      setActiveShift(body.shift!);
      setElapsedTime(elapsed(body.shift!.opened_at));
      setOpeningCash("");
      setShiftNotes("");
      setView("main");
      showToast("Turno abierto.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function closeShift() {
    const cash = Number(closingCash);
    if (isNaN(cash) || cash < 0) {
      showToast("Ingresa el efectivo en caja.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/shifts/close", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingCash: cash, notes: shiftNotes }),
      });
      const body = (await res.json()) as { shift?: Shift; summary?: ShiftSummary; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Error cerrando turno.");
      setActiveShift(null);
      setCloseSummary(body.summary ?? null);
      setClosingCash("");
      setShiftNotes("");
      setView("main");
      void loadData();
      showToast("Turno cerrado.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="mt-4 text-sm text-cordero-espresso opacity-60">Cargando...</p>;
  }

  if (view === "open") {
    return (
      <div className="mt-4 max-w-sm space-y-4">
        <h3 className="font-heading text-lg text-cordero-espresso">Abrir turno</h3>
        <div>
          <label className="block text-xs font-medium text-cordero-espresso">Efectivo en caja al abrir</label>
          <input
            type="number"
            min="0"
            placeholder="0.00"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
          />
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
            disabled={submitting}
            className="rounded-full bg-cordero-espresso px-4 py-2 text-sm text-cordero-cream disabled:opacity-50"
          >
            {submitting ? "Abriendo..." : "Abrir turno"}
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

  if (view === "close") {
    return (
      <div className="mt-4 max-w-sm space-y-4">
        <h3 className="font-heading text-lg text-cordero-espresso">Cerrar turno</h3>
        <div>
          <label className="block text-xs font-medium text-cordero-espresso">Efectivo en caja al cerrar</label>
          <input
            type="number"
            min="0"
            placeholder="0.00"
            value={closingCash}
            onChange={(e) => setClosingCash(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-cordero-espresso">Diferencia estimada</label>
          <p className="mt-1 text-sm text-cordero-espresso">
            {closingCash !== "" && activeShift
              ? mxn(Number(closingCash) - activeShift.opening_cash)
              : "—"}
          </p>
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
            disabled={submitting}
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

  if (view === "history") {
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
        {shifts.length === 0 ? (
          <p className="text-sm text-cordero-espresso opacity-60">Sin turnos registrados.</p>
        ) : (
          <div className="space-y-2">
            {shifts.map((s) => (
              <div key={s.id} className="rounded-xl border border-cordero p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-cordero-espresso">
                      {new Date(s.opened_at).toLocaleString("es-MX")}
                    </p>
                    <p className="mt-0.5 text-xs text-cordero-espresso opacity-60">
                      Apertura: {mxn(s.opening_cash)}
                      {s.closing_cash !== null ? ` · Cierre: ${mxn(s.closing_cash)}` : ""}
                    </p>
                    {s.notes && <p className="mt-1 text-xs text-cordero-espresso opacity-60">{s.notes}</p>}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      s.status === "open"
                        ? "bg-green-100 text-green-700"
                        : "bg-cordero-espresso/10 text-cordero-espresso"
                    }`}
                  >
                    {s.status === "open" ? "Abierto" : "Cerrado"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      {closeSummary && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 space-y-1">
          <p className="font-medium text-green-800">Turno cerrado</p>
          <p className="text-sm text-green-700">
            {closeSummary.deliveredOrders} pedidos entregados · {mxn(closeSummary.revenue)} en ventas
          </p>
          <p className="text-sm text-green-700">
            {closeSummary.cashOrders} en efectivo · {closeSummary.cardOrders} con tarjeta
          </p>
          <button
            type="button"
            onClick={() => setCloseSummary(null)}
            className="mt-1 text-xs underline text-green-700"
          >
            Cerrar
          </button>
        </div>
      )}

      {activeShift ? (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-green-800">Turno activo</p>
              <p className="mt-0.5 text-xs text-green-700">
                Abierto: {new Date(activeShift.opened_at).toLocaleString("es-MX")} · Duración: {elapsedTime}
              </p>
              <p className="text-xs text-green-700">Efectivo apertura: {mxn(activeShift.opening_cash)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setView("close")}
            className="rounded-full border border-green-600 px-4 py-1.5 text-sm text-green-800 hover:bg-green-100"
          >
            Cerrar turno
          </button>
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

      <button
        type="button"
        onClick={() => setView("history")}
        className="text-sm underline text-cordero-espresso opacity-60 hover:opacity-80"
      >
        Ver historial de turnos
      </button>
    </div>
  );
}
