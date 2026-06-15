import { getMockConcertName } from '@/lib/mock-concerts';

const CACHE_KEY = 'ticketbox:concert-names';

function readCache(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function cacheConcertName(concertId: string, name: string): void {
  if (typeof window === 'undefined') return;
  const cache = readCache();
  cache[concertId] = name;
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function getConcertName(concertId: string): string {
  const cache = readCache();
  return cache[concertId] ?? getMockConcertName(concertId);
}
