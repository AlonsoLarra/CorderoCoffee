"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type OrderStatusRealtimeProps = {
  orderId: string;
};

export function OrderStatusRealtime({ orderId }: OrderStatusRealtimeProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          if (refreshTimeoutRef.current) {
            return;
          }

          refreshTimeoutRef.current = setTimeout(() => {
            startTransition(() => {
              router.refresh();
            });
            refreshTimeoutRef.current = null;
          }, 250);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_status_log",
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          if (refreshTimeoutRef.current) {
            return;
          }

          refreshTimeoutRef.current = setTimeout(() => {
            startTransition(() => {
              router.refresh();
            });
            refreshTimeoutRef.current = null;
          }, 250);
        },
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [orderId, router, startTransition]);

  return (
    <p className="mt-2 text-xs text-cordero-espresso opacity-70">
      {isPending ? "Actualizando estado..." : "Actualizacion en vivo activada"}
    </p>
  );
}
