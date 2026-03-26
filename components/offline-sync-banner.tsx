"use client";

import { useEffect, useState } from "react";

import { getQueuedCount, triggerSync } from "@/lib/offline-queue";

export function OfflineSyncBanner() {
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {});

      // Listen for sync results
      navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
        if (event.data?.type === "SYNC_COMPLETE") {
          setSyncing(false);
          const { synced, failed } = event.data as { synced: number; failed: number };
          setSyncResult({ synced, failed });
          void refreshCount();
        }
      });
    }

    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    void refreshCount();
    const interval = setInterval(refreshCount, 30_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  async function refreshCount() {
    try {
      const count = await getQueuedCount();
      setQueuedCount(count);
    } catch {
      // IndexedDB not available
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    triggerSync();
    // Fallback timeout if SW doesn't respond
    setTimeout(() => {
      setSyncing(false);
      void refreshCount();
    }, 15_000);
  }

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 shadow-lg">
        <p className="text-sm font-medium text-yellow-800">Sin conexión</p>
        <p className="text-xs text-yellow-700">Los pedidos se guardarán localmente y se sincronizarán al reconectar.</p>
      </div>
    );
  }

  if (queuedCount === 0 && !syncResult) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-cordero bg-cordero-card px-4 py-3 shadow-lg">
      {syncResult ? (
        <div>
          <p className="text-sm font-medium text-cordero-espresso">
            Sincronización completada: {syncResult.synced} pedido{syncResult.synced !== 1 ? "s" : ""} enviado
            {syncResult.synced !== 1 ? "s" : ""}
            {syncResult.failed > 0 ? `, ${syncResult.failed} fallido${syncResult.failed !== 1 ? "s" : ""}` : ""}
          </p>
          <button
            type="button"
            onClick={() => setSyncResult(null)}
            className="mt-1 text-xs underline text-cordero-espresso opacity-60"
          >
            Cerrar
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-cordero-espresso">
            {queuedCount} pedido{queuedCount !== 1 ? "s" : ""} pendiente{queuedCount !== 1 ? "s" : ""} de sincronizar
          </p>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="rounded-full bg-cordero-espresso px-3 py-1.5 text-xs text-cordero-cream disabled:opacity-50"
          >
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      )}
    </div>
  );
}
