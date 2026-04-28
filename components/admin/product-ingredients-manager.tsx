"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast-provider";
import type { InventoryItem } from "@/lib/types/domain";

type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type MenuItem = {
  id: string;
  category_id: string | null;
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

type ProductIngredientsManagerProps = {
  categories: Category[];
  items: MenuItem[];
  inventoryItems: InventoryItem[];
};

type IngredientApiRow = {
  inventory_item_id: string;
  quantity: number;
};

const UNCATEGORIZED_ID = "__uncategorized__";

export function ProductIngredientsManager({ categories, items, inventoryItems }: ProductIngredientsManagerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySort, setNewCategorySort] = useState(0);

  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemSort, setNewItemSort] = useState(0);
  const [newItemCategoryId, setNewItemCategoryId] = useState(UNCATEGORIZED_ID);

  const [recipeOpenId, setRecipeOpenId] = useState<string | null>(null);
  const [recipeLoadingId, setRecipeLoadingId] = useState<string | null>(null);
  const [recipeMap, setRecipeMap] = useState<Record<string, IngredientRow[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, "es")),
    [categories],
  );

  const sortedItems = useMemo(
    () => [...items].sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, "es")),
    [items],
  );

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const category of sortedCategories) {
      map.set(category.id, sortedItems.filter((item) => item.category_id === category.id));
    }
    map.set(UNCATEGORIZED_ID, sortedItems.filter((item) => item.category_id === null));
    return map;
  }, [sortedCategories, sortedItems]);

  async function getResponseErrorMessage(response: Response, fallback: string) {
    try {
      const body = (await response.json()) as { error?: string };
      return body.error ?? fallback;
    } catch {
      return fallback;
    }
  }

  async function refreshAfter(action: () => Promise<Response>, successMessage: string) {
    setErrorMessage(null);

    let response: Response;
    try {
      response = await action();
    } catch {
      const message = "No pudimos completar la accion.";
      setErrorMessage(message);
      showToast(message, "error");
      return false;
    }

    if (!response.ok) {
      const message = await getResponseErrorMessage(response, "No pudimos completar la accion.");
      setErrorMessage(message);
      showToast(message, "error");
      return false;
    }

    showToast(successMessage, "success");
    startTransition(() => {
      router.refresh();
    });
    return true;
  }

  function normalizeCategoryId(categoryId: string) {
    return categoryId === UNCATEGORIZED_ID ? null : categoryId;
  }

  async function createCategory() {
    if (!newCategoryName.trim()) {
      showToast("El nombre de categoria es requerido.", "error");
      return;
    }

    const wasSuccessful = await refreshAfter(
      () =>
        fetch("/api/admin/menu/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCategoryName,
            sortOrder: Number(newCategorySort),
          }),
        }),
      "Categoria creada.",
    );

    if (!wasSuccessful) return;

    setNewCategoryName("");
    setNewCategorySort(0);
  }

  async function createItem() {
    if (!newItemName.trim()) {
      showToast("El nombre del producto es requerido.", "error");
      return;
    }

    const wasSuccessful = await refreshAfter(
      () =>
        fetch("/api/admin/menu/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: normalizeCategoryId(newItemCategoryId),
            name: newItemName,
            description: newItemDescription,
            price: Number(newItemPrice),
            sortOrder: Number(newItemSort),
          }),
        }),
      "Producto creado.",
    );

    if (!wasSuccessful) return;

    setNewItemName("");
    setNewItemDescription("");
    setNewItemPrice(0);
    setNewItemSort(0);
    setNewItemCategoryId(UNCATEGORIZED_ID);
  }

  async function openRecipe(itemId: string) {
    if (recipeOpenId === itemId) {
      setRecipeOpenId(null);
      return;
    }

    setRecipeOpenId(itemId);
    if (recipeMap[itemId]) return;

    setRecipeLoadingId(itemId);
    try {
      const res = await fetch(`/api/admin/menu/items/${itemId}/ingredients`);
      if (!res.ok) {
        showToast("No pudimos cargar la composicion de este producto.", "error");
        return;
      }

      const body = (await res.json()) as { ingredients: IngredientApiRow[] };
      setRecipeMap((prev) => ({
        ...prev,
        [itemId]: body.ingredients.map((ingredient) => ({
          inventoryItemId: ingredient.inventory_item_id,
          quantity: ingredient.quantity,
        })),
      }));
    } finally {
      setRecipeLoadingId(null);
    }
  }

  function addIngredientLine(itemId: string) {
    if (!Object.prototype.hasOwnProperty.call(recipeMap, itemId)) {
      showToast("Primero abre la composicion para editar.", "error");
      return;
    }

    const firstAvailable = inventoryItems[0];
    if (!firstAvailable) {
      showToast("Primero agrega insumos en inventario.", "error");
      return;
    }

    setRecipeMap((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] ?? []), { inventoryItemId: firstAvailable.id, quantity: 1 }],
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
      showToast("Primero abre la composicion para editar.", "error");
      return;
    }

    const lines = recipeMap[itemId] ?? [];
    const invalid = lines.some((line) => !line.inventoryItemId || line.quantity <= 0);
    if (invalid) {
      showToast("Cada insumo debe tener cantidad mayor a cero.", "error");
      return;
    }

    const duplicateIds = new Set<string>();
    for (const line of lines) {
      if (duplicateIds.has(line.inventoryItemId)) {
        showToast("No repitas el mismo insumo en una composicion.", "error");
        return;
      }
      duplicateIds.add(line.inventoryItemId);
    }

    const res = await fetch(`/api/admin/menu/items/${itemId}/ingredients`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients: lines }),
    });

    if (!res.ok) {
      const message = await getResponseErrorMessage(res, "No pudimos guardar la composicion.");
      showToast(message, "error");
      return;
    }

    showToast("Composicion guardada.", "success");
    startTransition(() => {
      router.refresh();
    });
  }

  function renderRecipeEditor(item: MenuItem) {
    const lines = recipeMap[item.id] ?? [];

    if (recipeLoadingId === item.id) {
      return <p className="text-xs opacity-60">Cargando composicion...</p>;
    }

    if (inventoryItems.length === 0) {
      return <p className="text-xs opacity-60">Primero agrega insumos para poder definir composiciones.</p>;
    }

    return (
      <div className="space-y-2">
        {lines.length === 0 ? (
          <p className="text-xs opacity-60">Este producto aun no tiene insumos asignados.</p>
        ) : null}

        {lines.map((line, index) => (
          <div key={`${item.id}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
            <select
              aria-label={`Insumo ${index + 1} para ${item.name}`}
              className="rounded-xl border border-cordero bg-transparent px-2 py-1.5 text-xs"
              onChange={(event) => updateIngredientLine(item.id, index, "inventoryItemId", event.target.value)}
              value={line.inventoryItemId}
            >
              {inventoryItems.map((inventoryItem) => (
                <option key={inventoryItem.id} value={inventoryItem.id}>
                  {inventoryItem.name} ({inventoryItem.unit})
                </option>
              ))}
            </select>
            <input
              aria-label={`Cantidad ${index + 1} para ${item.name}`}
              className="rounded-xl border border-cordero bg-transparent px-2 py-1.5 text-xs"
              min={0.001}
              onChange={(event) => updateIngredientLine(item.id, index, "quantity", Number(event.target.value))}
              step="0.001"
              type="number"
              value={line.quantity}
            />
            <button
              aria-label={`Eliminar linea ${index + 1} de ${item.name}`}
              className="rounded-full border border-cordero px-2 py-1 text-xs hover:text-red-700"
              onClick={() => removeIngredientLine(item.id, index)}
              type="button"
            >
              Quitar
            </button>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-cordero px-3 py-1.5 text-xs"
            onClick={() => addIngredientLine(item.id)}
            type="button"
          >
            Agregar insumo
          </button>
          <button
            className="rounded-full bg-cordero-espresso px-3 py-1.5 text-xs text-cordero-cream"
            onClick={() => void saveRecipe(item.id)}
            type="button"
          >
            Guardar composicion
          </button>
        </div>
      </div>
    );
  }

  function renderItemCard(item: MenuItem) {
    const isOpen = recipeOpenId === item.id;
    const recipeCount = recipeMap[item.id]?.length;

    return (
      <li key={item.id} className="rounded-xl border border-cordero/70 bg-cordero-cream/50 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-cordero-espresso">{item.name}</p>
            <p className="text-xs opacity-60">${item.price}</p>
            {item.description ? <p className="mt-1 text-xs opacity-60">{item.description}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-cordero/60 px-2 py-1 text-[11px] opacity-70">
              {typeof recipeCount === "number" ? `${recipeCount} insumo${recipeCount === 1 ? "" : "s"}` : "Sin cargar"}
            </span>
            <button
              className="rounded-full border border-cordero px-3 py-1 text-xs"
              onClick={() => void openRecipe(item.id)}
              type="button"
            >
              {isOpen ? "Cerrar" : "Editar composicion"}
            </button>
          </div>
        </div>

        {isOpen ? <div className="mt-3 border-t border-cordero/40 pt-3">{renderRecipeEditor(item)}</div> : null}
      </li>
    );
  }

  return (
    <section className="space-y-6 rounded-2xl border border-cordero bg-cordero-card p-5">
      <div>
        <h3 className="font-heading text-2xl">Productos e insumos</h3>
        <p className="mt-1 text-sm opacity-70">
          Define la composicion de cada producto: que insumos usa y en que cantidad por unidad.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-cordero/70 p-4">
          <h4 className="text-sm font-semibold text-cordero-espresso">Crear categoria</h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Nombre de categoria"
              value={newCategoryName}
            />
            <input
              className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              onChange={(event) => setNewCategorySort(Number(event.target.value))}
              type="number"
              value={newCategorySort}
            />
          </div>
          <button
            className="mt-3 rounded-full bg-cordero-espresso px-4 py-2 text-xs text-cordero-cream disabled:opacity-50"
            disabled={isPending}
            onClick={() => void createCategory()}
            type="button"
          >
            Crear categoria
          </button>
        </div>

        <div className="rounded-2xl border border-cordero/70 p-4">
          <h4 className="text-sm font-semibold text-cordero-espresso">Crear producto</h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              onChange={(event) => setNewItemName(event.target.value)}
              placeholder="Nombre de producto"
              value={newItemName}
            />
            <select
              className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              onChange={(event) => setNewItemCategoryId(event.target.value)}
              value={newItemCategoryId}
            >
              <option value={UNCATEGORIZED_ID}>Sin categorizar</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}{category.is_active ? "" : " (pausada)"}
                </option>
              ))}
            </select>
            <input
              className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm sm:col-span-2"
              onChange={(event) => setNewItemDescription(event.target.value)}
              placeholder="Descripcion"
              value={newItemDescription}
            />
            <input
              className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              min={0}
              onChange={(event) => setNewItemPrice(Number(event.target.value))}
              step="0.01"
              type="number"
              value={newItemPrice}
            />
            <input
              className="rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              onChange={(event) => setNewItemSort(Number(event.target.value))}
              type="number"
              value={newItemSort}
            />
          </div>
          <button
            className="mt-3 rounded-full bg-cordero-espresso px-4 py-2 text-xs text-cordero-cream disabled:opacity-50"
            disabled={isPending}
            onClick={() => void createItem()}
            type="button"
          >
            Crear producto
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {sortedCategories.map((category) => {
          const categoryItems = itemsByCategory.get(category.id) ?? [];
          return (
            <div key={category.id} className="rounded-2xl border border-cordero/70 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold text-cordero-espresso">{category.name}</h4>
                {!category.is_active ? (
                  <span className="rounded-full border border-cordero px-2 py-0.5 text-[11px] opacity-60">Pausada</span>
                ) : null}
                <span className="rounded-full border border-cordero px-2 py-0.5 text-[11px] opacity-60">
                  {categoryItems.length} producto{categoryItems.length === 1 ? "" : "s"}
                </span>
              </div>
              {categoryItems.length === 0 ? (
                <p className="text-xs opacity-60">Esta categoria aun no tiene productos.</p>
              ) : (
                <ul className="space-y-2">{categoryItems.map((item) => renderItemCard(item))}</ul>
              )}
            </div>
          );
        })}

        <div className="rounded-2xl border border-cordero/70 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-cordero-espresso">Sin categorizar</h4>
            <span className="rounded-full border border-cordero px-2 py-0.5 text-[11px] opacity-60">
              {(itemsByCategory.get(UNCATEGORIZED_ID) ?? []).length} producto
              {(itemsByCategory.get(UNCATEGORIZED_ID) ?? []).length === 1 ? "" : "s"}
            </span>
          </div>
          {(itemsByCategory.get(UNCATEGORIZED_ID) ?? []).length === 0 ? (
            <p className="text-xs opacity-60">Todos los productos ya tienen categoria.</p>
          ) : (
            <ul className="space-y-2">
              {(itemsByCategory.get(UNCATEGORIZED_ID) ?? []).map((item) => renderItemCard(item))}
            </ul>
          )}
        </div>
      </div>

      {errorMessage ? <p className="rounded-xl border border-cordero px-4 py-3 text-sm">{errorMessage}</p> : null}
    </section>
  );
}
