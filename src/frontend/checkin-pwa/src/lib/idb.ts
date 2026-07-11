/**
 * idb.ts — IndexedDB helper for Check-in PWA
 *
 * Database  : ticketbox-checkin
 *   v1 → checkin_logs (keyPath: offlineEventId; index 'synced')
 *   v2 → + scanned_tickets (keyPath: ticketId) — local duplicate guard
 *
 * Two stores serve different purposes:
 *   - checkin_logs:    queue of unsynced scans to POST when network returns.
 *                      Keyed by offlineEventId (UUID per scan attempt) so the
 *                      backend can dedupe retries via its unique constraint.
 *   - scanned_tickets: local duplicate guard. One row per ticketId scanned
 *                      on this device in offline mode. Persistent across
 *                      reloads and login sessions until cleared.
 */

import type { OfflineScanRecord } from '@/types/api';

const DB_NAME = 'ticketbox-checkin';
const DB_VERSION = 2;
const STORE_NAME = 'checkin_logs';
const SCANNED_TICKETS_STORE = 'scanned_tickets';

export interface ScannedTicketEntry {
  ticketId: string;
  gateId: string | null;
  scannedAt: string;
  offlineEventId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Open / init DB
// ─────────────────────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      // v1 schema (kept for fresh installs coming from v0)
      if (oldVersion < 1 && !db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'offlineEventId',
        });
        // Index to quickly fetch unsynced records
        store.createIndex('synced', 'synced', { unique: false });
      }

      // v2 schema: scanned_tickets for local duplicate guard
      if (oldVersion < 2 && !db.objectStoreNames.contains(SCANNED_TICKETS_STORE)) {
        db.createObjectStore(SCANNED_TICKETS_STORE, { keyPath: 'ticketId' });
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

// ─────────────────────────────────────────────────────────────────────────────
// Local duplicate guard — scanned_tickets store
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if `ticketId` has been scanned offline on this device before.
 * Used in the offline path of useOfflineCheckin to reject double scans of the
 * same ticket while no network is available.
 *
 * Note: each device maintains its own cache. Backend sync remains the source
 * of truth for cross-device conflicts.
 */
export async function hasTicketBeenScanned(ticketId: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCANNED_TICKETS_STORE, 'readonly');
    const store = tx.objectStore(SCANNED_TICKETS_STORE);
    const req = store.get(ticketId);
    req.onsuccess = () => {
      resolve(!!req.result);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Records that `ticketId` was scanned on this device at `scannedAt` from `gateId`.
 * Should be called only after `hasTicketBeenScanned` returns false.
 */
export async function markTicketScanned(entry: ScannedTicketEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCANNED_TICKETS_STORE, 'readwrite');
    const store = tx.objectStore(SCANNED_TICKETS_STORE);
    store.put(entry);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Remove one entry from the local duplicate guard. Call when the backend has
 * confirmed a REJECTED_CONFLICT for this ticket so future offline scans don't
 * show stale "already scanned" state for tickets that never actually checked in.
 */
export async function clearScannedTicket(ticketId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCANNED_TICKETS_STORE, 'readwrite');
    const store = tx.objectStore(SCANNED_TICKETS_STORE);
    const req = store.delete(ticketId);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Wipe the entire local duplicate guard. Useful on logout or when a staff
 * device is reassigned to a different gate/event.
 */
export async function clearAllScannedTickets(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCANNED_TICKETS_STORE, 'readwrite');
    const store = tx.objectStore(SCANNED_TICKETS_STORE);
    const req = store.clear();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
