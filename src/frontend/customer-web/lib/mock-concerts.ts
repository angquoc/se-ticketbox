import type { Concert, ConcertCardData, TicketTypeSummary } from '@/types/concert';

const MOCK_TICKET_TYPES: TicketTypeSummary[] = [
  {
    id: 'mock-vip',
    name: 'VIP',
    price: 2_500_000,
    totalQty: 200,
    soldQty: 70,
    reservedQty: 15,
    availableQty: 115,
    maxPerUser: 4,
    status: 'ACTIVE',
    saleStartsAt: '2026-01-01T00:00:00.000Z',
    saleEndsAt: null,
  },
  {
    id: 'mock-standard',
    name: 'Standard',
    price: 800_000,
    totalQty: 500,
    soldQty: 180,
    reservedQty: 40,
    availableQty: 280,
    maxPerUser: 6,
    status: 'ACTIVE',
    saleStartsAt: '2026-01-01T00:00:00.000Z',
    saleEndsAt: null,
  },
];

export const MOCK_CONCERTS: ConcertCardData[] = [
  {
    id: 'tgc-vietnam-2026',
    title: 'Tokyo Girls Collection Vietnam 2026',
    venue: 'Thiskyhall Sala, Ho Chi Minh City',
    startsAt: '2026-06-15T19:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },
  {
    id: 'jessica-reflections-2026',
    title: 'Jessica Jung — Reflections Concert Tour',
    venue: 'Phu Tho Indoor Stadium, Ho Chi Minh City',
    startsAt: '2026-04-18T19:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },
];

const MOCK_CONCERT_DETAILS: Record<string, Concert> = {
  'tgc-vietnam-2026': {
    id: 'tgc-vietnam-2026',
    title: 'Tokyo Girls Collection Vietnam 2026',
    slug: 'tgc-vietnam-2026',
    description:
      'Tokyo Girls Collection (TGC) — một trong những lễ hội thời trang và văn hóa nổi tiếng nhất Nhật Bản — chính thức ra mắt tại Việt Nam. Sự kiện quy tụ các nghệ sĩ và biểu tượng văn hóa hàng đầu từ Việt Nam và Nhật Bản.',
    artistBio:
      'W TOKYO và POPS Entertainment hợp tác mang nền tảng văn hóa toàn cầu này đến Đông Nam Á.',
    venue: 'Thiskyhall Sala, Ho Chi Minh City',
    startsAt: '2026-06-15T19:00:00.000Z',
    saleStartsAt: '2026-01-01T00:00:00.000Z',
    saleEndsAt: '2026-06-14T23:59:59.000Z',
    status: 'SALE_OPEN',
    seatMapUrl: '/seatmaps/concerts/tgc-vietnam-2026.svg',
    coverImageUrl: null,
    organizerId: 'mock-organizer',
    organizerName: 'POPS Entertainment',
    ticketTypes: MOCK_TICKET_TYPES,
  },
  'jessica-reflections-2026': {
    id: 'jessica-reflections-2026',
    title: 'Jessica Jung — Reflections Concert Tour',
    slug: 'jessica-reflections-2026',
    description:
      "Jessica Jung, cựu thành viên Girls' Generation, mang Reflections Concert Tour đến TP. Hồ Chí Minh. Buổi diễn trùng sinh nhật của cô, tạo nên khoảnh khắc đặc biệt cho fan.",
    artistBio:
      "Jessica Jung là ca sĩ, diễn viên người Mỹ gốc Hàn, cựu thành viên Girls' Generation (SNSD).",
    venue: 'Phu Tho Indoor Stadium, Ho Chi Minh City',
    startsAt: '2026-04-18T19:00:00.000Z',
    saleStartsAt: '2026-01-01T00:00:00.000Z',
    saleEndsAt: '2026-04-17T23:59:59.000Z',
    status: 'SALE_OPEN',
    seatMapUrl: '/seatmaps/concerts/jessica-reflections-2026.svg',
    coverImageUrl: null,
    organizerId: 'mock-organizer',
    organizerName: 'SM Entertainment Vietnam',
    ticketTypes: MOCK_TICKET_TYPES,
  },
  'demo-concert': {
    id: 'demo-concert',
    title: 'Sơn Tùng M-TP — SKY Tour 2026',
    slug: 'demo-concert',
    description:
      'Đêm nhạc đặc biệt với những bản hit mới nhất và kho tàng ca khúc kinh điển của Sơn Tùng M-TP.',
    artistBio:
      'Sơn Tùng M-TP là ca sĩ, nhạc sĩ hàng đầu Việt Nam, nổi tiếng với phong cách âm nhạc độc đáo và sân khấu hoành tráng.',
    venue: 'Mỹ Đình National Stadium',
    startsAt: '2026-08-15T19:00:00.000Z',
    saleStartsAt: '2026-01-01T00:00:00.000Z',
    saleEndsAt: null,
    status: 'SALE_OPEN',
    seatMapUrl: null,
    coverImageUrl: null,
    organizerId: 'mock-organizer',
    organizerName: 'M-TP Entertainment',
    ticketTypes: MOCK_TICKET_TYPES,
  },
  'concert-001': {
    id: 'concert-001',
    title: 'BlackPink — Born Pink World Tour',
    slug: 'concert-001',
    description:
      'BlackPink mang Born Pink World Tour đến Việt Nam với sân khấu hoành tráng và setlist đầy đủ các hit.',
    artistBio:
      'BlackPink là nhóm nhạc nữ K-pop toàn cầu gồm Jisoo, Jennie, Rosé và Lisa.',
    venue: 'Phú Thọ Indoor Stadium',
    startsAt: '2026-09-22T19:00:00.000Z',
    saleStartsAt: '2026-01-01T00:00:00.000Z',
    saleEndsAt: null,
    status: 'SALE_OPEN',
    seatMapUrl: null,
    coverImageUrl: null,
    organizerId: 'mock-organizer',
    organizerName: 'YG Entertainment',
    ticketTypes: MOCK_TICKET_TYPES,
  },
};

export function getMockConcertById(concertId: string): ConcertCardData | undefined {
  return MOCK_CONCERTS.find((concert) => concert.id === concertId);
}

export function getMockConcertDetail(concertId: string): Concert | undefined {
  return MOCK_CONCERT_DETAILS[concertId];
}

export function getMockConcertName(concertId: string): string {
  return (
    MOCK_CONCERT_DETAILS[concertId]?.title ??
    getMockConcertById(concertId)?.title ??
    `Concert ${concertId}`
  );
}

export function getMockTicketTypes(concertId: string): TicketTypeSummary[] {
  return MOCK_CONCERT_DETAILS[concertId]?.ticketTypes ?? MOCK_TICKET_TYPES;
}
