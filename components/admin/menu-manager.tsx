"use client";

import { DragEvent, useEffect, useState, useTransition } from "react";
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
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});

  // Receta: mapa itemId -> lista de ingredientes en edición
  const [recipeOpenId, setRecipeOpenId] = useState<string | null>(null);
  const [recipeMap, setRecipeMap] = useState<Record<string, IngredientRow[]>>({});
  const [recipeLoadingId, setRecipeLoadingId] = useState<string | null>(null);

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  const itemsByCategory = categories.map((category) => ({
    category,
    entries: items.filter((item) => item.category_id === category.id),
  }));

  async function moveItemToCategory(item: Item, categoryId: string) {
    if (!categoryId || item.category_id === categoryId) {
      return;
    }

    const wasSuccessful = await refreshAfter(() =>
      fetch(`/api/admin/menu/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
        }),
      }),
    );

    if (wasSuccessful) {
      setMoveTargets((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  }

  useEffect(() => {
    if (!newItemCategoryId && categories[0]?.id) {
      setNewItemCategoryId(categories[0].id);
    }
  }, [categories, newItemCategoryId]);

  async function refreshAfter(action: () => Promise<Response>) {
    setErrorMessage(null);
    const response = await action();
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "No pudimos completar la acción.";
      setErrorMessage(message);
      showToast(message, "error");
      return false;
    }

    showToast("Operación completada.", "success");

    startTransition(() => {
      router.refresh();
    });

    return true;
  }

  async function createCategory() {
    if (!newCategoryName.trim()) {
      return;
    }

    const wasSuccessful = await refreshAfter(() =>
      fetch("/api/admin/menu/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName,
          sortOrder: Number(newCategorySort),
        }),
      }),
    );

    if (!wasSuccessful) {
      return;
    }

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

    const wasSuccessful = await refreshAfter(() =>
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

    if (!wasSuccessful) {
      return;
    }

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

  function handleItemDragStart(event: DragEvent<HTMLLIElement>, itemId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemId);
    setDraggingItemId(itemId);
  }

  function handleItemDragEnd() {
    setDraggingItemId(null);
    setDragOverCategoryId(null);
  }

  function handleCategoryDragOver(event: DragEvent<HTMLLIElement>, categoryId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverCategoryId !== categoryId) {
      setDragOverCategoryId(categoryId);
    }
  }

  async function handleCategoryDrop(event: DragEvent<HTMLLIElement>, categoryId: string) {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text/plain");
    const draggedItem = items.find((item) => item.id === itemId);

    setDragOverCategoryId(null);
    setDraggingItemId(null);

    if (!draggedItem || draggedItem.category_id === categoryId) {
      return;
    }

    await moveItemToCategory(draggedItem, categoryId);
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

    setRecipeLoadingId(itemId);
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
      } else {
        showToast("No pudimos cargar la receta de este producto.", "error");
      }
    } finally {
      setRecipeLoadingId(null);
    }
  }

  function addIngredientLine(itemId: string) {
    if (!Object.prototype.hasOwnProperty.call(recipeMap, itemId)) {
      showToast("Primero carga la receta antes de agregar ingredientes.", "error");
      return;
    }

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
    if (!Object.prototype.hasOwnProperty.call(recipeMap, itemId)) {
      showToast("Primero carga la receta antes de guardar cambios.", "error");
      return;
    }

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
        <p className="mt-1 text-xs opacity-70">
          Usa las cajas como destino: arrastra un producto o usa el selector de cada fila para moverlo.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium opacity-70" htmlFor="new-category-name">Nombre de categoría</label>
          <input
            id="new-category-name"
            className="w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Nombre de categoría"
            value={newCategoryName}
          />
          <label className="block text-xs font-medium opacity-70" htmlFor="new-category-sort">Orden de categoría</label>
          <input
            id="new-category-sort"
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

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {itemsByCategory.map(({ category, entries }) => (
            <li
              key={category.id}
              className={[
                "rounded-2xl border px-4 py-3 text-sm transition-colors",
                dragOverCategoryId === category.id
                  ? "border-cordero-espresso bg-cordero-espresso/10"
                  : "border-cordero bg-transparent",
              ].join(" ")}
              onDragOver={(event) => handleCategoryDragOver(event, category.id)}
              onDrop={(event) => handleCategoryDrop(event, category.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-xs opacity-70">
                    Orden {category.sort_order} · {entries.length} productos
                  </p>
                </div>
                <button
                  className="rounded-full border border-cordero px-3 py-1 text-xs"
                  onClick={() => toggleCategory(category)}
                  type="button"
                >
                  {category.is_active ? "Desactivar" : "Activar"}
                </button>
              </div>
              <p className="mt-2 text-xs opacity-60">Arrastra productos aquí para recategorizarlos.</p>
              <div className="mt-3 min-h-10 rounded-xl border border-dashed border-cordero/70 px-2 py-2">
                {entries.length > 0 ? (
                  <ul className="space-y-1">
                    {entries.slice(0, 3).map((item) => (
                      <li key={item.id} className="truncate text-xs opacity-80">
                        {item.name}
                      </li>
                    ))}
                    {entries.length > 3 ? (
                      <li className="text-xs opacity-60">+ {entries.length - 3} más</li>
                    ) : null}
                  </ul>
                ) : (
                  <p className="text-xs opacity-60">Sin productos en esta categoría.</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-cordero bg-cordero-card p-5">
        <h3 className="font-heading text-2xl">Productos</h3>
        <p className="mt-1 text-xs opacity-70">
          Arrastra cada producto a una categoría o usa &quot;Mover&quot; para cambiarlo sin arrastrar.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium opacity-70" htmlFor="new-item-category">Categoría del nuevo producto</label>
          <select
            id="new-item-category"
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
          <label className="block text-xs font-medium opacity-70" htmlFor="new-item-name">Nombre del producto</label>
          <input
            id="new-item-name"
            className="w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setNewItemName(event.target.value)}
            placeholder="Nombre producto"
            value={newItemName}
          />
          <label className="block text-xs font-medium opacity-70" htmlFor="new-item-description">Descripción</label>
          <textarea
            id="new-item-description"
            className="w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setNewItemDescription(event.target.value)}
            placeholder="Descripción"
            rows={2}
            value={newItemDescription}
          />
          <label className="block text-xs font-medium opacity-70" htmlFor="new-item-price">Precio</label>
          <input
            id="new-item-price"
            className="w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setNewItemPrice(Number(event.target.value))}
            placeholder="Precio"
            type="number"
            value={newItemPrice}
          />
          <label className="block text-xs font-medium opacity-70" htmlFor="new-item-sort">Orden en categoría</label>
          <input
            id="new-item-sort"
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
            <li
              key={item.id}
              className={[
                "rounded-xl border border-cordero text-sm transition-opacity",
                draggingItemId === item.id ? "opacity-50" : "opacity-100",
              ].join(" ")}
              draggable
              onDragEnd={handleItemDragEnd}
              onDragStart={(event) => handleItemDragStart(event, item.id)}
            >
              {/* Fila principal del ítem */}
              <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-base opacity-60">⋮⋮</span>
                  <div>
                    <p>
                      {item.name} - ${item.price}
                    </p>
                    <p className="text-xs opacity-60">Categoría: {categoryNameById.get(item.category_id) ?? "Sin categoría"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    aria-label={`Mover ${item.name} a otra categoría`}
                    className="rounded-full border border-cordero bg-transparent px-3 py-1 text-xs"
                    onChange={(event) =>
                      setMoveTargets((prev) => ({
                        ...prev,
                        [item.id]: event.target.value,
                      }))
                    }
                    value={moveTargets[item.id] ?? item.category_id}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button
                    aria-label={`Confirmar cambio de categoría para ${item.name}`}
                    className="rounded-full border border-cordero px-3 py-1 text-xs"
                    disabled={(moveTargets[item.id] ?? item.category_id) === item.category_id}
                    onClick={() => moveItemToCategory(item, moveTargets[item.id] ?? item.category_id)}
                    type="button"
                  >
                    Mover
                  </button>
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

                  {recipeLoadingId === item.id ? (
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
                                aria-label={`Ingrediente ${index + 1} para ${item.name}`}
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
                                aria-label={`Cantidad del ingrediente ${index + 1} para ${item.name}`}
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
                                aria-label={`Eliminar ingrediente ${index + 1} de ${item.name}`}
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
        <p className="lg:col-span-2 rounded-xl border border-cordero px-4 py-3 text-sm" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
