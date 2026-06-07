export interface QrPayloadInput {
  id: string;
  concertId: string;
  qrSignature: string | null;
}

/**
 * Builds the signed QR payload string for e-ticket display.
 * Aligns with ADR 8: signed payload for offline verify + online status check.
 */
export function buildQrPayload(ticket: QrPayloadInput): string {
  const signature =
    ticket.qrSignature ?? `mock_signed_payload_${ticket.id}`;

  return JSON.stringify({
    v: 1,
    ticketId: ticket.id,
    concertId: ticket.concertId,
    sig: signature,
  });
}
