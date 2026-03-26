"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast-provider";
import type { InventoryItem } from "@/lib/types/domain";

type InventoryManagerProps = {
  items: InventoryItem[];
};

const UNIT_OPTIONS = ["unidad", "ml", "l", "g", "kg", "oz", "piezas", "tazas", "sobres"];

export function InventoryManager({ items }: InventoryManagerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Formulario de nuevo insumo
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("unidad");
  const [newStock, setNewStock] = useState(0);
  const [newMinStock, setNewMinStock] = useState<number | "">("");

  // Stock editable en línea: itemId -> valor temporal
  const [editStockMap, setEditStockMap] = useState<Record<string, string>>({});

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function refreshAfter(action: () => Promise<Response>) {
    setErrorMessage(null);
    const response = await action();
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "No pudimos completar la acción.";
      setErrorMessage(message);
      showToast(message, "error");
      return;
    }
    showToast("Operación completada.", "success");
    startTransition(() => {
      router.refresh();
    });
  }

  async function createItem() {
    if (!newName.trim() || !newUnit.trim()) return;

    await refreshAfter(() =>
      fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          unit: newUnit,
          currentStock: Number(newStock),
          minimumStock: newMinStock !== "" ? Number(newMinStock) : null,
        }),
      }),
    );

    setNewName("");
    setNewUnit("unidad");
    setNewStock(0);
    setNewMinStock("");
  }

  async function updateStock(item: InventoryItem) {
    const raw = editStockMap[item.id];
    if (raw === undefined) return;
    const value = Number(raw);
    if (isNaN(value) || value < 0) {
      showToast("El stock debe ser un número mayor o igual a cero.", "error");
      return;
    }

    await refreshAfter(() =>
      fetch(`/api/admin/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStock: value }),
      }),
    );

    setEditStockMap((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  }

  async function deleteItem(itemId: string) {
    await refreshAfter(() =>
      fetch(`/api/admin/inventory/${itemId}`, { method: "DELETE" }),
    );
  }

  function isLowStock(item: InventoryItem): boolean {
    return item.minimum_stock !== null && item.current_stock <= item.minimum_stock;
  }

  return (
    <section className="mt-6 space-y-6">
      {/* Formulario para agregar insumo */}
      <div className="rounded-2xl border border-cordero bg-cordero-card p-5">
        <h3 className="font-heading text-2xl">Agregar insumo</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del insumo"
            value={newName}
          />
          <select
            className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(e) => setNewUnit(e.target.value)}
            value={newUnit}
          >
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            min={0}
            onChange={(e) => setNewStock(Number(e.target.value))}
            placeholder="Stock inicial"
            step="0.01"
            type="number"
            value={newStock}
          />
          <input
            className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            min={0}
            onChange={(e) => setNewMinStock(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Mínimo (alerta)"
            step="0.01"
            type="number"
            value={newMinStock}
          />
        </div>
        <button
          className="mt-3 rounded-full bg-cordero-espresso px-5 py-2 text-xs text-cordero-cream disabled:opacity-50"
          disabled={isPending || !newName.trim()}
          onClick={createItem}
          type="button"
        >
          Agregar insumo
        </button>
      </div>

      {/* Lista de insumos */}
      <div className="rounded-2xl border border-cordero bg-cordero-card p-5">
        <h3 className="font-heading text-2xl">Insumos registrados</h3>

        {items.length === 0 ? (
          <p className="mt-4 text-sm opacity-60">Aún no hay insumos registrados.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cordero text-left text-xs opacity-60">
                  <th className="pb-2 pr-4">Insumo</th>
                  <th className="pb-2 pr-4">Unidad</th>
                  <th className="pb-2 pr-4">Stock actual</th>
                  <th className="pb-2 pr-4">Mínimo</th>
                  <th className="pb-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cordero">
                {items.map((item) => (
                  <tr key={item.id} className="align-middle">
                    <td className="py-2 pr-4 font-medium">
                      <span className="flex items-center gap-2">
                        {item.name}
                        {isLowStock(item) && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                            Stock bajo
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-4 opacity-70">{item.unit}</td>
                    <td className="py-2 pr-4">
                      <span className="flex items-center gap-1">
                        <input
                          className="w-24 rounded-xl border border-cordero bg-transparent px-2 py-1 text-sm"
                          min={0}
                          onBlur={() => updateStock(item)}
                          onChange={(e) =>
                            setEditStockMap((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void updateStock(item);
                          }}
                          step="0.01"
                          type="number"
                          value={editStockMap[item.id] ?? item.current_stock}
                        />
                        <span className="text-xs opacity-60">{item.unit}</span>
                      </span>
                    </td>
                    <td className="py-2 pr-4 opacity-70">
                      {item.minimum_stock !== null ? `${item.minimum_stock} ${item.unit}` : "—"}
                    </td>
                    <td className="py-2">
                      <button
                        className="rounded-full border border-cordero px-3 py-1 text-xs hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        disabled={isPending}
                        onClick={() => deleteItem(item.id)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-cordero px-4 py-3 text-sm">{errorMessage}</p>
      ) : null}
    </section>
  );
}
