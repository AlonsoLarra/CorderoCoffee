"use client";

import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/ui/toast-provider";
import type { ItemModifier, MenuCategoryWithItems, MenuItemLite } from "@/lib/services/menu";
import type { CreateOrderRequest, CreateOrderResponse, SelectedModifier } from "@/lib/types/checkout";
import type { PaymentMethod, PickupType } from "@/lib/types/domain";

type CartLine = {
  itemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  modifiers: SelectedModifier[];
};

type ModifierPickerState = {
  item: MenuItemLite;
  selections: Record<string, string>;
};

type DraftCartProps = {
  categories: MenuCategoryWithItems[];
};

const STORAGE_KEY = "cordero.draftCart.v1";

function loadCartLines(): CartLine[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

function saveCartLines(lines: CartLine[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

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
                  className={
                    isSelected
                      ? "rounded-full bg-cordero-espresso px-3 py-1 text-xs text-cordero-cream"
                      : "rounded-full border border-cordero px-3 py-1 text-xs text-cordero-espresso"
                  }
                  onClick={() => onChange(mod.id, option)}
                  type="button"
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

export function DraftCart({ categories }: DraftCartProps) {
  const { showToast } = useToast();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [pickupType, setPickupType] = useState<PickupType>("ahora");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [scheduledPickupAt, setScheduledPickupAt] = useState("");
  const [notes, setNotes] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modifierPicker, setModifierPicker] = useState<ModifierPickerState | null>(null);

  useEffect(() => {
    setLines(loadCartLines());
  }, []);

  useEffect(() => {
    saveCartLines(lines);
  }, [lines]);

  const allItems = useMemo(() => {
    return categories.flatMap((category) => category.items);
  }, [categories]);

  const total = useMemo(() => {
    return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  }, [lines]);

  function handleAddItem(item: MenuItemLite) {
    if (item.modifiers.length > 0) {
      setModifierPicker({ item, selections: {} });
      return;
    }

    commitAddItem(item, []);
  }

  function commitAddItem(item: MenuItemLite, selectedModifiers: SelectedModifier[]) {
    setLines((current) => {
      // Items without modifiers can be merged; items with modifiers always create a new line
      if (selectedModifiers.length === 0) {
        const existing = current.find(
          (line) => line.itemId === item.id && line.modifiers.length === 0,
        );
        if (existing) {
          return current.map((line) =>
            line.itemId === item.id && line.modifiers.length === 0
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          );
        }
      }

      return [
        ...current,
        {
          itemId: item.id,
          itemName: item.name,
          unitPrice: item.price,
          quantity: 1,
          modifiers: selectedModifiers,
        },
      ];
    });
  }

  function handleModifierPickerChange(modifierId: string, option: string) {
    setModifierPicker((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        selections: { ...prev.selections, [modifierId]: option },
      };
    });
  }

  function handleModifierPickerConfirm() {
    if (!modifierPicker) return;

    const { item, selections } = modifierPicker;

    const missingRequired = item.modifiers.find(
      (mod) => mod.isRequired && !selections[mod.id],
    );

    if (missingRequired) {
      showToast(`Debes seleccionar una opcion para: ${missingRequired.name}`, "error");
      return;
    }

    const selectedModifiers: SelectedModifier[] = item.modifiers
      .filter((mod) => selections[mod.id])
      .map((mod) => ({
        modifierName: mod.name,
        selectedOption: selections[mod.id],
      }));

    commitAddItem(item, selectedModifiers);
    setModifierPicker(null);
  }

  function handleModifierPickerCancel() {
    setModifierPicker(null);
  }

  function updateQuantity(itemId: string, lineIndex: number, nextQuantity: number) {
    setLines((current) => {
      if (nextQuantity <= 0) {
        return current.filter((_, idx) => idx !== lineIndex);
      }

      return current.map((line, idx) =>
        idx === lineIndex ? { ...line, quantity: nextQuantity } : line,
      );
    });
  }

  async function submitOrder() {
    if (lines.length === 0 || isSubmitting) {
      return;
    }

    setCheckoutError(null);
    setIsSubmitting(true);

    const payload: CreateOrderRequest = {
      lines: lines.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        modifiers: line.modifiers,
      })),
      pickupType,
      paymentMethod,
      notes,
      scheduledPickupAt: pickupType === "agendar" ? scheduledPickupAt : undefined,
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "No pudimos crear tu pedido.");
      }

      const body = (await response.json()) as CreateOrderResponse;

      setLines([]);
      setNotes("");
      setScheduledPickupAt("");
      setPickupType("ahora");
      setPaymentMethod("cash");
      window.localStorage.removeItem(STORAGE_KEY);
      showToast("Pedido creado correctamente.", "success");

      window.location.href = `/pedido/confirmacion?orderId=${encodeURIComponent(body.orderId)}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos crear tu pedido. Intenta de nuevo.";
      setCheckoutError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-6">
        {categories.map((category) => (
          <div key={category.id} className="rounded-2xl border border-cordero bg-cordero-card p-5">
            <h2 className="font-heading text-2xl text-cordero-espresso">{category.name}</h2>

            <ul className="mt-4 space-y-3">
              {category.items.map((item) => {
                const isPickerOpen = modifierPicker?.item.id === item.id;
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-cordero px-4 py-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-cordero-espresso">{item.name}</p>
                        {item.description ? (
                          <p className="mt-1 text-xs text-cordero-espresso opacity-75">{item.description}</p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm text-cordero-espresso">{formatPrice(item.price)}</span>
                        <button
                          className="rounded-full bg-cordero-espresso px-3 py-1 text-xs text-cordero-cream"
                          onClick={() => handleAddItem(item)}
                          type="button"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>

                    {isPickerOpen && modifierPicker ? (
                      <div className="mt-3 rounded-xl border border-cordero bg-cordero-card p-4">
                        <p className="text-xs font-medium text-cordero-espresso">Personaliza tu pedido</p>
                        <ModifierPicker
                          modifiers={item.modifiers}
                          selections={modifierPicker.selections}
                          onChange={handleModifierPickerChange}
                        />
                        <div className="mt-4 flex gap-2">
                          <button
                            className="rounded-full bg-cordero-espresso px-3 py-1 text-xs text-cordero-cream"
                            onClick={handleModifierPickerConfirm}
                            type="button"
                          >
                            Confirmar
                          </button>
                          <button
                            className="rounded-full border border-cordero px-3 py-1 text-xs text-cordero-espresso"
                            onClick={handleModifierPickerCancel}
                            type="button"
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

      <aside className="h-fit rounded-2xl border border-cordero bg-cordero-card p-5">
        <h2 className="font-heading text-2xl text-cordero-espresso">Carrito draft</h2>
        <p className="mt-1 text-xs text-cordero-espresso opacity-75">
          Persistencia local para modo invitado mientras conectamos checkout.
        </p>

        <ul className="mt-4 space-y-3">
          {lines.length === 0 ? (
            <li className="text-sm text-cordero-espresso opacity-75">Aun no agregas productos.</li>
          ) : (
            lines.map((line, idx) => (
              <li key={`${line.itemId}-${idx}`} className="rounded-xl border border-cordero px-3 py-2">
                <p className="text-sm text-cordero-espresso">{line.itemName}</p>
                {line.modifiers.length > 0 ? (
                  <p className="mt-0.5 text-xs text-cordero-espresso opacity-60">
                    {line.modifiers.map((m) => m.selectedOption).join(", ")}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full border border-cordero px-2 text-xs"
                      onClick={() => updateQuantity(line.itemId, idx, line.quantity - 1)}
                      type="button"
                    >
                      -
                    </button>
                    <span className="text-sm">{line.quantity}</span>
                    <button
                      className="rounded-full border border-cordero px-2 text-xs"
                      onClick={() => updateQuantity(line.itemId, idx, line.quantity + 1)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm">{formatPrice(line.unitPrice * line.quantity)}</span>
                </div>
              </li>
            ))
          )}
        </ul>

        <div className="mt-5 border-t border-cordero pt-4">
          <label className="block text-xs font-medium">Retiro</label>
          <select
            className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setPickupType(event.target.value as PickupType)}
            value={pickupType}
          >
            <option value="ahora">Ahora</option>
            <option value="agendar">Agendar</option>
            <option value="al_llegar">Al llegar</option>
          </select>

          {pickupType === "agendar" ? (
            <>
              <label className="mt-3 block text-xs font-medium">Fecha y hora de retiro</label>
              <input
                className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                min={new Date().toISOString().slice(0, 16)}
                onChange={(event) => setScheduledPickupAt(event.target.value)}
                type="datetime-local"
                value={scheduledPickupAt}
              />
            </>
          ) : null}

          <label className="mt-3 block text-xs font-medium">Pago</label>
          <select
            className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            value={paymentMethod}
          >
            <option value="cash">Efectivo</option>
            <option value="card_pending">Tarjeta al retirar</option>
          </select>

          <label className="mt-3 block text-xs font-medium">Notas (opcional)</label>
          <textarea
            className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Sin azucar, leche de avena, etc."
            rows={3}
            value={notes}
          />

          <div className="flex items-center justify-between text-sm font-medium">
            <span>Total estimado</span>
            <span>{formatPrice(total)}</span>
          </div>

          {checkoutError ? (
            <p className="mt-3 text-xs text-cordero-espresso opacity-80">{checkoutError}</p>
          ) : null}

          <button
            className="mt-4 w-full rounded-full border border-cordero px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={lines.length === 0 || isSubmitting}
            onClick={submitOrder}
            type="button"
          >
            {isSubmitting ? "Creando pedido..." : "Confirmar pedido"}
          </button>
        </div>

        <p className="mt-3 text-xs text-cordero-espresso opacity-70">Items cargados: {allItems.length}</p>
      </aside>
    </div>
  );
}
