/**
 * Parses a QR payload string into its components.
 * Format v2: {ticketId}:{rawToken}:{gateId}
 *
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
