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

  // Category filter for the products panel
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  // Receta: mapa itemId -> lista de ingredientes en edición
  const [recipeOpenId, setRecipeOpenId] = useState<string | null>(null);
  const [recipeMap, setRecipeMap] = useState<Record<string, IngredientRow[]>>({});
  const [recipeLoading, setRecipeLoading] = useState(false);

  // Items filtered by selected category
  const filteredItems =
    selectedCategoryId === "all"
      ? items
      : items.filter((item) => item.category_id === selectedCategoryId);

  // Selecting a category filter also pre-fills the new item form
  function selectCategoryFilter(catId: string) {
    setSelectedCategoryId(catId);
    if (catId !== "all") {
      setNewItemCategoryId(catId);
    }
  }

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
      {/* ── Categorías ── */}
      <div className="rounded-2xl border border-cordero bg-cordero-card p-5">
        <h3 className="font-heading text-2xl">Categorías</h3>
        <p className="mt-1 text-xs opacity-50">Haz clic en una categoría para filtrar los productos.</p>

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
          {categories.map((category) => {
            const count = items.filter((i) => i.category_id === category.id).length;
            const isSelected = selectedCategoryId === category.id;
            return (
              <li
                key={category.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? "border-cordero-espresso bg-cordero-espresso/5"
                    : "border-cordero hover:border-cordero-espresso/40"
                } ${!category.is_active ? "opacity-50" : ""}`}
                onClick={() => selectCategoryFilter(isSelected ? "all" : category.id)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${category.is_active ? "bg-green-500" : "bg-gray-400"}`}
                  />
                  <span>{category.name}</span>
                  <span className="rounded-full bg-cordero/10 px-1.5 py-0.5 text-xs opacity-60">
                    {count}
                  </span>
                </div>
                <button
                  className="rounded-full border border-cordero px-3 py-1 text-xs hover:opacity-80"
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleCategory(category);
                  }}
                  type="button"
                >
                  {category.is_active ? "Desactivar" : "Activar"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Productos ── */}
      <div className="rounded-2xl border border-cordero bg-cordero-card p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-heading text-2xl">Productos</h3>
          {selectedCategoryId !== "all" && (
            <span className="text-xs opacity-50">
              Categoría: <strong className="opacity-100">{categories.find((c) => c.id === selectedCategoryId)?.name}</strong>
            </span>
          )}
        </div>

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

        {/* Category filter pills */}
        <div className="mt-5 flex flex-wrap gap-1.5">
          <button
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              selectedCategoryId === "all"
                ? "border-transparent bg-cordero-espresso text-cordero-cream"
                : "border-cordero hover:opacity-80"
            }`}
            onClick={() => selectCategoryFilter("all")}
            type="button"
          >
            Todas ({items.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                selectedCategoryId === cat.id
                  ? "border-transparent bg-cordero-espresso text-cordero-cream"
                  : "border-cordero hover:opacity-80"
              } ${!cat.is_active ? "opacity-50" : ""}`}
              onClick={() => selectCategoryFilter(cat.id)}
              type="button"
            >
              {cat.name} ({items.filter((i) => i.category_id === cat.id).length})
            </button>
          ))}
        </div>

        <ul className="mt-3 space-y-2">
          {filteredItems.length === 0 && (
            <li className="rounded-xl border border-cordero px-3 py-4 text-center text-sm opacity-50">
              {selectedCategoryId === "all"
                ? "No hay productos aún."
                : "Esta categoría no tiene productos todavía."}
            </li>
          )}

          {filteredItems.map((item) => {
            const categoryName = categories.find((c) => c.id === item.category_id)?.name;
            const loadedRecipe = recipeMap[item.id];
            const isRecipeOpen = recipeOpenId === item.id;

            return (
              <li key={item.id} className="rounded-xl border border-cordero text-sm">
                {/* Item row */}
                <div className="flex items-start justify-between gap-2 px-3 py-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={item.is_active ? "" : "opacity-40 line-through"}>
                        {item.name}
                      </span>
                      <span className="font-medium">${item.price}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Show category tag when viewing all */}
                      {selectedCategoryId === "all" && categoryName && (
                        <span className="rounded-full bg-cordero/10 px-2 py-0.5 text-xs opacity-70">
                          {categoryName}
                        </span>
                      )}
                      {/* Show ingredient count once recipe is loaded */}
                      {loadedRecipe !== undefined && (
                        <span className="rounded-full border border-cordero/30 px-2 py-0.5 text-xs opacity-50">
                          {loadedRecipe.length === 0
                            ? "Sin insumos"
                            : `${loadedRecipe.length} insumo${loadedRecipe.length !== 1 ? "s" : ""}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        isRecipeOpen
                          ? "border-transparent bg-cordero-espresso text-cordero-cream"
                          : "border-cordero"
                      }`}
                      onClick={() => void openRecipe(item.id)}
                      title="Ver y editar insumos que consume este producto"
                      type="button"
                    >
                      Insumos
                    </button>
                    <button
                      className="rounded-full border border-cordero px-3 py-1 text-xs"
                      onClick={() => void toggleItem(item)}
                      type="button"
                    >
                      {item.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>

                {/* Ingredient recipe panel */}
                {isRecipeOpen ? (
                  <div className="border-t border-cordero px-3 py-3">
                    <p className="mb-2 text-xs font-medium opacity-60">
                      Insumos que consume <strong>{item.name}</strong> por unidad pedida
                    </p>

                    {recipeLoading ? (
                      <p className="text-xs opacity-60">Cargando…</p>
                    ) : inventoryItems.length === 0 ? (
                      <p className="text-xs opacity-60">
                        Primero agrega insumos en la pestaña Inventario.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(recipeMap[item.id] ?? []).length === 0 && (
                          <p className="text-xs opacity-50">
                            Sin insumos asignados. Usa el botón de abajo para agregar.
                          </p>
                        )}
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
                            + Insumo
                          </button>
                          <button
                            className="rounded-full bg-cordero-espresso px-3 py-1 text-xs text-cordero-cream"
                            onClick={() => void saveRecipe(item.id)}
                            type="button"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {errorMessage ? (
        <p className="lg:col-span-2 rounded-xl border border-cordero px-4 py-3 text-sm">{errorMessage}</p>
      ) : null}
    </section>
  );
}
