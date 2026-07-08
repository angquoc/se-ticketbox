export function remainingMsUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, diff);
}

export function formatReservationCountdown(expiresAt: string | null): string {
  const remaining = remainingMsUntil(expiresAt);
  if (remaining === null) return '--:--';
  if (remaining <= 0) return '00:00';

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isReservationExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}
