"use client";

import { useEffect, useState } from "react";

type Shift = {
  opened_at: string;
  status: "open" | "closed";
};

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeStyle: "short" }).format(new Date(value));
}

export function ShiftStatusChip({ onClick }: { onClick: () => void }) {
  const [shift, setShift] = useState<Shift | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/shifts/active");
        if (!res.ok) return;
        const body = (await res.json()) as { shift: Shift | null };
        if (!cancelled) setShift(body.shift);
      } catch {
        if (!cancelled) setShift(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (shift === undefined) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-press flex items-center gap-2 rounded-full border border-[hsl(var(--color-espresso)/0.16)] bg-cordero-cream px-3.5 py-1.5 text-xs font-medium text-cordero-espresso"
    >
      {shift ? (
        <>
          <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
          Turno abierto · desde {formatTime(shift.opened_at)}
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--color-espresso)/0.3)]" />
          Sin turno abierto
        </>
      )}
    </button>
  );
}
