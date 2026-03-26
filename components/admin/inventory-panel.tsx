"use client";

import { useState } from "react";

import { useToast } from "@/components/ui/toast-provider";

type InventoryItem = {
  id: string;
  name: string;
  track_stock: boolean;
  stock_quantity: number | null;
  low_stock_alert: number;
  is_active: boolean;
};

type InventoryPanelProps = {
  items: InventoryItem[];
};

function StockBadge({ item }: { item: InventoryItem }) {
  if (!item.track_stock) return <span className="text-xs text-cordero-espresso opacity-40">Sin control</span>;
  if (item.stock_quantity === null || item.stock_quantity === undefined)
    return <span className="text-xs text-cordero-espresso opacity-40">Ilimitado</span>;
  if (item.stock_quantity === 0)
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Agotado</span>;
  if (item.stock_quantity <= item.low_stock_alert)
    return (
      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
        Stock bajo ({item.stock_quantity})
      </span>
    );
  return (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">{item.stock_quantity} uds.</span>
  );
}

export function InventoryPanel({ items: initialItems }: InventoryPanelProps) {
  const { showToast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    trackStock: boolean;
    stockQuantity: string;
    lowStockAlert: string;
  }>({ trackStock: false, stockQuantity: "", lowStockAlert: "5" });
  const [saving, setSaving] = useState(false);

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setEditValues({
      trackStock: item.track_stock,
      stockQuantity: item.stock_quantity !== null ? String(item.stock_quantity) : "",
      lowStockAlert: String(item.low_stock_alert ?? 5),
    });
  }

  async function saveStock(itemId: string) {
    setSaving(true);
    try {
      const stockQuantity =
        editValues.trackStock && editValues.stockQuantity !== ""
          ? parseInt(editValues.stockQuantity, 10)
          : null;

      const res = await fetch("/api/admin/menu/items/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          trackStock: editValues.trackStock,
          stockQuantity,
          lowStockAlert: parseInt(editValues.lowStockAlert, 10) || 5,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error guardando.");
      }

      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? {
                ...it,
                track_stock: editValues.trackStock,
                stock_quantity: stockQuantity,
                low_stock_alert: parseInt(editValues.lowStockAlert, 10) || 5,
              }
            : it,
        ),
      );

      showToast("Inventario actualizado.", "success");
      setEditingId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error guardando.", "error");
    } finally {
      setSaving(false);
    }
  }

  const sortedItems = [...items].sort((a, b) => {
    // Show tracked items first
    if (a.track_stock && !b.track_stock) return -1;
    if (!a.track_stock && b.track_stock) return 1;
    return a.name.localeCompare(b.name);
  });

  const lowStock = items.filter(
    (i) => i.track_stock && i.stock_quantity !== null && i.stock_quantity <= i.low_stock_alert && i.stock_quantity > 0,
  );
  const outOfStock = items.filter((i) => i.track_stock && i.stock_quantity !== null && i.stock_quantity === 0);

  return (
    <div className="mt-4 space-y-6">
      {(outOfStock.length > 0 || lowStock.length > 0) && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 space-y-1">
          {outOfStock.length > 0 && (
            <p className="text-sm text-red-700">
              <strong>Agotados:</strong> {outOfStock.map((i) => i.name).join(", ")}
            </p>
          )}
          {lowStock.length > 0 && (
            <p className="text-sm text-yellow-700">
              <strong>Stock bajo:</strong> {lowStock.map((i) => `${i.name} (${i.stock_quantity})`).join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-cordero">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cordero">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
                Producto
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
                Stock
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-cordero-espresso opacity-60">
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr key={item.id} className="border-b border-cordero last:border-0">
                <td className="px-4 py-3">
                  <span className={item.is_active ? "text-cordero-espresso" : "text-cordero-espresso opacity-40 line-through"}>
                    {item.name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {editingId === item.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={editValues.trackStock}
                          onChange={(e) => setEditValues((v) => ({ ...v, trackStock: e.target.checked }))}
                        />
                        Control de stock
                      </label>
                      {editValues.trackStock && (
                        <>
                          <input
                            type="number"
                            min="0"
                            placeholder="Cantidad"
                            value={editValues.stockQuantity}
                            onChange={(e) => setEditValues((v) => ({ ...v, stockQuantity: e.target.value }))}
                            className="w-24 rounded-lg border border-cordero bg-transparent px-2 py-1 text-xs"
                          />
                          <label className="flex items-center gap-1 text-xs text-cordero-espresso opacity-60">
                            Alerta en:
                            <input
                              type="number"
                              min="1"
                              value={editValues.lowStockAlert}
                              onChange={(e) => setEditValues((v) => ({ ...v, lowStockAlert: e.target.value }))}
                              className="ml-1 w-16 rounded-lg border border-cordero bg-transparent px-2 py-1 text-xs"
                            />
                          </label>
                        </>
                      )}
                    </div>
                  ) : (
                    <StockBadge item={item} />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === item.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => saveStock(item.id)}
                        disabled={saving}
                        className="rounded-full bg-cordero-espresso px-3 py-1 text-xs text-cordero-cream disabled:opacity-50"
                      >
                        {saving ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-full border border-cordero px-3 py-1 text-xs text-cordero-espresso"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-full border border-cordero px-3 py-1 text-xs text-cordero-espresso hover:opacity-80"
                    >
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
