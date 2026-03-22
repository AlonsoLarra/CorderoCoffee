"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast-provider";

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

type MenuManagerProps = {
  categories: Category[];
  items: Item[];
};

export function MenuManager({ categories, items }: MenuManagerProps) {
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
            <li key={item.id} className="flex items-center justify-between rounded-xl border border-cordero px-3 py-2 text-sm">
              <span>
                {item.name} - ${item.price}
              </span>
              <button
                className="rounded-full border border-cordero px-3 py-1 text-xs"
                onClick={() => toggleItem(item)}
                type="button"
              >
                {item.is_active ? "Desactivar" : "Activar"}
              </button>
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
