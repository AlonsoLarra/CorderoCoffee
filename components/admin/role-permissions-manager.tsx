"use client";

import { useEffect, useState, useTransition } from "react";

import { useToast } from "@/components/ui/toast-provider";
import type { AdminTabKey } from "@/lib/types/domain";

type TabPermission = {
  tab_key: AdminTabKey;
  allowed: boolean;
};

type RoleConfig = {
  role: string;
  permissions: TabPermission[];
};

const ROLE_LABELS: Record<string, string> = {
  employee: "Empleado",
  admin: "Admin",
};

const TAB_LABELS: Record<AdminTabKey, string> = {
  pedidos: "Pedidos",
  alta: "Alta manual",
  menu: "Menú",
  reportes: "Reportes",
  permisos: "Permisos",
  usuarios: "Usuarios",
};

const TAB_DESCRIPTIONS: Record<AdminTabKey, string> = {
  pedidos: "Ver y mover pedidos en el kanban",
  alta: "Crear pedidos manuales en mostrador",
  menu: "Administrar categorías y productos",
  reportes: "Ver métricas de ventas",
  permisos: "Configurar accesos por rol",
  usuarios: "Gestión de usuarios (solo super admin)",
};

export function RolePermissionsManager({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { showToast } = useToast();
  const [configs, setConfigs] = useState<RoleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/admin/permissions")
      .then((res) => res.json())
      .then((data: { permissions?: RoleConfig[]; error?: string }) => {
        if (data.permissions) setConfigs(data.permissions);
      })
      .finally(() => setLoading(false));
  }, []);

  async function togglePermission(role: string, tab_key: AdminTabKey, current: boolean) {
    const newAllowed = !current;

    // Optimistic update
    setConfigs((prev) =>
      prev.map((cfg) =>
        cfg.role === role
          ? {
              ...cfg,
              permissions: cfg.permissions.map((p) =>
                p.tab_key === tab_key ? { ...p, allowed: newAllowed } : p,
              ),
            }
          : cfg,
      ),
    );

    startTransition(async () => {
      const response = await fetch("/api/admin/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, tab_key, allowed: newAllowed }),
      });

      if (!response.ok) {
        // Revert on error
        setConfigs((prev) =>
          prev.map((cfg) =>
            cfg.role === role
              ? {
                  ...cfg,
                  permissions: cfg.permissions.map((p) =>
                    p.tab_key === tab_key ? { ...p, allowed: current } : p,
                  ),
                }
              : cfg,
          ),
        );
        const body = (await response.json()) as { error?: string };
        showToast(body.error ?? "No pudimos actualizar el permiso.", "error");
      } else {
        showToast(
          `${TAB_LABELS[tab_key]} ${newAllowed ? "habilitado" : "deshabilitado"} para ${ROLE_LABELS[role] ?? role}.`,
          "success",
        );
      }
    });
  }

  if (loading) {
    return <p className="mt-6 text-sm text-cordero-espresso opacity-60">Cargando permisos…</p>;
  }

  if (configs.length === 0) {
    return <p className="mt-6 text-sm text-cordero-espresso opacity-60">No hay roles configurables.</p>;
  }

  return (
    <section className="mt-6 space-y-8">
      {/* Super admin notice */}
      <div className="rounded-xl border border-cordero bg-cordero-card p-4">
        <p className="text-sm font-medium text-cordero-espresso">Super Admin</p>
        <p className="mt-1 text-xs text-cordero-espresso opacity-60">
          Acceso completo a todas las secciones. No se puede modificar.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["pedidos", "alta", "menu", "usuarios", "reportes", "permisos"] as AdminTabKey[]).map((tab) => (
            <span
              key={tab}
              className="rounded-full bg-cordero px-3 py-1 text-xs font-medium text-cordero-card"
            >
              {TAB_LABELS[tab]}
            </span>
          ))}
        </div>
      </div>

      {configs.map((cfg) => {
        // Admin can only edit employee; super_admin can edit both
        const canEdit = isSuperAdmin || cfg.role === "employee";

        return (
          <div key={cfg.role} className="rounded-xl border border-cordero bg-cordero-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cordero-espresso">
                  {ROLE_LABELS[cfg.role] ?? cfg.role}
                </p>
                {!canEdit && (
                  <p className="mt-0.5 text-xs text-cordero-espresso opacity-50">
                    Solo super admin puede modificar este rol.
                  </p>
                )}
              </div>
            </div>

            <ul className="mt-4 divide-y divide-cordero/30">
              {cfg.permissions.map(({ tab_key, allowed }) => (
                <li key={tab_key} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-cordero-espresso">{TAB_LABELS[tab_key as AdminTabKey]}</p>
                    <p className="text-xs text-cordero-espresso opacity-50">
                      {TAB_DESCRIPTIONS[tab_key as AdminTabKey]}
                    </p>
                  </div>

                  <button
                    aria-checked={allowed}
                    aria-label={`${TAB_LABELS[tab_key as AdminTabKey]} para ${ROLE_LABELS[cfg.role] ?? cfg.role}`}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cordero ${
                      allowed ? "bg-cordero" : "bg-cordero/20"
                    } ${!canEdit || isPending ? "cursor-not-allowed opacity-50" : ""}`}
                    disabled={!canEdit || isPending}
                    onClick={() => togglePermission(cfg.role, tab_key as AdminTabKey, allowed)}
                    role="switch"
                    type="button"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                        allowed ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
