"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type Notification = {
  id: string;
  order_id: string | null;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const MAX_NOTIFICATIONS = 50;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  // Fetch initial notifications and subscribe to realtime
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;
      userIdRef.current = userId;

      // Fetch recent notifications
      void supabase
        .from("notifications")
        .select("id,order_id,title,body,is_read,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(MAX_NOTIFICATIONS)
        .then(({ data: rows }) => {
          if (rows) {
            setNotifications(rows as unknown as Notification[]);
          }
        });

      // Subscribe to new notifications via Realtime
      channel = supabase
        .channel("user-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotif = payload.new as unknown as Notification;
            setNotifications((prev) =>
              [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS),
            );
          },
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    const supabase = createSupabaseBrowserClient();
    void supabase
      .from("notifications")
      .update({ is_read: true } as never)
      .eq("id", id);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const userId = userIdRef.current;
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    void supabase
      .from("notifications")
      .update({ is_read: true } as never)
      .eq("user_id", userId)
      .eq("is_read", false);
  }, []);

  const value = useMemo(
    () => ({ notifications, unreadCount, isOpen, setIsOpen, markAsRead, markAllAsRead }),
    [notifications, unreadCount, isOpen, markAsRead, markAllAsRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
