// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  accessToken: string;
  user: StoredUser;
}

export interface StoredUser {
  id: string;
  email: string;
  fullName: string;
  role: 'STAFF' | 'ADMIN' | 'CUSTOMER' | 'ORGANIZER';
}

// ─────────────────────────────────────────────────────────────────────────────
// Check-in Online — POST /checkin/verify
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckinVerifyRequest {
  ticketId: string;
  /** raw token extracted from QR payload (NOT the hash) */
  token: string;
  deviceId: string;
  gateId?: string;
}

export interface CheckinVerifyResponse {
  success: boolean;
  ticketId: string;
  concertId?: string;
  ticketTypeName?: string;
  /** Backend returns TicketStatus enum values */
  status: 'CHECKED_IN' | 'ALREADY_CHECKED_IN' | 'INVALID_TICKET' | 'GATE_MISMATCH';
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
  gateId: string;
  scannedAt: string; // ISO 8601
  isOffline: true;
  synced: boolean;
}

export interface SyncCheckinRequest {
  records: Omit<OfflineScanRecord, 'synced'>[];
}

export interface SyncRecordResult {
  offlineEventId: string;
  success: boolean;
  status: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'REJECTED_CONFLICT' | 'INVALID_TICKET' | 'GATE_MISMATCH';
  conflict?: boolean;
  message: string;
}

export interface SyncCheckinResponse {
  total: number;
  success: number;
  failed: number;
  conflicts: number;
  results: SyncRecordResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsed QR payload
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedQrPayload {
  ticketId: string;
  /** raw token (qrTokenHash source) */
  token: string;
  gateId: string;
}
