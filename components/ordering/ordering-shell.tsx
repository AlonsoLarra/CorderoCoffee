"use client";

import { useState } from "react";

import { useToast } from "@/components/ui/toast-provider";
import type { ItemModifier, MenuCategoryWithItems, MenuItemLite } from "@/lib/services/menu";
import type { SelectedModifier } from "@/lib/types/checkout";

import { CartDrawer } from "./cart-drawer";
import { useCart } from "./use-cart";

type ModifierPickerState = {
  item: MenuItemLite;
  selections: Record<string, string>;
};

type OrderingShellProps = {
  categories: MenuCategoryWithItems[];
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function ModifierPicker({
  modifiers,
  selections,
  onChange,
}: {
  modifiers: ItemModifier[];
  selections: Record<string, string>;
  onChange: (modifierId: string, option: string) => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      {modifiers.map((mod) => (
        <div key={mod.id}>
          <p className="text-xs font-medium text-cordero-espresso">
            {mod.name}
            {mod.isRequired ? (
              <span className="ml-1 text-cordero-espresso opacity-60">*</span>
            ) : null}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {mod.options.map((option) => {
              const isSelected = selections[mod.id] === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(mod.id, option)}
                  className={
                    isSelected
                      ? "rounded-full bg-cordero-espresso px-3 py-1 text-xs text-cordero-cream"
                      : "rounded-full border border-cordero px-3 py-1 text-xs text-cordero-espresso"
                  }
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderingShell({ categories }: OrderingShellProps) {
  const { showToast } = useToast();
  const cart = useCart();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [modifierPicker, setModifierPicker] = useState<ModifierPickerState | null>(null);

  function handleAddItem(item: MenuItemLite) {
    if (item.modifiers.length > 0) {
      setModifierPicker({ item, selections: {} });
      return;
    }
    cart.addLine({ id: item.id, name: item.name, price: item.price });
    showToast(`${item.name} agregado`, "success");
  }

  function handleModifierChange(modifierId: string, option: string) {
    setModifierPicker((prev) =>
      prev ? { ...prev, selections: { ...prev.selections, [modifierId]: option } } : prev,
    );
  }

  function handleModifierConfirm() {
    if (!modifierPicker) return;
    const { item, selections } = modifierPicker;

    const missingRequired = item.modifiers.find(
      (mod) => mod.isRequired && !selections[mod.id],
    );
    if (missingRequired) {
      showToast(`Debes seleccionar una opción para: ${missingRequired.name}`, "error");
      return;
    }

    const selectedModifiers: SelectedModifier[] = item.modifiers
      .filter((mod) => selections[mod.id])
      .map((mod) => ({ modifierName: mod.name, selectedOption: selections[mod.id] }));

    cart.addLine({ id: item.id, name: item.name, price: item.price }, selectedModifiers);
    setModifierPicker(null);
    showToast(`${item.name} agregado`, "success");
  }

  return (
    <>
      {/* Menu list */}
      <section className="mt-8 space-y-6">
        {categories.map((category) => (
          <div
            key={category.id}
            className="rounded-2xl border border-cordero bg-cordero-card p-5"
          >
            <h2 className="font-heading text-2xl text-cordero-espresso">{category.name}</h2>

            <ul className="mt-4 space-y-3">
              {category.items.map((item) => {
                const isPickerOpen = modifierPicker?.item.id === item.id;
                return (
                  <li key={item.id} className="rounded-xl border border-cordero px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-cordero-espresso">{item.name}</p>
                        {item.description ? (
                          <p className="mt-1 text-xs text-cordero-espresso opacity-75">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-cordero-espresso">
                          {formatPrice(item.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddItem(item)}
                          className="rounded-full bg-cordero-espresso px-3 py-1 text-xs text-cordero-cream"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>

                    {isPickerOpen && modifierPicker ? (
                      <div className="mt-3 rounded-xl border border-cordero bg-cordero-card p-4">
                        <p className="text-xs font-medium text-cordero-espresso">
                          Personaliza tu pedido
                        </p>
                        <ModifierPicker
                          modifiers={item.modifiers}
                          selections={modifierPicker.selections}
                          onChange={handleModifierChange}
                        />
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={handleModifierConfirm}
                            className="rounded-full bg-cordero-espresso px-3 py-1 text-xs text-cordero-cream"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setModifierPicker(null)}
                            className="rounded-full border border-cordero px-3 py-1 text-xs text-cordero-espresso"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      {/* Floating cart button */}
      {cart.itemCount > 0 ? (
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="bottom-safe-6 fixed right-4 z-40 flex items-center gap-2.5 rounded-full bg-cordero-espresso px-5 py-3 text-sm text-cordero-cream shadow-lg sm:right-6"
        >
          <span>Ver carrito</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cordero-cream text-xs font-bold text-cordero-espresso">
            {cart.itemCount}
          </span>
        </button>
      ) : null}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        cart={cart}
      />
    </>
  );
}
