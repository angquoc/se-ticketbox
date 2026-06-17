import type { ConcertCardData } from '@/types/concert';

export const MOCK_CONCERTS: ConcertCardData[] = [
  {
    id: 'demo-concert',
    title: 'Sơn Tùng M-TP — SKY Tour 2026',
    venue: 'Mỹ Đình National Stadium',
    startsAt: '2026-08-15T19:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },
  {
    id: 'concert-001',
    title: 'BlackPink — Born Pink World Tour',
    venue: 'Phú Thọ Indoor Stadium',
    startsAt: '2026-09-22T19:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },
];

export function getMockConcertById(concertId: string): ConcertCardData | undefined {
  return MOCK_CONCERTS.find((concert) => concert.id === concertId);
}

export function getMockConcertName(concertId: string): string {
  return getMockConcertById(concertId)?.title ?? `Concert ${concertId}`;
}
