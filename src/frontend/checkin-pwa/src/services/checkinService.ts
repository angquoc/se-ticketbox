import type {
  CheckinVerifyRequest,
  CheckinVerifyResponse,
  SyncCheckinRequest,
  SyncCheckinResponse,
} from '@/types/api';
import { getAccessToken } from './authService';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Online check-in — POST /checkin/verify
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a single QR scan to the backend for verification.
 * Throws on network error. Returns the response body on HTTP 4xx/5xx.
 */
export async function verifyTicket(
  payload: CheckinVerifyRequest
): Promise<CheckinVerifyResponse> {
  const res = await fetch(`${BASE_URL}/checkin/verify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as CheckinVerifyResponse;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline sync — POST /checkin/sync
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a batch of offline scan records to the backend for sync.
 * Throws on network error.
 */
export async function syncOfflineLogs(
  batch: SyncCheckinRequest
): Promise<SyncCheckinResponse> {
  const res = await fetch(`${BASE_URL}/checkin/sync`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(batch),
  });

  if (!res.ok) {
    throw new Error(`Sync thất bại: HTTP ${res.status}`);
  }

  return (await res.json()) as SyncCheckinResponse;
}
