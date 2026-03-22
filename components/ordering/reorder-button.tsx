"use client";

type ReorderLine = {
  itemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
};

type ReorderButtonProps = {
  lines: ReorderLine[];
};

const STORAGE_KEY = "cordero.draftCart.v1";

export function ReorderButton({ lines }: ReorderButtonProps) {
  function handleReorder() {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    window.location.href = "/pedido";
  }

  return (
    <button
      className="rounded-full bg-cordero-espresso px-4 py-1.5 text-xs text-cordero-cream"
      onClick={handleReorder}
      type="button"
    >
      Volver a pedir
    </button>
  );
}
