"use client";

import { DragEvent, useMemo, useState, useTransition } from "react";
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

type MenuManagerProps = {
  categories: Category[];
  items: Item[];
  inventoryItems: InventoryItem[];
};

type CategoryDraft = {
  name: string;
  sortOrder: number;
};

type ItemDraft = {
  name: string;
  description: string;
  price: number;
  sortOrder: number;
  categoryId: string;
};

type Lane = {
  id: string;
  title: string;
  subtitle: string;
  emptyState: string;
  items: Item[];
  category: Category | null;
};

const UNCATEGORIZED_LANE_ID = "__uncategorized__";
const SORT_GAP = 10;

function formatPrice(price: number) {
  return `$${price}`;
}

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
  const [newItemCategoryId, setNewItemCategoryId] = useState(UNCATEGORIZED_LANE_ID);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverLaneId, setDragOverLaneId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, CategoryDraft>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraft>>({});

  const [recipeOpenId, setRecipeOpenId] = useState<string | null>(null);
  const [recipeMap, setRecipeMap] = useState<Record<string, IngredientRow[]>>({});
  const [recipeLoadingId, setRecipeLoadingId] = useState<string | null>(null);

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, "es"),
      ),
    [items],
  );

  const uncategorizedItems = useMemo(
    () => sortedItems.filter((item) => item.category_id === null),
    [sortedItems],
  );

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const categoryLanes = useMemo(
    () =>
      categories.map((category) => ({
        id: category.id,
        title: category.name,
        subtitle: `Orden ${category.sort_order} · ${category.is_active ? "Activa" : "Pausada"}`,
        emptyState: "Todavía no hay productos en esta categoría.",
        items: sortedItems.filter((item) => item.category_id === category.id),
        category,
      })),
    [categories, sortedItems],
  );

  const lanes = useMemo<Lane[]>(
    () => [
      {
        id: UNCATEGORIZED_LANE_ID,
        title: "Sin categorizar",
        subtitle: "Todo lo que siga aquí todavía no aparece claro en el menú.",
        emptyState: "No hay productos pendientes por categorizar.",
        items: uncategorizedItems,
        category: null,
      },
      ...categoryLanes,
    ],
    [categoryLanes, uncategorizedItems],
  );

  const laneItemsById = useMemo(() => new Map(lanes.map((lane) => [lane.id, lane.items])), [lanes]);

  const activeCategories = categories.filter((category) => category.is_active).length;
  const categorizedItemsCount = sortedItems.length - uncategorizedItems.length;

  function normalizeCategoryId(laneId: string) {
    return laneId === UNCATEGORIZED_LANE_ID ? null : laneId;
  }

  function getLaneIdForItem(item: Item) {
    return item.category_id ?? UNCATEGORIZED_LANE_ID;
  }

  async function getResponseErrorMessage(response: Response, fallback: string) {
    try {
      const body = (await response.json()) as { error?: string };
      return body.error ?? fallback;
    } catch {
      return fallback;
    }
  }

  async function refreshAfter(action: () => Promise<Response>, successMessage = "Operación completada.") {
    setErrorMessage(null);

    let response: Response;
    try {
      response = await action();
    } catch {
      const message = "No pudimos completar la acción.";
      setErrorMessage(message);
      showToast(message, "error");
      return false;
    }

    if (!response.ok) {
      const message = await getResponseErrorMessage(response, "No pudimos completar la acción.");
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

  async function refreshAfterMany(action: () => Promise<Response[]>, successMessage: string) {
    setErrorMessage(null);

    let responses: Response[];
    try {
      responses = await action();
    } catch {
      const message = "No pudimos guardar el nuevo acomodo del tablero.";
      setErrorMessage(message);
      showToast(message, "error");
      return false;
    }

    const failedResponse = responses.find((response) => !response.ok);
    if (failedResponse) {
      const message = await getResponseErrorMessage(failedResponse, "No pudimos guardar el nuevo acomodo del tablero.");
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

  async function createCategory() {
    if (!newCategoryName.trim()) {
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
      "Categoría creada.",
    );

    if (!wasSuccessful) {
      return;
    }

    setNewCategoryName("");
    setNewCategorySort(0);
  }

  async function toggleCategory(category: Category) {
    await refreshAfter(
      () =>
        fetch(`/api/admin/menu/categories/${category.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !category.is_active }),
        }),
      category.is_active ? "Categoría pausada." : "Categoría activada.",
    );
  }

  function beginCategoryEdit(category: Category) {
    setEditingCategoryId(category.id);
    setCategoryDrafts((prev) => ({
      ...prev,
      [category.id]: {
        name: category.name,
        sortOrder: category.sort_order,
      },
    }));
  }

  function updateCategoryDraft(categoryId: string, field: keyof CategoryDraft, value: string | number) {
    setCategoryDrafts((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] ?? { name: "", sortOrder: 0 }),
        [field]: value,
      },
    }));
  }

  async function saveCategory(categoryId: string) {
    const draft = categoryDrafts[categoryId];
    if (!draft || !draft.name.trim()) {
      return;
    }

    const wasSuccessful = await refreshAfter(
      () =>
        fetch(`/api/admin/menu/categories/${categoryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name,
            sortOrder: Number(draft.sortOrder),
          }),
        }),
      "Categoría actualizada.",
    );

    if (wasSuccessful) {
      setEditingCategoryId(null);
    }
  }

  async function createItem() {
    if (!newItemName.trim()) {
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

    if (!wasSuccessful) {
      return;
    }

    setNewItemName("");
    setNewItemDescription("");
    setNewItemPrice(0);
    setNewItemSort(0);
    setNewItemCategoryId(UNCATEGORIZED_LANE_ID);
  }

  async function toggleItem(item: Item) {
    await refreshAfter(
      () =>
        fetch(`/api/admin/menu/items/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !item.is_active }),
        }),
      item.is_active ? "Producto pausado." : "Producto activado.",
    );
  }

  function beginItemEdit(item: Item) {
    setEditingItemId(item.id);
    setItemDrafts((prev) => ({
      ...prev,
      [item.id]: {
        name: item.name,
        description: item.description ?? "",
        price: item.price,
        sortOrder: item.sort_order,
        categoryId: getLaneIdForItem(item),
      },
    }));
  }

  function updateItemDraft(itemId: string, field: keyof ItemDraft, value: string | number) {
    setItemDrafts((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? {
          name: "",
          description: "",
          price: 0,
          sortOrder: 0,
          categoryId: UNCATEGORIZED_LANE_ID,
        }),
        [field]: value,
      },
    }));
  }

  async function saveItem(itemId: string) {
    const draft = itemDrafts[itemId];
    if (!draft || !draft.name.trim()) {
      return;
    }

    const wasSuccessful = await refreshAfter(
      () =>
        fetch(`/api/admin/menu/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: normalizeCategoryId(draft.categoryId),
            name: draft.name,
            description: draft.description,
            price: Number(draft.price),
            sortOrder: Number(draft.sortOrder),
          }),
        }),
      "Producto actualizado.",
    );

    if (wasSuccessful) {
      setEditingItemId(null);
    }
  }

  async function moveItemBySelect(item: Item, laneId: string) {
    if (laneId === getLaneIdForItem(item)) {
      return;
    }

    await moveItemToLane(item.id, laneId, null);
  }

  async function moveItemWithinLane(item: Item, direction: "up" | "down") {
    const laneId = getLaneIdForItem(item);
    const laneItems = laneItemsById.get(laneId) ?? [];
    const currentIndex = laneItems.findIndex((laneItem) => laneItem.id === item.id);

    if (currentIndex < 0) {
      return;
    }

    if (direction === "up") {
      if (currentIndex === 0) {
        return;
      }

      await moveItemToLane(item.id, laneId, laneItems[currentIndex - 1]?.id ?? null);
      return;
    }

    if (currentIndex >= laneItems.length - 1) {
      return;
    }

    await moveItemToLane(item.id, laneId, laneItems[currentIndex + 2]?.id ?? null);
  }

  function getSortOrderForInsertion(targetItems: Item[], insertIndex: number) {
    const previousItem = targetItems[insertIndex - 1] ?? null;
    const nextItem = targetItems[insertIndex] ?? null;

    if (!previousItem && !nextItem) {
      return SORT_GAP;
    }

    if (!previousItem && nextItem) {
      if (nextItem.sort_order <= 1) {
        return null;
      }

      return Math.max(1, Math.floor(nextItem.sort_order / 2));
    }

    if (previousItem && !nextItem) {
      return previousItem.sort_order + SORT_GAP;
    }

    if (!previousItem || !nextItem) {
      return null;
    }

    const gap = nextItem.sort_order - previousItem.sort_order;
    if (gap <= 1) {
      return null;
    }

    return previousItem.sort_order + Math.floor(gap / 2);
  }

  async function moveItemToLane(itemId: string, targetLaneId: string, beforeItemId: string | null) {
    const draggedItem = sortedItems.find((item) => item.id === itemId);
    if (!draggedItem) {
      return;
    }

    const sourceLaneId = getLaneIdForItem(draggedItem);
    const sourceItems = [...(laneItemsById.get(sourceLaneId) ?? [])].filter((item) => item.id !== itemId);
    const targetItems =
      sourceLaneId === targetLaneId
        ? sourceItems
        : [...(laneItemsById.get(targetLaneId) ?? [])].filter((item) => item.id !== itemId);

    let insertIndex = beforeItemId ? targetItems.findIndex((item) => item.id === beforeItemId) : targetItems.length;
    if (insertIndex < 0) {
      insertIndex = targetItems.length;
    }

    const nextSortOrder = getSortOrderForInsertion(targetItems, insertIndex);
    const nextCategoryId = normalizeCategoryId(targetLaneId);

    if (nextSortOrder !== null) {
      if (draggedItem.category_id === nextCategoryId && draggedItem.sort_order === nextSortOrder) {
        return;
      }

      const wasSuccessful = await refreshAfter(
        () =>
          fetch(`/api/admin/menu/items/${draggedItem.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              categoryId: nextCategoryId,
              sortOrder: nextSortOrder,
            }),
          }),
        "Orden del tablero actualizado.",
      );

      if (wasSuccessful) {
        setMoveTargets((prev) => ({
          ...prev,
          [itemId]: targetLaneId,
        }));
      }
      return;
    }

    targetItems.splice(insertIndex, 0, {
      ...draggedItem,
      category_id: nextCategoryId,
    });

    const changedItems: Array<{ id: string; categoryId: string | null; sortOrder: number }> = [];

    const collectUpdates = (laneId: string, laneItems: Item[]) => {
      laneItems.forEach((laneItem, index) => {
        const nextCategoryId = normalizeCategoryId(laneId);
        const nextSortOrder = (index + 1) * SORT_GAP;
        if (laneItem.category_id !== nextCategoryId || laneItem.sort_order !== nextSortOrder) {
          changedItems.push({
            id: laneItem.id,
            categoryId: nextCategoryId,
            sortOrder: nextSortOrder,
          });
        }
      });
    };

    if (sourceLaneId === targetLaneId) {
      collectUpdates(targetLaneId, targetItems);
    } else {
      collectUpdates(sourceLaneId, sourceItems);
      collectUpdates(targetLaneId, targetItems);
    }

    if (changedItems.length === 0) {
      return;
    }

    const wasSuccessful = await refreshAfterMany(
      () =>
        Promise.all(
          changedItems.map((update) =>
            fetch(`/api/admin/menu/items/${update.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                categoryId: update.categoryId,
                sortOrder: update.sortOrder,
              }),
            }),
          ),
        ),
      "Orden del tablero actualizado.",
    );

    if (wasSuccessful) {
      setMoveTargets((prev) => ({
        ...prev,
        [itemId]: targetLaneId,
      }));
    }
  }

  function handleItemDragStart(event: DragEvent<HTMLElement>, itemId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemId);
    setDraggingItemId(itemId);
  }

  function resetDragState() {
    setDraggingItemId(null);
    setDragOverLaneId(null);
    setDragOverItemId(null);
  }

  function handleLaneDragOver(event: DragEvent<HTMLElement>, laneId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverLaneId !== laneId) {
      setDragOverLaneId(laneId);
    }
    if (dragOverItemId !== null) {
      setDragOverItemId(null);
    }
  }

  async function handleLaneDrop(event: DragEvent<HTMLElement>, laneId: string) {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text/plain");
    resetDragState();
    if (!itemId) {
      return;
    }
    await moveItemToLane(itemId, laneId, null);
  }

  function handleItemDragOver(event: DragEvent<HTMLElement>, laneId: string, targetItemId: string) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDragOverLaneId(laneId);
    setDragOverItemId(targetItemId);
  }

  async function handleItemDrop(event: DragEvent<HTMLElement>, laneId: string, targetItemId: string) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.dataTransfer.getData("text/plain");
    resetDragState();
    if (!itemId || itemId === targetItemId) {
      return;
    }
    await moveItemToLane(itemId, laneId, targetItemId);
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
      if (res.ok) {
        const body = (await res.json()) as {
          ingredients: { inventory_item_id: string; quantity: number }[];
        };
        setRecipeMap((prev) => ({
          ...prev,
          [itemId]: body.ingredients.map((ingredient) => ({
            inventoryItemId: ingredient.inventory_item_id,
            quantity: ingredient.quantity,
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
      showToast("Primero carga la receta antes de guardar cambios.", "error");
      return;
    }

    const lines = recipeMap[itemId] ?? [];
    const invalid = lines.some((line) => !line.inventoryItemId || line.quantity <= 0);
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

  function renderItemCard(item: Item, laneId: string) {
    const laneItems = laneItemsById.get(laneId) ?? [];
    const currentIndex = laneItems.findIndex((laneItem) => laneItem.id === item.id);
    const itemDraft = itemDrafts[item.id] ?? {
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      sortOrder: item.sort_order,
      categoryId: getLaneIdForItem(item),
    };
    const isEditing = editingItemId === item.id;
    const isRecipeOpen = recipeOpenId === item.id;
    const isDragging = draggingItemId === item.id;
    const isDropTarget = dragOverItemId === item.id;
    const canMoveUp = currentIndex > 0;
    const canMoveDown = currentIndex >= 0 && currentIndex < laneItems.length - 1;

    return (
      <li
        key={item.id}
        className={[
          "rounded-2xl border border-cordero/80 bg-cordero-cream/70 shadow-[0_12px_30px_rgba(70,41,19,0.06)] transition-all",
          isDragging ? "opacity-50" : "opacity-100",
          isDropTarget ? "ring-2 ring-cordero-espresso/40" : "",
        ].join(" ")}
        draggable
        onDragEnd={resetDragState}
        onDragOver={(event) => handleItemDragOver(event, laneId, item.id)}
        onDragStart={(event) => handleItemDragStart(event, item.id)}
        onDrop={(event) => handleItemDrop(event, laneId, item.id)}
      >
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 rounded-full border border-cordero/60 px-2 py-1 text-xs opacity-60"
                title="Arrastra para reordenar o mover"
              >
                ⋮⋮
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-cordero-espresso">{item.name}</p>
                <p className="mt-1 text-sm font-medium text-cordero-espresso/80">{formatPrice(item.price)}</p>
                <p className="mt-1 text-xs opacity-60">
                  {item.category_id ? `Categoría: ${categoryNameById.get(item.category_id) ?? "Sin categoría"}` : "Pendiente de categorizar"}
                </p>
                {item.description ? <p className="mt-2 text-xs opacity-60">{item.description}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full border border-cordero px-3 py-1 text-xs"
                onClick={() => beginItemEdit(item)}
                type="button"
              >
                Editar
              </button>
              <button
                className="rounded-full border border-cordero px-3 py-1 text-xs"
                onClick={() => openRecipe(item.id)}
                type="button"
              >
                {isRecipeOpen ? "Cerrar receta" : "Receta"}
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              aria-label={`Subir ${item.name} dentro de ${laneId === UNCATEGORIZED_LANE_ID ? "Sin categorizar" : categoryNameById.get(laneId) ?? "la categoría"}`}
              className="rounded-full border border-cordero px-3 py-2 text-xs disabled:opacity-40"
              disabled={!canMoveUp}
              onClick={() => moveItemWithinLane(item, "up")}
              type="button"
            >
              Subir
            </button>
            <button
              aria-label={`Bajar ${item.name} dentro de ${laneId === UNCATEGORIZED_LANE_ID ? "Sin categorizar" : categoryNameById.get(laneId) ?? "la categoría"}`}
              className="rounded-full border border-cordero px-3 py-2 text-xs disabled:opacity-40"
              disabled={!canMoveDown}
              onClick={() => moveItemWithinLane(item, "down")}
              type="button"
            >
              Bajar
            </button>
            <select
              aria-label={`Mover ${item.name} a otra columna`}
              className="min-w-0 flex-1 rounded-xl border border-cordero bg-transparent px-3 py-2 text-xs"
              onChange={(event) =>
                setMoveTargets((prev) => ({
                  ...prev,
                  [item.id]: event.target.value,
                }))
              }
              value={moveTargets[item.id] ?? getLaneIdForItem(item)}
            >
              <option value={UNCATEGORIZED_LANE_ID}>Sin categorizar</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}{category.is_active ? "" : " (pausada)"}
                </option>
              ))}
            </select>
            <button
              className="rounded-full border border-cordero px-4 py-2 text-xs disabled:opacity-40"
              disabled={(moveTargets[item.id] ?? getLaneIdForItem(item)) === getLaneIdForItem(item)}
              onClick={() => moveItemBySelect(item, moveTargets[item.id] ?? getLaneIdForItem(item))}
              type="button"
            >
              Mover
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="border-t border-cordero/60 bg-cordero-card/80 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-medium opacity-70">
                Nombre
                <input
                  className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                  onChange={(event) => updateItemDraft(item.id, "name", event.target.value)}
                  value={itemDraft.name}
                />
              </label>
              <label className="text-xs font-medium opacity-70">
                Destino
                <select
                  className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                  onChange={(event) => updateItemDraft(item.id, "categoryId", event.target.value)}
                  value={itemDraft.categoryId}
                >
                  <option value={UNCATEGORIZED_LANE_ID}>Sin categorizar</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}{category.is_active ? "" : " (pausada)"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium opacity-70 md:col-span-2">
                Descripción
                <textarea
                  className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                  onChange={(event) => updateItemDraft(item.id, "description", event.target.value)}
                  rows={3}
                  value={itemDraft.description}
                />
              </label>
              <label className="text-xs font-medium opacity-70">
                Precio
                <input
                  className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                  onChange={(event) => updateItemDraft(item.id, "price", Number(event.target.value))}
                  type="number"
                  value={itemDraft.price}
                />
              </label>
              <label className="text-xs font-medium opacity-70">
                Orden
                <input
                  className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                  onChange={(event) => updateItemDraft(item.id, "sortOrder", Number(event.target.value))}
                  type="number"
                  value={itemDraft.sortOrder}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded-full bg-cordero-espresso px-4 py-2 text-xs text-cordero-cream"
                onClick={() => saveItem(item.id)}
                type="button"
              >
                Guardar producto
              </button>
              <button
                className="rounded-full border border-cordero px-4 py-2 text-xs"
                onClick={() => setEditingItemId(null)}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}

        {isRecipeOpen ? (
          <div className="border-t border-cordero/60 px-4 py-4">
            <p className="mb-2 text-xs font-medium opacity-60">Insumos que consume este producto por unidad pedida</p>

            {recipeLoadingId === item.id ? (
              <p className="text-xs opacity-60">Cargando…</p>
            ) : inventoryItems.length === 0 ? (
              <p className="text-xs opacity-60">Primero agrega insumos en la pestaña Inventario.</p>
            ) : (
              <div className="space-y-2">
                {(recipeMap[item.id] ?? []).map((line, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      aria-label={`Ingrediente ${index + 1} para ${item.name}`}
                      className="flex-1 rounded-xl border border-cordero bg-transparent px-2 py-1 text-xs"
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
                      aria-label={`Cantidad del ingrediente ${index + 1} para ${item.name}`}
                      className="w-24 rounded-xl border border-cordero bg-transparent px-2 py-1 text-xs"
                      min={0.001}
                      onChange={(event) => updateIngredientLine(item.id, index, "quantity", Number(event.target.value))}
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

                <div className="flex flex-wrap gap-2 pt-1">
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
          </div>
        ) : null}
      </li>
    );
  }

  function renderLane(lane: Lane) {
    const isDropZoneActive = dragOverLaneId === lane.id && dragOverItemId === null;
    const isEditingCategory = lane.category && editingCategoryId === lane.id;
    const categoryDraft = lane.category
      ? categoryDrafts[lane.id] ?? { name: lane.category.name, sortOrder: lane.category.sort_order }
      : null;

    return (
      <article
        key={lane.id}
        className={[
          "rounded-[28px] border border-cordero/70 bg-cordero-card p-5 shadow-[0_20px_60px_rgba(70,41,19,0.08)]",
          isDropZoneActive ? "border-cordero-espresso bg-cordero-espresso/5" : "",
          lane.category && !lane.category.is_active ? "opacity-80" : "",
        ].join(" ")}
      >
        <div className="flex flex-col gap-4 border-b border-cordero/50 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-2xl text-cordero-espresso">{lane.title}</p>
              <p className="mt-1 text-xs opacity-70">{lane.subtitle}</p>
            </div>
            {lane.category ? (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="rounded-full border border-cordero px-3 py-1 text-xs"
                  onClick={() => lane.category && beginCategoryEdit(lane.category)}
                  type="button"
                >
                  Editar
                </button>
                <button
                  className="rounded-full border border-cordero px-3 py-1 text-xs"
                  onClick={() => lane.category && toggleCategory(lane.category)}
                  type="button"
                >
                  {lane.category.is_active ? "Desactivar" : "Activar"}
                </button>
              </div>
            ) : (
              <span className="rounded-full border border-cordero/60 px-3 py-1 text-xs opacity-70">Bandeja base</span>
            )}
          </div>

          {isEditingCategory && categoryDraft ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),140px,auto] md:items-end">
              <label className="text-xs font-medium opacity-70">
                Nombre
                <input
                  className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                  onChange={(event) => updateCategoryDraft(lane.id, "name", event.target.value)}
                  value={categoryDraft.name}
                />
              </label>
              <label className="text-xs font-medium opacity-70">
                Orden
                <input
                  className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                  onChange={(event) => updateCategoryDraft(lane.id, "sortOrder", Number(event.target.value))}
                  type="number"
                  value={categoryDraft.sortOrder}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full bg-cordero-espresso px-4 py-2 text-xs text-cordero-cream"
                  onClick={() => saveCategory(lane.id)}
                  type="button"
                >
                  Guardar
                </button>
                <button
                  className="rounded-full border border-cordero px-4 py-2 text-xs"
                  onClick={() => setEditingCategoryId(null)}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={[
            "mt-4 rounded-2xl border border-dashed border-cordero/60 bg-cordero-cream/35 p-3 transition-colors",
            isDropZoneActive ? "border-cordero-espresso bg-cordero-espresso/10" : "",
          ].join(" ")}
          onDragOver={(event) => handleLaneDragOver(event, lane.id)}
          onDrop={(event) => handleLaneDrop(event, lane.id)}
        >
          <p className="mb-3 text-xs opacity-60">
            Arrastra un producto aquí o usa Subir, Bajar y Mover para acomodarlo sin depender del drag-and-drop.
          </p>

          {lane.items.length > 0 ? (
            <ul className="space-y-3">{lane.items.map((item) => renderItemCard(item, lane.id))}</ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-cordero/50 px-4 py-8 text-center text-sm opacity-60">
              {lane.emptyState}
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <section className="mt-10 space-y-8">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[28px] border border-cordero bg-cordero-card p-5 shadow-[0_20px_50px_rgba(70,41,19,0.08)]">
          <p className="text-xs font-medium uppercase tracking-[0.24em] opacity-50">Pendientes</p>
          <p className="mt-3 font-heading text-4xl text-cordero-espresso">{uncategorizedItems.length}</p>
          <p className="mt-2 text-sm opacity-70">Productos que todavía no tienen lugar claro en el menú.</p>
        </div>
        <div className="rounded-[28px] border border-cordero bg-cordero-card p-5 shadow-[0_20px_50px_rgba(70,41,19,0.08)]">
          <p className="text-xs font-medium uppercase tracking-[0.24em] opacity-50">Categorías activas</p>
          <p className="mt-3 font-heading text-4xl text-cordero-espresso">{activeCategories}</p>
          <p className="mt-2 text-sm opacity-70">Columnas publicables listas para recibir productos.</p>
        </div>
        <div className="rounded-[28px] border border-cordero bg-cordero-card p-5 shadow-[0_20px_50px_rgba(70,41,19,0.08)]">
          <p className="text-xs font-medium uppercase tracking-[0.24em] opacity-50">Ya acomodados</p>
          <p className="mt-3 font-heading text-4xl text-cordero-espresso">{categorizedItemsCount}</p>
          <p className="mt-2 text-sm opacity-70">Productos visibles dentro de una categoría concreta del tablero.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr),360px]">
        <div className="rounded-[32px] border border-cordero bg-cordero-card p-6 shadow-[0_24px_60px_rgba(70,41,19,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-3xl text-cordero-espresso">Crear producto</h3>
              <p className="mt-2 max-w-2xl text-sm opacity-70">
                Puedes dejarlo sin categoría para revisarlo después o mandarlo directo a una columna desde su creación.
              </p>
            </div>
            <span className="rounded-full border border-cordero/60 px-3 py-1 text-xs opacity-70">Board-first</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium opacity-70">
              Nombre del producto
              <input
                className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                onChange={(event) => setNewItemName(event.target.value)}
                placeholder="Ej. Flat White naranja"
                value={newItemName}
              />
            </label>
            <label className="text-xs font-medium opacity-70">
              Destino inicial
              <select
                className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                onChange={(event) => setNewItemCategoryId(event.target.value)}
                value={newItemCategoryId}
              >
                <option value={UNCATEGORIZED_LANE_ID}>Sin categorizar</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}{category.is_active ? "" : " (pausada)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium opacity-70 md:col-span-2">
              Descripción
              <textarea
                className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                onChange={(event) => setNewItemDescription(event.target.value)}
                placeholder="Qué lo hace distinto y cómo se presenta en el menú"
                rows={3}
                value={newItemDescription}
              />
            </label>
            <label className="text-xs font-medium opacity-70">
              Precio
              <input
                className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                onChange={(event) => setNewItemPrice(Number(event.target.value))}
                type="number"
                value={newItemPrice}
              />
            </label>
            <label className="text-xs font-medium opacity-70">
              Orden inicial
              <input
                className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                onChange={(event) => setNewItemSort(Number(event.target.value))}
                type="number"
                value={newItemSort}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="rounded-full bg-cordero-espresso px-5 py-2 text-sm text-cordero-cream disabled:opacity-50"
              disabled={isPending}
              onClick={createItem}
              type="button"
            >
              Crear producto
            </button>
            <span className="self-center text-xs opacity-60">
              Tip: si aún no sabes dónde va, mándalo a Sin categorizar y ordénalo después.
            </span>
          </div>
        </div>

        <div className="rounded-[32px] border border-cordero bg-cordero-card p-6 shadow-[0_24px_60px_rgba(70,41,19,0.08)]">
          <h3 className="font-heading text-3xl text-cordero-espresso">Crear categoría</h3>
          <p className="mt-2 text-sm opacity-70">Nuevas columnas del tablero para acomodar el menú con más claridad.</p>

          <div className="mt-5 space-y-4">
            <label className="block text-xs font-medium opacity-70">
              Nombre
              <input
                className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Ej. Especiales de temporada"
                value={newCategoryName}
              />
            </label>
            <label className="block text-xs font-medium opacity-70">
              Orden
              <input
                className="mt-1 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                onChange={(event) => setNewCategorySort(Number(event.target.value))}
                type="number"
                value={newCategorySort}
              />
            </label>
            <button
              className="w-full rounded-full bg-cordero-espresso px-4 py-2 text-sm text-cordero-cream disabled:opacity-50"
              disabled={isPending}
              onClick={createCategory}
              type="button"
            >
              Crear categoría
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px,minmax(0,1fr)]">
        <div className="xl:sticky xl:top-6 xl:self-start">{renderLane(lanes[0])}</div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-heading text-3xl text-cordero-espresso">Tablero de categorías</h3>
              <p className="mt-1 text-sm opacity-70">
                Arrastra dentro de una columna para reordenar o suelta un producto en otra para recategorizarlo.
              </p>
            </div>
            <p className="text-xs opacity-60">Las categorías pausadas siguen aquí para editarse, pero quedan marcadas como inactivas.</p>
          </div>

          {categoryLanes.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">{categoryLanes.map((lane) => renderLane(lane))}</div>
          ) : (
            <div className="rounded-[32px] border border-dashed border-cordero bg-cordero-card px-6 py-12 text-center text-sm opacity-60">
              Crea tu primera categoría para empezar a acomodar el menú.
            </div>
          )}
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-2xl border border-cordero px-4 py-3 text-sm" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
