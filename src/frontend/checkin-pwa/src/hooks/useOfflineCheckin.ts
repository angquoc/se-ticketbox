'use client';
/**
 * useOfflineCheckin.ts
 *
 * Central hook that manages:
 *  - Online/offline detection
 *  - QR payload parsing & validation
 *  - Online check-in via POST /checkin/verify
 *  - Offline fallback: save to IndexedDB
 *  - Auto-sync when network is restored
 *  - Sync result tracking (conflicts, successes)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ParsedQrPayload, SyncRecordResult } from '@/types/api';
import { verifyTicket, syncOfflineLogs } from '@/services/checkinService';
import {
  saveCheckinLog,
  getUnsynced,
  markSynced,
  countUnsynced,
} from '@/lib/idb';
import { getStoredUser, getStoredGate } from '@/services/authService';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ScanResult {
  id: string;
  gate: string;
  type?: string;
  time?: string;
  status: 'valid' | 'invalid';
  errorMsg?: string;
  isOffline?: boolean;
}

export interface ScanLog {
  id: string;
  time: string;
  type: string;
  status: 'valid' | 'error';
  isOffline?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// QR Payload parser
// Format: {ticketId}:{token}:{gateId}
// ─────────────────────────────────────────────────────────────────────────────

function parseQrPayload(raw: string): ParsedQrPayload | null {
  const parts = raw.trim().split(':');
  if (parts.length < 3) return null;
  const [ticketId, token, ...gateParts] = parts;
  const gateId = gateParts.join(':');
  if (!ticketId || !token || !gateId) return null;
  return { ticketId, token, gateId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stable device ID (persisted in localStorage)
// ─────────────────────────────────────────────────────────────────────────────

function getDeviceId(): string {
  let deviceId = localStorage.getItem('checkin_device_id');
  if (!deviceId) {
    deviceId = `device-${uuidv4()}`;
    localStorage.setItem('checkin_device_id', deviceId);
  }
  return deviceId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useOfflineCheckin() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncRecordResult[]>([]);
  const [logs, setLogs] = useState<ScanLog[]>([]);

  const isSyncingRef = useRef(false);

  // ── Refresh pending count from IndexedDB ────────────────────────────────

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await countUnsynced();
      setPendingSyncCount(count);
    } catch {
      // silently ignore idb errors
    }
  }, []);

  // ── Sync unsynced records to backend ───────────────────────────────────

  const triggerSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const unsynced = await getUnsynced();
      if (unsynced.length === 0) return;

      const response = await syncOfflineLogs({ records: unsynced });
      const syncedIds = response.results
        .filter((r) => r.success || r.status === 'ALREADY_CHECKED_IN')
        .map((r) => r.offlineEventId);

      if (syncedIds.length > 0) {
        await markSynced(syncedIds);
      }

      setSyncResults((prev) => [...response.results, ...prev]);
      await refreshPendingCount();
    } catch {
      // Network error — will retry on next online event
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  // ── Network listeners ───────────────────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    // Set initial state
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load initial pending count
    void refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync, refreshPendingCount]);

  // ── Handle a QR scan ───────────────────────────────────────────────────

  const handleScan = useCallback(
    async (rawQr: string): Promise<ScanResult> => {
      const gate = getStoredGate();
      const deviceId = getDeviceId();
      const user = getStoredUser();
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      const parsed = parseQrPayload(rawQr);

      // ── Invalid QR format ─────────────────────────────────────────────
      if (!parsed) {
        const result: ScanResult = {
          id: rawQr.slice(0, 16) || 'UNKNOWN',
          gate,
          time: timeStr,
          status: 'invalid',
          errorMsg: 'Mã QR không đúng định dạng',
        };
        addLog({ id: result.id, time: timeStr, type: 'N/A', status: 'error' });
        return result;
      }

      // ── ONLINE path ───────────────────────────────────────────────────
      if (isOnline) {
        try {
          const res = await verifyTicket({
            ticketId: parsed.ticketId,
            token: parsed.token,
            deviceId,
            gateId: gate || undefined,
          });

          const scanResult: ScanResult = {
            id: parsed.ticketId,
            gate,
            type: res.ticketTypeName,
            time: timeStr,
            status: res.success ? 'valid' : 'invalid',
            errorMsg: res.success ? undefined : res.message,
            isOffline: false,
          };

          addLog({
            id: parsed.ticketId,
            time: timeStr,
            type: res.ticketTypeName ?? 'General Admission',
            status: res.success ? 'valid' : 'error',
          });

          return scanResult;
        } catch {
          // Network failed mid-request → fall through to offline path
        }
      }

      // ── OFFLINE path ──────────────────────────────────────────────────
      const offlineRecord = {
        offlineEventId: uuidv4(),
        ticketId: parsed.ticketId,
        token: parsed.token,
        deviceId,
        gateId: gate,
        scannedAt: now.toISOString(),
        isOffline: true as const,
        synced: false,
      };

      try {
        await saveCheckinLog(offlineRecord);
        await refreshPendingCount();
      } catch (err) {
        console.error('IDB write failed', err);
      }

      const offlineResult: ScanResult = {
        id: parsed.ticketId,
        gate,
        time: timeStr,
        status: 'valid',
        isOffline: true,
      };

      addLog({
        id: parsed.ticketId,
        time: timeStr,
        type: 'Offline',
        status: 'valid',
        isOffline: true,
      });

      return offlineResult;

      // ── helpers ────────────────────────────────────────────────────────

      function addLog(entry: ScanLog) {
        setLogs((prev) => {
          // Deduplicate: skip if same id+time already at top
          if (prev[0]?.id === entry.id && prev[0]?.time === entry.time) {
            return prev;
          }
          return [entry, ...prev];
        });
      }
    },
    [isOnline, refreshPendingCount]
  );

  // ── Return ─────────────────────────────────────────────────────────────

  return {
    isOnline,
    pendingSyncCount,
    isSyncing,
    syncResults,
    logs,
    handleScan,
    triggerSync,
  };
}
