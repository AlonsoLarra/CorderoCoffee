"use client";

import { useMemo, useRef, useState } from "react";

import { useToast } from "@/components/ui/toast-provider";
import type { ItemModifier, MenuCategoryWithItems, MenuItemLite } from "@/lib/services/menu";
import type { SelectedModifier } from "@/lib/types/checkout";

import { CartDrawer } from "./cart-drawer";
import { useCart } from "./use-cart";

type ModifierSheetState = {
  item: MenuItemLite;
  selections: Record<string, string>;
  quantity: number;
  notes: string;
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

function ProductSheet({
  state,
  onChange,
  onClose,
  onConfirm,
}: {
  state: ModifierSheetState;
  onChange: (next: ModifierSheetState) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { item, selections, quantity, notes } = state;

  const missingRequired = item.modifiers.filter((mod) => mod.isRequired && !selections[mod.id]);
  const canConfirm = missingRequired.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-[rgba(30,18,10,0.45)]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        className="relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-cordero-card pb-safe-4 shadow-2xl sm:max-w-md sm:rounded-[28px]"
      >
        {/* Grabber */}
        <div className="flex justify-center pt-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="h-[5px] w-10 rounded-full bg-[hsl(var(--color-espresso)/0.2)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 pt-4">
          <h2 className="font-heading text-[26px] leading-tight text-cordero-espresso">{item.name}</h2>
          {item.description ? (
            <p className="mt-1.5 text-sm text-[hsl(var(--color-espresso)/0.6)]">{item.description}</p>
          ) : null}

          <div className="mt-5 space-y-5">
            {item.modifiers.map((mod: ItemModifier) => (
              <div key={mod.id}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--color-espresso)/0.55)]">
                  {mod.name} {mod.isRequired ? "· Requerido" : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2.5">
                  {mod.options.map((option) => {
                    const isSelected = selections[mod.id] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          onChange({ ...state, selections: { ...selections, [mod.id]: option } })
                        }
                        className={`btn-press rounded-2xl border px-4 py-2.5 text-left text-sm transition-colors ${
                          isSelected
                            ? "border-2 border-[hsl(var(--color-espresso))] bg-[hsl(var(--color-sand)/0.5)] font-medium text-cordero-espresso"
                            : "border-[hsl(var(--color-espresso)/0.14)] text-cordero-espresso"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--color-espresso)/0.55)]">
                Notas
              </p>
              <input
                type="text"
                value={notes}
                onChange={(e) => onChange({ ...state, notes: e.target.value })}
                placeholder="Sin azúcar, leche de avena, etc."
                className="mt-2 w-full rounded-full border border-[hsl(var(--color-espresso)/0.2)] bg-transparent px-4 py-2.5 text-sm text-cordero-espresso outline-none placeholder:text-[hsl(var(--color-espresso)/0.45)] focus:border-[hsl(var(--color-espresso)/0.4)]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-[hsl(var(--color-espresso)/0.1)] px-6 py-4">
          <div className="flex items-center gap-3 rounded-full bg-[hsl(var(--color-sand)/0.6)] px-2 py-1.5">
            <button
              type="button"
              onClick={() => onChange({ ...state, quantity: Math.max(1, quantity - 1) })}
              className="flex h-8 w-8 items-center justify-center rounded-full text-cordero-espresso"
              aria-label="Quitar uno"
            >
              −
            </button>
            <span className="min-w-[1.25rem] text-center text-sm font-medium text-cordero-espresso">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onChange({ ...state, quantity: quantity + 1 })}
              className="flex h-8 w-8 items-center justify-center rounded-full text-cordero-espresso"
              aria-label="Agregar uno"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="btn-press flex flex-1 items-center justify-between rounded-full bg-cordero-espresso px-5 py-3.5 text-[15px] font-semibold text-cordero-cream disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>Agregar</span>
            <span>{formatPrice(item.price * quantity)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderingShell({ categories }: OrderingShellProps) {
  const { showToast } = useToast();
  const cart = useCart();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sheet, setSheet] = useState<ModifierSheetState | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(categories[0]?.id ?? null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  function isOutOfStock(item: MenuItemLite): boolean {
    return item.trackStock && item.stockQuantity !== null && item.stockQuantity <= 0;
  }

  function scrollToCategory(categoryId: string) {
    setActiveCategoryId(categoryId);
    sectionRefs.current[categoryId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleAddItem(item: MenuItemLite) {
    if (isOutOfStock(item)) {
      showToast(`${item.name} está agotado.`, "error");
      return;
    }
    if (item.modifiers.length > 0) {
      setSheet({ item, selections: {}, quantity: 1, notes: "" });
      return;
    }
    cart.addLine({ id: item.id, name: item.name, price: item.price });
    showToast(`${item.name} agregado`, "success");
  }

  function handleSheetConfirm() {
    if (!sheet) return;
    const { item, selections, quantity } = sheet;

    const missingRequired = item.modifiers.find((mod) => mod.isRequired && !selections[mod.id]);
    if (missingRequired) {
      showToast(`Debes seleccionar una opción para: ${missingRequired.name}`, "error");
      return;
    }

    const selectedModifiers: SelectedModifier[] = item.modifiers
      .filter((mod) => selections[mod.id])
      .map((mod) => ({ modifierName: mod.name, selectedOption: selections[mod.id] }));

    cart.addLine({ id: item.id, name: item.name, price: item.price }, selectedModifiers, quantity);
    setSheet(null);
    showToast(`${item.name} agregado`, "success");
  }

  return (
    <>
      {/* Category chips */}
      {orderedCategories.length > 1 ? (
        <div className="sticky top-0 z-30 -mx-5 mt-6 bg-cordero-cream/95 px-5 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:px-3">
          <div className="flex gap-2 overflow-x-auto">
            {orderedCategories.map((category) => {
              const isActive = activeCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => scrollToCategory(category.id)}
                  className={`btn-press whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                    isActive
                      ? "bg-cordero-espresso text-cordero-cream"
                      : "border border-[hsl(var(--color-espresso)/0.25)] text-cordero-espresso"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Menu list */}
      <section className="mt-5 space-y-7 pb-28">
        {orderedCategories.map((category) => (
          <div
            key={category.id}
            ref={(el) => {
              sectionRefs.current[category.id] = el;
            }}
            className="scroll-mt-24"
          >
            <h2 className="font-heading text-[19px] text-cordero-espresso">{category.name}</h2>

            <div className="mt-3 rounded-[20px] bg-cordero-card px-[18px] py-1 shadow-cordero-card">
              {category.items.map((item, idx) => {
                const outOfStock = isOutOfStock(item);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 py-3.5 ${
                      idx > 0 ? "border-t border-[hsl(var(--color-espresso)/0.08)]" : ""
                    } ${outOfStock ? "opacity-60" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-medium text-cordero-espresso">{item.name}</p>
                        {outOfStock && (
                          <span className="rounded-full bg-[hsl(var(--color-terracotta)/0.14)] px-2 py-0.5 text-[11px] text-[hsl(var(--color-terracotta-dark))]">
                            Agotado
                          </span>
                        )}
                      </div>
                      {item.description ? (
                        <p className="mt-1 text-[13px] leading-[1.4] text-[hsl(var(--color-espresso)/0.6)]">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <span className="text-[15px] font-semibold text-cordero-espresso">
                        {formatPrice(item.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddItem(item)}
                        disabled={outOfStock}
                        aria-label={`Agregar ${item.name}`}
                        className="btn-press flex h-8 w-8 items-center justify-center rounded-full bg-cordero-espresso text-lg leading-none text-cordero-cream disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Sticky bottom cart bar */}
      {cart.itemCount > 0 ? (
        <div className="bottom-safe-0 fixed inset-x-0 z-40 px-4 pb-4">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="btn-press mx-auto flex w-full max-w-md items-center justify-between rounded-full bg-cordero-espresso px-5 py-4 text-cordero-cream shadow-cordero-cta sm:max-w-lg"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cordero-cream text-xs font-bold text-cordero-espresso">
                {cart.itemCount}
              </span>
              <span className="text-[15px] font-semibold">Ver carrito</span>
            </span>
            <span className="text-[15px] font-semibold">{formatPrice(cart.total)}</span>
          </button>
        </div>
      ) : null}

      {/* Product customization bottom sheet */}
      {sheet ? (
        <ProductSheet
          state={sheet}
          onChange={setSheet}
          onClose={() => setSheet(null)}
          onConfirm={handleSheetConfirm}
        />
      ) : null}

      {/* Cart Drawer (full cart / checkout) */}
      <CartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} cart={cart} />
    </>
  );
}
