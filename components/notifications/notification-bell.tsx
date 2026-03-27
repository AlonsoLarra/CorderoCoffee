"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useNotifications } from "./notification-provider";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export function NotificationBell() {
  const { notifications, unreadCount, isOpen, setIsOpen, markAsRead, markAllAsRead } =
    useNotifications();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setIsOpen]);

  const displayNotifications = notifications.slice(0, 20);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-1.5 text-cordero-espresso opacity-70 transition-opacity hover:opacity-100"
        aria-label="Notificaciones"
      >
        {/* Bell SVG icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-cordero bg-cordero-card shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cordero px-4 py-3">
            <h3 className="text-sm font-bold text-cordero-espresso">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] text-cordero-espresso opacity-60 transition-opacity hover:opacity-100"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {displayNotifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-cordero-espresso opacity-50">
                No tienes notificaciones
              </p>
            ) : (
              <ul>
                {displayNotifications.map((notif) => (
                  <li key={notif.id}>
                    <button
                      type="button"
                      onClick={() => {
                        markAsRead(notif.id);
                        if (notif.order_id) {
                          router.push(`/pedido/estado/${notif.order_id}`);
                        }
                        setIsOpen(false);
                      }}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-cordero-cream/50 ${
                        !notif.is_read ? "bg-cordero-cream/30" : ""
                      }`}
                    >
                      {/* Unread dot */}
                      <span className="mt-1.5 flex-shrink-0">
                        <span
                          className={`block h-2 w-2 rounded-full ${
                            notif.is_read ? "bg-transparent" : "bg-red-500"
                          }`}
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-cordero-espresso">
                          {notif.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-cordero-espresso opacity-70">
                          {notif.body}
                        </p>
                        <p className="mt-1 text-[10px] text-cordero-espresso opacity-40">
                          {timeAgo(notif.created_at)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
