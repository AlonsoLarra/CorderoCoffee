"use client";

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/toast-provider";

type Settings = {
  minimum_cash_in_drawer: string;
  cash_drop_threshold: string;
  max_orders_after_threshold: string;
  store_open_time: string;
  store_close_time: string;
  blind_close_enabled: string;
};

const LABELS: Record<keyof Settings, { label: string; description: string; type: "number" | "time" | "boolean" }> = {
  minimum_cash_in_drawer: {
    label: "Mínimo en caja",
    description: "Cantidad mínima de efectivo que debe permanecer en caja en todo momento.",
    type: "number",
  },
  cash_drop_threshold: {
    label: "Umbral para corte de caja",
    description: "Cuando el efectivo en caja alcance este monto, se sugiere un corte.",
    type: "number",
  },
  max_orders_after_threshold: {
    label: "Pedidos antes de corte obligatorio",
    description: "Número de pedidos en efectivo permitidos después de alcanzar el umbral antes de obligar el corte.",
    type: "number",
  },
  store_open_time: {
    label: "Horario de apertura",
    description: "Hora de apertura del café (referencia).",
    type: "time",
  },
  store_close_time: {
    label: "Horario de cierre",
    description: "Hora de cierre del café (referencia).",
    type: "time",
  },
  blind_close_enabled: {
    label: "Cierre ciego",
    description: "Si está activado, el empleado no ve el monto esperado al cerrar turno. Reduce posibilidad de ajustar el conteo.",
    type: "boolean",
  },
};

const mxn = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

export function StoreSettingsPanel() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const body = (await res.json()) as { settings: Record<string, string> };
          setSettings(body.settings as unknown as Settings);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function updateSetting(key: keyof Settings, value: string) {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setDirty(true);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const body = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Error guardando.");
      showToast("Configuración guardada.", "success");
      setDirty(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="mt-4 text-sm text-cordero-espresso opacity-60">Cargando configuración...</p>;
  }

  if (!settings) {
    return <p className="mt-4 text-sm text-red-600">No se pudo cargar la configuración.</p>;
  }

  return (
    <div className="mt-4 max-w-lg space-y-6">
      <h3 className="font-heading text-lg text-cordero-espresso">Configuración de la tienda</h3>

      {(Object.keys(LABELS) as Array<keyof Settings>).map((key) => {
        const config = LABELS[key];
        return (
          <div key={key} className="space-y-1">
            <label className="block text-sm font-medium text-cordero-espresso">{config.label}</label>
            <p className="text-xs text-cordero-espresso opacity-60">{config.description}</p>

            {config.type === "number" && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={settings[key]}
                  onChange={(e) => updateSetting(key, e.target.value)}
                  className="w-32 rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                />
                <span className="text-xs text-cordero-espresso opacity-50">
                  {mxn(Number(settings[key]))}
                </span>
              </div>
            )}

            {config.type === "time" && (
              <input
                type="time"
                value={settings[key]}
                onChange={(e) => updateSetting(key, e.target.value)}
                className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              />
            )}

            {config.type === "boolean" && (
              <button
                type="button"
                onClick={() => updateSetting(key, settings[key] === "true" ? "false" : "true")}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  settings[key] === "true"
                    ? "bg-green-600 text-white"
                    : "bg-cordero-card text-cordero-espresso border border-cordero"
                }`}
              >
                {settings[key] === "true" ? "Activado" : "Desactivado"}
              </button>
            )}
          </div>
        );
      })}

      {dirty && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-cordero-espresso px-6 py-2 text-sm text-cordero-cream disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      )}
    </div>
  );
}
