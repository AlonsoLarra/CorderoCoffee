"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/toast-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CreateOrderRequest, CreateOrderResponse } from "@/lib/types/checkout";
import type { PaymentMethod, PickupType } from "@/lib/types/domain";

import { saveLocalOrder } from "./local-orders-panel";
import type { CartLine } from "./use-cart";

type CartHandle = {
  lines: CartLine[];
  total: number;
  updateQuantity: (lineIndex: number, nextQuantity: number) => void;
  clearCart: () => void;
};

type CartCheckoutProps = {
  cart: CartHandle;
  onOrderSuccess?: (orderId: string) => void;
  onViewMenu?: () => void;
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CartCheckout({ cart, onOrderSuccess, onViewMenu }: CartCheckoutProps) {
  const { showToast } = useToast();
  const { lines, total, updateQuantity, clearCart } = cart;

  const [pickupType, setPickupType] = useState<PickupType>("ahora");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [scheduledPickupAt, setScheduledPickupAt] = useState("");
  const [notes, setNotes] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Discount & points
  const [discountCode, setDiscountCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    codeId: string;
    code: string;
    discountAmount: number;
  } | null>(null);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(false);

  useEffect(() => {
    // Load user points
    void (async () => {
      const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("reward_points").eq("id", user.id).maybeSingle();
      const profile = data as unknown as { reward_points: number } | null;
      if (profile) setUserPoints(profile.reward_points ?? 0);
    })();
  }, []);

  async function applyDiscountCode() {
    if (!discountCode.trim()) return;
    setValidatingCode(true);
    try {
      const res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCode.trim(), subtotal: total }),
      });
      const body = (await res.json()) as {
        codeId?: string;
        code?: string;
        discountAmount?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Código inválido.");
      setAppliedDiscount({
        codeId: body.codeId!,
        code: body.code!,
        discountAmount: body.discountAmount!,
      });
      showToast(`Descuento aplicado: ${formatPrice(body.discountAmount!)}`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Código inválido.", "error");
    } finally {
      setValidatingCode(false);
    }
  }

  const pointsDiscount = redeemPoints && userPoints ? Math.min(userPoints, total) : 0;
  const finalTotal = Math.max(0, total - (appliedDiscount?.discountAmount ?? 0) - pointsDiscount);

  async function submitOrder() {
    if (lines.length === 0 || isSubmitting) return;

    setCheckoutError(null);
    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setIsSubmitting(false);
      window.location.href = `/acceso?redirectTo=/pedido/carrito`;
      return;
    }

    const payload: CreateOrderRequest = {
      lines: lines.map((l) => ({
        itemId: l.itemId,
        quantity: l.quantity,
        modifiers: l.modifiers,
      })),
      pickupType,
      paymentMethod,
      notes,
      scheduledPickupAt: pickupType === "agendar" ? scheduledPickupAt : undefined,
      discountCodeId: appliedDiscount?.codeId,
      discountAmount: (appliedDiscount?.discountAmount ?? 0) + pointsDiscount,
      pointsRedeemed: redeemPoints ? (userPoints ?? 0) : 0,
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "No pudimos crear tu pedido.");
      }

      const body = (await response.json()) as CreateOrderResponse;

      if (paymentMethod === "card_online") {
        const stripeRes = await fetch("/api/checkout/stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: body.orderId }),
        });
        if (stripeRes.ok) {
          const stripeBody = (await stripeRes.json()) as { url?: string };
          if (stripeBody.url) {
            clearCart();
            window.location.href = stripeBody.url;
            return;
          }
        }
      }

      const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
      saveLocalOrder({
        orderId: body.orderId,
        createdAt: new Date().toISOString(),
        total,
        itemCount,
      });

      clearCart();
      showToast("Pedido creado correctamente.", "success");
      onOrderSuccess?.(body.orderId);
      window.location.href = `/pedido/confirmacion?orderId=${encodeURIComponent(body.orderId)}`;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No pudimos crear tu pedido. Intenta de nuevo.";
      setCheckoutError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {lines.length === 0 ? (
          <li className="text-sm text-cordero-espresso opacity-75">
            Tu carrito está vacío.{" "}
            <Link href="/pedido" className="underline" onClick={onViewMenu}>
              Ver menú
            </Link>
          </li>
        ) : (
          lines.map((line, idx) => (
            <li
              key={`${line.itemId}-${idx}`}
              className="rounded-xl border border-cordero px-3 py-2"
            >
              <p className="text-sm text-cordero-espresso">{line.itemName}</p>
              {line.modifiers.length > 0 ? (
                <p className="mt-0.5 text-xs text-cordero-espresso opacity-60">
                  {line.modifiers.map((m) => m.selectedOption).join(", ")}
                </p>
              ) : null}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, line.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-cordero text-sm"
                    aria-label="Quitar uno"
                  >
                    −
                  </button>
                  <span className="min-w-[1.25rem] text-center text-sm">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, line.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-cordero text-sm"
                    aria-label="Agregar uno"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm">
                  {formatPrice(line.unitPrice * line.quantity)}
                </span>
              </div>
            </li>
          ))
        )}
      </ul>

      {lines.length > 0 ? (
        <div className="space-y-3 border-t border-cordero pt-4">
          <div>
            <label className="block text-xs font-medium text-cordero-espresso">
              Retiro
            </label>
            <select
              value={pickupType}
              onChange={(e) => setPickupType(e.target.value as PickupType)}
              className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            >
              <option value="ahora">Ahora</option>
              <option value="agendar">Agendar</option>
              <option value="al_llegar">Al llegar</option>
            </select>
          </div>

          {pickupType === "agendar" ? (
            <div>
              <label className="block text-xs font-medium text-cordero-espresso">
                Fecha y hora de retiro
              </label>
              <input
                type="datetime-local"
                value={scheduledPickupAt}
                onChange={(e) => setScheduledPickupAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
              />
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-medium text-cordero-espresso">
              Pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            >
              <option value="cash">Efectivo</option>
              <option value="card_pending">Tarjeta al retirar</option>
              <option value="card_online">Tarjeta en línea (Stripe)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-cordero-espresso">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sin azúcar, leche de avena, etc."
              rows={3}
              className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
            />
          </div>

          {/* Discount code */}
          <div>
            <label className="block text-xs font-medium text-cordero-espresso">Código de descuento</label>
            {appliedDiscount ? (
              <div className="mt-1 flex items-center justify-between rounded-xl border border-green-300 bg-green-50 px-3 py-2 text-sm">
                <span className="text-green-700">
                  {appliedDiscount.code} — {formatPrice(appliedDiscount.discountAmount)} de descuento
                </span>
                <button
                  type="button"
                  onClick={() => setAppliedDiscount(null)}
                  className="ml-2 text-xs text-green-700 underline"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  placeholder="CODIGO"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  className="flex-1 rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={applyDiscountCode}
                  disabled={validatingCode || !discountCode.trim()}
                  className="rounded-full border border-cordero px-3 py-2 text-xs text-cordero-espresso disabled:opacity-50"
                >
                  {validatingCode ? "..." : "Aplicar"}
                </button>
              </div>
            )}
          </div>

          {/* Points redemption */}
          {userPoints !== null && userPoints > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-cordero px-3 py-2">
              <label className="flex items-center gap-2 text-sm text-cordero-espresso cursor-pointer">
                <input
                  type="checkbox"
                  checked={redeemPoints}
                  onChange={(e) => setRedeemPoints(e.target.checked)}
                />
                Canjear {userPoints} punto{userPoints !== 1 ? "s" : ""} ({formatPrice(Math.min(userPoints, total))} de descuento)
              </label>
            </div>
          )}

          <div className="flex items-center justify-between text-sm font-medium text-cordero-espresso">
            <span>Total estimado</span>
            <div className="text-right">
              {(appliedDiscount || redeemPoints) && (
                <span className="mr-2 text-xs line-through opacity-50">{formatPrice(total)}</span>
              )}
              <span>{formatPrice(finalTotal)}</span>
            </div>
          </div>

          {checkoutError ? (
            <p className="text-xs text-cordero-espresso opacity-80">{checkoutError}</p>
          ) : null}

          <button
            type="button"
            onClick={submitOrder}
            disabled={isSubmitting}
            className="w-full rounded-full bg-cordero-espresso px-4 py-2.5 text-sm text-cordero-cream disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Creando pedido..." : "Confirmar pedido"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
