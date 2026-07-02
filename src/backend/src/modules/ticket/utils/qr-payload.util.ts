export interface QrPayloadInput {
  id: string;
  /** The raw token (crypto.randomUUID()). Must be included in the QR payload. */
  rawToken: string;
}

/**
 * Builds the QR payload string for e-ticket display.
 *
 * Format: {ticketId}:{rawToken}
 *
 * The QR contains ticketId and rawToken. Staff scanners extract ticketId,
 * hash the token, and compare against qrTokenHash in DB.
 * This approach is secure because:
 *   - rawToken is never stored in the database (only its SHA-256 hash is)
 *   - No sensitive data is encoded in the QR payload itself
 *
 * Aligns with ADR 8: minimal payload, server-side verification via token hash.
 */
export function buildQrPayload(ticket: QrPayloadInput): string {
  return `${ticket.id}:${ticket.rawToken}`;
}
