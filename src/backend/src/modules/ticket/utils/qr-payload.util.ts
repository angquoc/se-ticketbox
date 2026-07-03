export interface QrPayloadInput {
  id: string;
  /** The raw token (crypto.randomUUID()). Must be included in the QR payload. */
  rawToken: string;
  /** Gate identifier assigned at ticket issuance. */
  gateId: string;
}

/**
 * Builds the QR payload string for e-ticket display.
 *
 * Format: {ticketId}:{rawToken}:{gateId}
 * Example:  abc123:xxxx-xxxx-xxxx:GATE-A
 *
 * The QR contains ticketId, rawToken, and gateId. Staff scanners extract all three,
 * hash the token, compare against qrTokenHash in DB, and verify gateId matches
 * the device's assigned gate.
 *
 * Security notes:
 *   - rawToken is never stored in the database (only its SHA-256 hash is)
 *   - No sensitive data is encoded in the QR payload itself
 *   - When gateId changes, qrSignature becomes invalid → new QR must be reissued
 *
 * Aligns with ADR 8: minimal payload, server-side verification via token hash.
 */
export function buildQrPayload(ticket: QrPayloadInput): string {
  return `${ticket.id}:${ticket.rawToken}:${ticket.gateId}`;
}

/**
 * Parses a QR payload string into its components.
 * Returns null if the format is invalid.
 */
export function parseQrPayload(payload: string): {
  ticketId: string;
  rawToken: string;
  gateId: string;
} | null {
  const parts = payload.split(':');
  if (parts.length !== 3) return null;
  const [ticketId, rawToken, gateId] = parts;
  if (!ticketId || !rawToken || !gateId) return null;
  return { ticketId, rawToken, gateId };
}
