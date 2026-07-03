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

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

const PICKUP_OPTIONS: { value: PickupType; label: string }[] = [
  { value: "ahora", label: "Ahora" },
  { value: "agendar", label: "Agendar" },
  { value: "al_llegar", label: "Al llegar" },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "card_pending", label: "Tarjeta al retirar" },
  { value: "card_online", label: "Tarjeta en línea" },
];

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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (pickupType === "agendar" && !scheduledPickupAt) {
      const msg = "Selecciona fecha y hora para el retiro agendado.";
      setCheckoutError(msg);
      showToast(msg, "error");
      setIsSubmitting(false);
      return;
    }

    // Guest checkout is allowed, but discounts/points require authenticated profile context.
    const resolvedDiscountCodeId = user ? appliedDiscount?.codeId : undefined;
    const resolvedDiscountAmount = user ? (appliedDiscount?.discountAmount ?? 0) : 0;
    const resolvedPointsRedeemed = user && redeemPoints ? (userPoints ?? 0) : 0;

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
      discountCodeId: resolvedDiscountCodeId,
      discountAmount: resolvedDiscountAmount + (user ? pointsDiscount : 0),
      pointsRedeemed: resolvedPointsRedeemed,
    };

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 20_000);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await parseJsonSafe<{ error?: string }>(response);
        throw new Error(body?.error ?? "No pudimos crear tu pedido.");
      }

      const body = await parseJsonSafe<CreateOrderResponse>(response);
      if (!body?.orderId) {
        throw new Error("No recibimos el identificador del pedido.");
      }

      if (paymentMethod === "card_online") {
        const stripeRes = await fetch("/api/checkout/stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: body.orderId }),
        });
        if (stripeRes.ok) {
          const stripeBody = await parseJsonSafe<{ url?: string }>(stripeRes);
          if (stripeBody?.url) {
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
        total: finalTotal,
        itemCount,
      });

      clearCart();
      showToast("Pedido creado correctamente.", "success");
      onOrderSuccess?.(body.orderId);
      window.location.href = `/pedido/confirmacion?orderId=${encodeURIComponent(body.orderId)}`;
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "La creación del pedido tardó demasiado. Intenta de nuevo."
          : error instanceof Error
          ? error.message
          : "No pudimos crear tu pedido. Intenta de nuevo.";
      setCheckoutError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <p className="text-sm text-[hsl(var(--color-espresso)/0.75)]">
        Tu carrito está vacío.{" "}
        <Link href="/pedido" className="underline" onClick={onViewMenu}>
          Ver menú
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Line items */}
      <div className="rounded-[20px] bg-cordero-card px-4 shadow-cordero-card">
        {lines.map((line, idx) => (
          <div
            key={`${line.itemId}-${idx}`}
            className={`py-3.5 ${idx > 0 ? "border-t border-[hsl(var(--color-espresso)/0.08)]" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-cordero-espresso">{line.itemName}</p>
                {line.modifiers.length > 0 ? (
                  <p className="mt-0.5 text-[13px] text-[hsl(var(--color-espresso)/0.6)]">
                    {line.modifiers.map((m) => m.selectedOption).join(", ")}
                  </p>
                ) : null}
              </div>
              <span className="flex-shrink-0 text-[15px] font-semibold text-cordero-espresso">
                {formatPrice(line.unitPrice * line.quantity)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 rounded-full bg-[hsl(var(--color-sand)/0.5)] px-1 py-1 w-fit">
              <button
                type="button"
                onClick={() => updateQuantity(idx, line.quantity - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-cordero-espresso"
                aria-label="Quitar uno"
              >
                −
              </button>
              <span className="min-w-[1.25rem] text-center text-sm text-cordero-espresso">{line.quantity}</span>
              <button
                type="button"
                onClick={() => updateQuantity(idx, line.quantity + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-cordero-espresso"
                aria-label="Agregar uno"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Retiro */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--color-espresso)/0.55)]">
          Retiro
        </p>
        <div className="mt-2 flex rounded-full bg-[hsl(var(--color-sand)/0.6)] p-1">
          {PICKUP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPickupType(opt.value)}
              className={`flex-1 rounded-full py-2 text-[13px] font-semibold transition-colors ${
                pickupType === opt.value
                  ? "bg-cordero-espresso text-cordero-cream"
                  : "text-cordero-espresso"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {pickupType === "agendar" ? (
          <input
            type="datetime-local"
            value={scheduledPickupAt}
            onChange={(e) => setScheduledPickupAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="mt-2 w-full rounded-full border border-[hsl(var(--color-espresso)/0.2)] bg-transparent px-4 py-2.5 text-sm text-cordero-espresso outline-none"
          />
        ) : null}
      </div>

      {/* Pago */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--color-espresso)/0.55)]">
          Pago
        </p>
        <div className="mt-2 space-y-2">
          {PAYMENT_OPTIONS.map((opt) => {
            const isSelected = paymentMethod === opt.value;
            return (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[hsl(var(--color-espresso)/0.1)] bg-cordero-card px-4 py-3"
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => setPaymentMethod(opt.value)}
                  className="sr-only"
                />
                <span
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                    isSelected
                      ? "ring-[6px] ring-inset ring-[hsl(var(--color-espresso))]"
                      : "ring-[1.5px] ring-inset ring-[hsl(var(--color-espresso)/0.35)]"
                  }`}
                />
                <span className="text-sm text-cordero-espresso">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--color-espresso)/0.55)]">
          Notas (opcional)
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Sin azúcar, leche de avena, etc."
          rows={2}
          className="mt-2 w-full rounded-2xl border border-[hsl(var(--color-espresso)/0.2)] bg-transparent px-4 py-2.5 text-sm text-cordero-espresso outline-none"
        />
      </div>

      {/* Discount code */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--color-espresso)/0.55)]">
          Código de descuento
        </p>
        {appliedDiscount ? (
          <div className="mt-2 flex items-center justify-between rounded-full border border-[hsl(var(--color-terracotta)/0.3)] bg-[hsl(var(--color-terracotta)/0.14)] px-4 py-2 text-sm">
            <span className="text-[hsl(var(--color-terracotta-dark))]">
              {appliedDiscount.code} — {formatPrice(appliedDiscount.discountAmount)}
            </span>
            <button
              type="button"
              onClick={() => setAppliedDiscount(null)}
              className="text-xs text-[hsl(var(--color-terracotta-dark))] underline"
            >
              Quitar
            </button>
          </div>
        ) : (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="CÓDIGO"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              className="flex-1 rounded-full border border-[hsl(var(--color-espresso)/0.2)] bg-transparent px-4 py-2 text-sm uppercase tracking-wide text-cordero-espresso outline-none placeholder:text-[hsl(var(--color-espresso)/0.45)] placeholder:tracking-wide"
            />
            <button
              type="button"
              onClick={applyDiscountCode}
              disabled={validatingCode || !discountCode.trim()}
              className="btn-press rounded-full border border-[hsl(var(--color-espresso)/0.25)] px-4 py-2 text-xs font-semibold text-cordero-espresso disabled:opacity-50"
            >
              {validatingCode ? "..." : "Aplicar"}
            </button>
          </div>
        )}
      </div>

      {/* Points redemption */}
      {userPoints !== null && userPoints > 0 && (
        <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-[hsl(var(--color-espresso)/0.1)] bg-cordero-card px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-cordero-espresso">
            <input
              type="checkbox"
              checked={redeemPoints}
              onChange={(e) => setRedeemPoints(e.target.checked)}
            />
            Canjear {userPoints} punto{userPoints !== 1 ? "s" : ""}
          </span>
          <span className="text-sm font-medium text-[hsl(var(--color-terracotta-dark))]">
            −{formatPrice(Math.min(userPoints, total))}
          </span>
        </label>
      )}

      {/* Summary */}
      <div className="space-y-1.5 border-t border-[hsl(var(--color-espresso)/0.12)] pt-4">
        <div className="flex items-center justify-between text-sm text-[hsl(var(--color-espresso)/0.7)]">
          <span>Subtotal</span>
          <span>{formatPrice(total)}</span>
        </div>
        {appliedDiscount ? (
          <div className="flex items-center justify-between text-sm text-[hsl(var(--color-terracotta-dark))]">
            <span>Descuento ({appliedDiscount.code})</span>
            <span>−{formatPrice(appliedDiscount.discountAmount)}</span>
          </div>
        ) : null}
        {redeemPoints && pointsDiscount > 0 ? (
          <div className="flex items-center justify-between text-sm text-[hsl(var(--color-terracotta-dark))]">
            <span>Puntos canjeados</span>
            <span>−{formatPrice(pointsDiscount)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between pt-1 text-[17px] font-semibold text-cordero-espresso">
          <span>Total</span>
          <span>{formatPrice(finalTotal)}</span>
        </div>
      </div>

      {checkoutError ? (
        <p className="text-xs text-[hsl(var(--color-terracotta-dark))]">{checkoutError}</p>
      ) : null}

      <button
        type="button"
        onClick={submitOrder}
        disabled={isSubmitting}
        className="btn-press w-full rounded-full bg-cordero-espresso py-4 text-[15px] font-semibold text-cordero-cream shadow-cordero-cta disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Creando pedido…" : "Confirmar pedido"}
      </button>
    </div>
  );
}
