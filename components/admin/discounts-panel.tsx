"use client";

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/toast-provider";

type DiscountCode = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

const mxn = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

export function DiscountsPanel() {
  const { showToast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: "",
    type: "percent" as "percent" | "fixed",
    value: "",
    maxUses: "",
    expiresAt: "",
  });

  async function loadCodes() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/discounts");
      if (res.ok) {
        const body = (await res.json()) as { discounts: DiscountCode[] };
        setCodes(body.discounts);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCodes();
  }, []);

  async function createCode() {
    if (!form.code.trim() || !form.value) {
      showToast("Completa el código y el valor.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Number(form.value),
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
        }),
      });
      const body = (await res.json()) as { discount?: DiscountCode; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Error creando código.");
      setCodes((prev) => [body.discount!, ...prev]);
      setForm({ code: "", type: "percent", value: "", maxUses: "", expiresAt: "" });
      setShowForm(false);
      showToast("Código creado.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error("Error actualizando.");
      setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: !current } : c)));
      showToast(!current ? "Código activado." : "Código desactivado.", "success");
    } catch {
      showToast("Error actualizando.", "error");
    }
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cordero-espresso opacity-70">Gestiona los códigos de descuento.</p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full bg-cordero-espresso px-4 py-1.5 text-sm text-cordero-cream"
        >
          {showForm ? "Cancelar" : "+ Nuevo código"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-cordero p-4 space-y-3">
          <h3 className="font-heading text-base text-cordero-espresso">Nuevo código</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-cordero-espresso">Código</label>
              <input
                type="text"
                placeholder="VERANO20"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cordero-espresso">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "percent" | "fixed" }))}
                className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              >
                <option value="percent">Porcentaje (%)</option>
                <option value="fixed">Monto fijo ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-cordero-espresso">
                Valor {form.type === "percent" ? "(%)" : "(MXN)"}
              </label>
              <input
                type="number"
                min="0"
                max={form.type === "percent" ? "100" : undefined}
                placeholder={form.type === "percent" ? "20" : "50"}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cordero-espresso">Usos máximos</label>
              <input
                type="number"
                min="1"
                placeholder="Ilimitado"
                value={form.maxUses}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-cordero-espresso">Fecha de expiración</label>
              <input
                type="date"
                value={form.expiresAt}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="mt-1 rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={createCode}
            disabled={submitting}
            className="rounded-full bg-cordero-espresso px-4 py-2 text-sm text-cordero-cream disabled:opacity-50"
          >
            {submitting ? "Creando..." : "Crear código"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-cordero-espresso opacity-60">Cargando...</p>
      ) : codes.length === 0 ? (
        <p className="text-sm text-cordero-espresso opacity-60">Sin códigos creados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-cordero">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cordero">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
                  Descuento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
                  Usos
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
                  Expira
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-cordero last:border-0">
                  <td className="px-4 py-3 font-mono text-sm text-cordero-espresso">{c.code}</td>
                  <td className="px-4 py-3 text-cordero-espresso">
                    {c.type === "percent" ? `${c.value}%` : mxn(c.value)}
                  </td>
                  <td className="px-4 py-3 text-cordero-espresso opacity-70">
                    {c.used_count}{c.max_uses !== null ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-cordero-espresso opacity-70">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString("es-MX") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleActive(c.id, c.is_active)}
                      className={`rounded-full px-3 py-1 text-xs ${
                        c.is_active
                          ? "bg-green-100 text-green-700"
                          : "border border-cordero text-cordero-espresso opacity-50"
                      }`}
                    >
                      {c.is_active ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
