// Service Worker for CorderoCoffee offline support
const CACHE_NAME = "cordero-v1";
const STATIC_ASSETS = ["/", "/pedido", "/pedido/carrito"];
const OFFLINE_QUEUE_KEY = "offline-orders";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Intercept POST /api/admin/orders/walkin when offline
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method === "POST" &&
    url.pathname === "/api/admin/orders/walkin"
  ) {
    event.respondWith(
      event.request
        .clone()
        .json()
        .then((body) =>
          fetch(event.request).catch(async () => {
            // Offline: queue the order locally
            const db = await openDB();
            await addToQueue(db, body);
            return new Response(
              JSON.stringify({ orderId: null, status: "queued_offline", offline: true }),
              { status: 202, headers: { "Content-Type": "application/json" } },
            );
          }),
        )
        .catch(() => fetch(event.request)),
    );
    return;
  }

  // Cache-first for static pages
  if (event.request.method === "GET" && !url.pathname.startsWith("/api/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
    );
  }
});

// IndexedDB helpers
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("cordero-offline", 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(OFFLINE_QUEUE_KEY, {
        keyPath: "id",
        autoIncrement: true,
      });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function addToQueue(db, payload) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_KEY, "readwrite");
    const req = tx.objectStore(OFFLINE_QUEUE_KEY).add({
      payload,
      queuedAt: new Date().toISOString(),
    });
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

// Listen for sync message from client
self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_OFFLINE_ORDERS") {
    event.waitUntil(syncOfflineOrders(event.source));
  }
});

async function syncOfflineOrders(client) {
  const db = await openDB();
  const items = await getAllQueueItems(db);
  if (items.length === 0) return;

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const res = await fetch("/api/admin/orders/walkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) {
        await deleteQueueItem(db, item.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  client?.postMessage({ type: "SYNC_COMPLETE", synced, failed, remaining: failed });
}

function getAllQueueItems(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_KEY, "readonly");
    const req = tx.objectStore(OFFLINE_QUEUE_KEY).getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function deleteQueueItem(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_KEY, "readwrite");
    const req = tx.objectStore(OFFLINE_QUEUE_KEY).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}
