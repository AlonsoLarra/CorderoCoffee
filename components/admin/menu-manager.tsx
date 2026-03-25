"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast-provider";
import type { InventoryItem } from "@/lib/types/domain";

type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type Item = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  sort_order: number;
};

type IngredientRow = {
  inventoryItemId: string;
  quantity: number;
};

type MenuManagerProps = {
  categories: Category[];
  items: Item[];
  inventoryItems: InventoryItem[];
};

export function MenuManager({ categories, items, inventoryItems }: MenuManagerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySort, setNewCategorySort] = useState(0);

  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemSort, setNewItemSort] = useState(0);
  const [newItemCategoryId, setNewItemCategoryId] = useState(categories[0]?.id ?? "");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Receta: mapa itemId -> lista de ingredientes en edición
  const [recipeOpenId, setRecipeOpenId] = useState<string | null>(null);
  const [recipeMap, setRecipeMap] = useState<Record<string, IngredientRow[]>>({});
  const [recipeLoading, setRecipeLoading] = useState(false);

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

  async function createCategory() {
    if (!newCategoryName.trim()) {
      return;
    }

    await refreshAfter(() =>
      fetch("/api/admin/menu/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName,
          sortOrder: Number(newCategorySort),
        }),
      }),
    );

    setNewCategoryName("");
    setNewCategorySort(0);
  }

  async function toggleCategory(category: Category) {
    await refreshAfter(() =>
      fetch(`/api/admin/menu/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !category.is_active }),
      }),
    );
  }

  async function createItem() {
    if (!newItemName.trim() || !newItemCategoryId) {
      return;
    }

    await refreshAfter(() =>
      fetch("/api/admin/menu/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: newItemCategoryId,
          name: newItemName,
          description: newItemDescription,
          price: Number(newItemPrice),
          sortOrder: Number(newItemSort),
        }),
      }),
    );

    setNewItemName("");
    setNewItemDescription("");
    setNewItemPrice(0);
    setNewItemSort(0);
  }

  async function toggleItem(item: Item) {
    await refreshAfter(() =>
      fetch(`/api/admin/menu/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.is_active }),
      }),
    );
  }

  // ── Receta helpers ────────────────────────────────────────────────

  async function openRecipe(itemId: string) {
    if (recipeOpenId === itemId) {
      setRecipeOpenId(null);
      return;
    }

    setRecipeOpenId(itemId);

    // Si ya cargamos la receta, no volver a fetchar
    if (recipeMap[itemId]) return;

    setRecipeLoading(true);
    try {
      const res = await fetch(`/api/admin/menu/items/${itemId}/ingredients`);
      if (res.ok) {
        const body = (await res.json()) as {
          ingredients: { inventory_item_id: string; quantity: number }[];
        };
        setRecipeMap((prev) => ({
          ...prev,
          [itemId]: body.ingredients.map((i) => ({
            inventoryItemId: i.inventory_item_id,
            quantity: i.quantity,
          })),
        }));
      }
    } finally {
      setRecipeLoading(false);
    }
  }

  function addIngredientLine(itemId: string) {
    const firstAvailable = inventoryItems[0];
    if (!firstAvailable) return;
    setRecipeMap((prev) => ({
      ...prev,
      [itemId]: [
        ...(prev[itemId] ?? []),
        { inventoryItemId: firstAvailable.id, quantity: 1 },
      ],
    }));
  }

  function updateIngredientLine(itemId: string, index: number, field: keyof IngredientRow, value: string | number) {
    setRecipeMap((prev) => {
      const lines = [...(prev[itemId] ?? [])];
      lines[index] = { ...lines[index], [field]: value };
      return { ...prev, [itemId]: lines };
    });
  }

  function removeIngredientLine(itemId: string, index: number) {
    setRecipeMap((prev) => {
      const lines = [...(prev[itemId] ?? [])];
      lines.splice(index, 1);
      return { ...prev, [itemId]: lines };
    });
  }

  async function saveRecipe(itemId: string) {
    const lines = recipeMap[itemId] ?? [];
    const invalid = lines.some((l) => !l.inventoryItemId || l.quantity <= 0);
    if (invalid) {
      showToast("Revisa que todos los ingredientes tengan cantidad mayor a cero.", "error");
      return;
    }

    const res = await fetch(`/api/admin/menu/items/${itemId}/ingredients`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients: lines }),
    });

    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      showToast(body.error ?? "No pudimos guardar la receta.", "error");
      return;
    }

    showToast("Receta guardada.", "success");
  }

  return (
    <section className="mt-10 grid gap-8 lg:grid-cols-2">
      <div className="rounded-2xl border border-cordero bg-cordero-card p-5">
        <h3 className="font-heading text-2xl">Categorías</h3>

        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Nombre de categoría"
            value={newCategoryName}
          />
          <input
            className="w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setNewCategorySort(Number(event.target.value))}
            placeholder="Orden"
            type="number"
            value={newCategorySort}
          />
          <button
            className="rounded-full bg-cordero-espresso px-4 py-2 text-xs text-cordero-cream disabled:opacity-50"
            disabled={isPending}
            onClick={createCategory}
            type="button"
          >
            Crear categoría
          </button>
        </div>

        <ul className="mt-5 space-y-2">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between rounded-xl border border-cordero px-3 py-2 text-sm">
              <span>
                {category.name} ({category.sort_order})
              </span>
              <button
                className="rounded-full border border-cordero px-3 py-1 text-xs"
                onClick={() => toggleCategory(category)}
                type="button"
              >
                {category.is_active ? "Desactivar" : "Activar"}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-cordero bg-cordero-card p-5">
        <h3 className="font-heading text-2xl">Productos</h3>

        <div className="mt-4 space-y-3">
          <select
            className="w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setNewItemCategoryId(event.target.value)}
            value={newItemCategoryId}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setNewItemName(event.target.value)}
            placeholder="Nombre producto"
            value={newItemName}
          />
          <textarea
            className="w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setNewItemDescription(event.target.value)}
            placeholder="Descripción"
            rows={2}
            value={newItemDescription}
          />
          <input
            className="w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setNewItemPrice(Number(event.target.value))}
            placeholder="Precio"
            type="number"
            value={newItemPrice}
          />
          <input
            className="w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setNewItemSort(Number(event.target.value))}
            placeholder="Orden"
            type="number"
            value={newItemSort}
          />
          <button
            className="rounded-full bg-cordero-espresso px-4 py-2 text-xs text-cordero-cream disabled:opacity-50"
            disabled={isPending}
            onClick={createItem}
            type="button"
          >
            Crear producto
          </button>
        </div>

        <ul className="mt-5 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-cordero text-sm">
              {/* Fila principal del ítem */}
              <div className="flex items-center justify-between px-3 py-2">
                <span>
                  {item.name} - ${item.price}
                </span>
                <div className="flex gap-2">
                  <button
                    className="rounded-full border border-cordero px-3 py-1 text-xs"
                    onClick={() => openRecipe(item.id)}
                    title="Editar receta de insumos"
                    type="button"
                  >
                    {recipeOpenId === item.id ? "Cerrar receta" : "Receta"}
                  </button>
                  <button
                    className="rounded-full border border-cordero px-3 py-1 text-xs"
                    onClick={() => toggleItem(item)}
                    type="button"
                  >
                    {item.is_active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>

              {/* Panel de receta expandible */}
              {recipeOpenId === item.id ? (
                <div className="border-t border-cordero px-3 py-3">
                  <p className="mb-2 text-xs font-medium opacity-60">
                    Insumos que consume este producto por unidad pedida
                  </p>

                  {recipeLoading ? (
                    <p className="text-xs opacity-60">Cargando…</p>
                  ) : (
                    <>
                      {inventoryItems.length === 0 ? (
                        <p className="text-xs opacity-60">
                          Primero agrega insumos en la pestaña Inventario.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {(recipeMap[item.id] ?? []).map((line, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <select
                                className="flex-1 rounded-xl border border-cordero bg-transparent px-2 py-1 text-xs"
                                onChange={(e) =>
                                  updateIngredientLine(item.id, index, "inventoryItemId", e.target.value)
                                }
                                value={line.inventoryItemId}
                              >
                                {inventoryItems.map((inv) => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.name} ({inv.unit})
                                  </option>
                                ))}
                              </select>
                              <input
                                className="w-20 rounded-xl border border-cordero bg-transparent px-2 py-1 text-xs"
                                min={0.001}
                                onChange={(e) =>
                                  updateIngredientLine(item.id, index, "quantity", Number(e.target.value))
                                }
                                step="0.001"
                                type="number"
                                value={line.quantity}
                              />
                              <button
                                className="rounded-full border border-cordero px-2 py-1 text-xs hover:text-red-600"
                                onClick={() => removeIngredientLine(item.id, index)}
                                type="button"
                              >
                                ✕
                              </button>
                            </div>
                          ))}

                          <div className="flex gap-2 pt-1">
                            <button
                              className="rounded-full border border-cordero px-3 py-1 text-xs"
                              onClick={() => addIngredientLine(item.id)}
                              type="button"
                            >
                              + Ingrediente
                            </button>
                            <button
                              className="rounded-full bg-cordero-espresso px-3 py-1 text-xs text-cordero-cream"
                              onClick={() => saveRecipe(item.id)}
                              type="button"
                            >
                              Guardar receta
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {errorMessage ? (
        <p className="lg:col-span-2 rounded-xl border border-cordero px-4 py-3 text-sm">{errorMessage}</p>
      ) : null}
    </section>
  );
}
