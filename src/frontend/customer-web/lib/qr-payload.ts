/** QR payload format: {ticketId}:{rawToken}:{gateId} */
export function parseGateIdFromQrPayload(qrPayload: string): string | null {
  const parts = qrPayload.split(':');
  if (parts.length < 3) return null;
  const gateId = parts[2]?.trim();
  return gateId || null;
}
