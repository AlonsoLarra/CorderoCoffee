// Service Worker for CorderoCoffee offline support
const CACHE_NAME = "cordero-static-v2";
const STATIC_ASSETS = ["/", "/pedido", "/pedido/carrito"];
const OFFLINE_QUEUE_KEY = "offline-orders";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        STATIC_ASSETS.map((asset) => cache.add(new Request(asset, { cache: "reload" }))),
      ).catch(() => {}),
    ),
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

  // Network-first for navigation avoids stale shells after deploy.
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Stale-while-revalidate for same-origin static GET requests.
  if (
    event.request.method === "GET" &&
    url.origin === self.location.origin &&
    !url.pathname.startsWith("/api/") &&
    url.pathname !== "/sw.js"
  ) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return cache.match("/") || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  return networkResponse || Response.error();
}

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
