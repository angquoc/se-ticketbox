/**
 * idb.ts — IndexedDB helper for Check-in PWA
 *
 * Database  : ticketbox-checkin  (version 1)
 * ObjectStore: checkin_logs
 *   keyPath : offlineEventId  (uuid per scan)
 *   indexes : synced (boolean) — for querying un-synced records
 */

import type { OfflineScanRecord } from '@/types/api';

const DB_NAME = 'ticketbox-checkin';
const DB_VERSION = 1;
const STORE_NAME = 'checkin_logs';

// ─────────────────────────────────────────────────────────────────────────────
// Open / init DB
// ─────────────────────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'offlineEventId',
        });
        // Index to quickly fetch unsynced records
        store.createIndex('synced', 'synced', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Save a new offline scan log
// ─────────────────────────────────────────────────────────────────────────────

export async function saveCheckinLog(record: OfflineScanRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Get all unsynced records
// ─────────────────────────────────────────────────────────────────────────────

export async function getUnsynced(): Promise<OfflineScanRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result as OfflineScanRecord[];
      resolve(all.filter(r => !r.synced));
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mark a list of records as synced
// ─────────────────────────────────────────────────────────────────────────────

export async function markSynced(offlineEventIds: string[]): Promise<void> {
  if (offlineEventIds.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const id of offlineEventIds) {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result as OfflineScanRecord | undefined;
        if (record) {
          record.synced = true;
          store.put(record);
        }
      };
      getReq.onerror = () => reject(getReq.error);
    }

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Count unsynced records (for badge display)
// ─────────────────────────────────────────────────────────────────────────────

export async function countUnsynced(): Promise<number> {
  const unsynced = await getUnsynced();
  return unsynced.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Clear all synced records (cleanup, call periodically or on logout)
// ─────────────────────────────────────────────────────────────────────────────

export async function clearSynced(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('synced');
    const req = index.openCursor(IDBKeyRange.only(true));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
