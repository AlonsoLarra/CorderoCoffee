"use client";

import { useEffect } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast-provider";
import type { OrderStatus } from "@/lib/types/domain";

type ToastTone = "success" | "error" | "info";

const STATUS_MESSAGES: Partial<Record<OrderStatus, { message: string; tone: ToastTone }>> = {
  aceptado:   { message: "Tu pedido fue aceptado",              tone: "success" },
  preparando: { message: "Tu pedido está en preparación",       tone: "info"    },
  listo:      { message: "¡Tu pedido está listo para recoger!", tone: "success" },
  entregado:  { message: "Pedido entregado. ¡Que lo disfrutes!", tone: "success" },
  cancelado:  { message: "Tu pedido fue cancelado",             tone: "error"   },
};

export function GlobalOrderNotifier() {
  const { showToast } = useToast();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;

      channel = supabase
        .channel("global-order-notifications")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newStatus = (payload.new as { status?: OrderStatus }).status;
            const oldStatus = (payload.old as { status?: OrderStatus }).status;

            if (!newStatus || newStatus === oldStatus) return;

            const notification = STATUS_MESSAGES[newStatus];
            if (notification) {
              showToast(notification.message, notification.tone);
            }
          },
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [showToast]);

  return null;
}
