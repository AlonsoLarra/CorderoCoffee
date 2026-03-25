"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast-provider";

type UserRow = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  customer: "Cliente",
  admin: "Admin",
  super_admin: "Super admin",
  guest: "Invitado",
};

export function UserManager() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data: { users?: UserRow[]; error?: string }) => {
        if (data.users) setUsers(data.users);
      })
      .finally(() => setLoading(false));
  }, []);

  async function setRole(userId: string, newRole: "admin" | "customer") {
    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      showToast(body.error ?? "No pudimos actualizar el rol.", "error");
      return;
    }

    showToast(
      newRole === "admin" ? "Usuario promovido a Admin." : "Rol retirado.",
      "success",
    );

    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));

    startTransition(() => {
      router.refresh();
    });
  }

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="mt-10">
      <h2 className="font-heading text-2xl text-cordero-espresso">Gestión de admins</h2>
      <p className="mt-2 text-sm text-cordero-espresso opacity-80">
        Asigna o retira acceso de administrador a cualquier usuario.
      </p>

      <div className="mt-4 rounded-2xl border border-cordero bg-cordero-card p-5">
        <input
          className="w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por correo…"
          value={search}
        />

        {loading ? (
          <p className="mt-4 text-sm text-cordero-espresso opacity-60">Cargando usuarios…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-4 text-sm text-cordero-espresso opacity-60">
            {search ? "Sin resultados." : "No hay usuarios registrados."}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {filtered.map((user) => (
              <li
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cordero px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.email}</p>
                  <p className="text-xs text-cordero-espresso opacity-60">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </p>
                </div>

                {user.role !== "super_admin" && (
                  <button
                    className="shrink-0 rounded-full border border-cordero px-3 py-1 text-xs disabled:opacity-50"
                    disabled={isPending}
                    onClick={() => setRole(user.id, user.role === "admin" ? "customer" : "admin")}
                    type="button"
                  >
                    {user.role === "admin" ? "Retirar admin" : "Hacer admin"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
