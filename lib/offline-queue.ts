const DB_NAME = "cordero-offline";
const STORE_NAME = "offline-orders";
const DB_VERSION = 1;

export type QueuedOrder = {
  id?: number;
  payload: Record<string, unknown>;
  queuedAt: string;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

export async function getQueuedCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = (e) => resolve((e.target as IDBRequest<number>).result);
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

export async function getQueuedOrders(): Promise<QueuedOrder[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = (e) => resolve((e.target as IDBRequest<QueuedOrder[]>).result);
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

export async function clearQueuedOrders(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).clear();
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

export function triggerSync(): void {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.active?.postMessage({ type: "SYNC_OFFLINE_ORDERS" });
      })
      .catch(() => {});
  }
}
