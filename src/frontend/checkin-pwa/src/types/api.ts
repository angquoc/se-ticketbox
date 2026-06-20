// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  access_token: string;
  user: StoredUser;
}

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: 'STAFF' | 'ADMIN';
}

// ─────────────────────────────────────────────────────────────────────────────
// Check-in Online — POST /checkin/verify
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckinVerifyRequest {
  ticketId: string;
  /** raw token extracted from QR payload (NOT the hash) */
  token: string;
  deviceId: string;
  gate?: string;
}

export interface CheckinVerifyResponse {
  success: boolean;
  ticketId: string;
  concertId?: string;
  ticketTypeName?: string;
  status: 'CHECKED_IN' | 'ALREADY_CHECKED_IN' | 'INVALID_TICKET';
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check-in Offline — IndexedDB record
// ─────────────────────────────────────────────────────────────────────────────

export interface OfflineScanRecord {
  /** UUID generated per scan event — used as IndexedDB key */
  offlineEventId: string;
  ticketId: string;
  /** raw token from QR payload */
  token: string;
  deviceId: string;
  gate: string;
  scannedAt: string; // ISO 8601
  isOffline: true;
  synced: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync offline batch — POST /checkin/sync
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncCheckinRequest {
  records: Omit<OfflineScanRecord, 'synced'>[];
}

export interface SyncRecordResult {
  offlineEventId: string;
  success: boolean;
  status: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'REJECTED_CONFLICT' | 'INVALID_TICKET';
  conflict?: boolean;
  message: string;
}

export interface SyncCheckinResponse {
  results: SyncRecordResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsed QR payload
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedQrPayload {
  ticketId: string;
  /** raw token (qrTokenHash source) */
  token: string;
  timestamp: number;
  signature: string;
}
