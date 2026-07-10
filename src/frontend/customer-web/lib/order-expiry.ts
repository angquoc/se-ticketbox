export function remainingMsUntil(
  iso: string | null,
  serverTimeIso?: string | null,
): number | null {
  if (!iso) return null;

  const expiryTime = new Date(iso).getTime();

  if (serverTimeIso) {
    const serverTime = new Date(serverTimeIso).getTime();
    // Calculate drift: how much the client clock is ahead of the server clock
    const drift = Date.now() - serverTime;
    const correctedNow = Date.now() - drift;
    return Math.max(0, expiryTime - correctedNow);
  }

  const diff = expiryTime - Date.now();
  return Math.max(0, diff);
}

export function formatReservationCountdown(
  expiresAt: string | null,
  serverTime?: string | null,
): string {
  const remaining = remainingMsUntil(expiresAt, serverTime);
  if (remaining === null) return '--:--';
  if (remaining <= 0) return '00:00';

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isReservationExpired(
  expiresAt: string | null,
  serverTime?: string | null,
): boolean {
  const remaining = remainingMsUntil(expiresAt, serverTime);
  if (remaining === null) return false;
  return remaining <= 0;
}
