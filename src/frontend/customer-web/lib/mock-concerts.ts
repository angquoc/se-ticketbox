import type { Concert, ConcertCardData, TicketTypeSummary } from '@/types/concert';

const MOCK_TICKET_TYPES_DETAILED: TicketTypeSummary[] = [
  {
    id: 'tt-svip',
    name: 'SVIP',
    price: 5_000_000,
    totalQty: 100,
    soldQty: 45,
    reservedQty: 10,
    availableQty: 45,
    maxPerUser: 2,
    status: 'ACTIVE',
    saleStartsAt: '2026-01-01T00:00:00.000Z',
    saleEndsAt: null,
  },
  {
    id: 'tt-vip',
    name: 'VIP',
    price: 3_000_000,
    totalQty: 200,
    soldQty: 80,
    reservedQty: 15,
    availableQty: 105,
    maxPerUser: 4,
    status: 'ACTIVE',
    saleStartsAt: '2026-01-01T00:00:00.000Z',
    saleEndsAt: null,
  },
  {
    id: 'tt-cat1',
    name: 'CAT1',
    price: 2_000_000,
    totalQty: 300,
    soldQty: 120,
    reservedQty: 20,
    availableQty: 160,
    maxPerUser: 4,
    status: 'ACTIVE',
    saleStartsAt: '2026-01-01T00:00:00.000Z',
    saleEndsAt: null,
  },
  {
    id: 'tt-cat2',
    name: 'CAT2',
    price: 1_500_000,
    totalQty: 400,
    soldQty: 180,
    reservedQty: 25,
    availableQty: 195,
    maxPerUser: 4,
    status: 'ACTIVE',
    saleStartsAt: '2026-01-01T00:00:00.000Z',
    saleEndsAt: null,
  },
  {
    id: 'tt-ga',
    name: 'GA',
    price: 1_000_000,
    totalQty: 1000,
    soldQty: 600,
    reservedQty: 50,
    availableQty: 350,
    maxPerUser: 6,
    status: 'ACTIVE',
    saleStartsAt: '2026-01-01T00:00:00.000Z',
    saleEndsAt: null,
  },
];

const MOCK_TICKET_TYPES_SOLD_OUT: TicketTypeSummary[] = MOCK_TICKET_TYPES_DETAILED.map((tt) => ({
  ...tt,
  soldQty: tt.totalQty,
  availableQty: 0,
  status: 'SOLD_OUT',
}));

export const MOCK_CONCERTS: ConcertCardData[] = [
  // Tab 1: Đang mở bán (SALE_OPEN & Starts in Future)
  {
    id: 'summer-music-festival-2026',
    title: 'SUMMER MUSIC FESTIVAL VIETNAM 2026',
    venue: 'Quảng trường Ba Đình, Hà Nội, Việt Nam',
    startsAt: '2026-09-08T18:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },
  {
    id: 'concert-purchase-momo',
    title: 'Concert Test Purchase MoMo',
    venue: 'Sân vận động Mỹ Đình, Hà Nội',
    startsAt: '2026-11-20T19:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },
  {
    id: 'concert-purchase-vnpay',
    title: 'Concert Test Purchase VNPAY',
    venue: 'Sân vận động Quân khu 7, TP.HCM',
    startsAt: '2026-11-25T19:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },
  {
    id: 'concert-purchase-idempotency',
    title: 'Concert Test Purchase Idempotency',
    venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
    startsAt: '2026-12-05T19:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },
  {
    id: 'concert-checkin-online',
    title: 'Concert Test Checkin Online',
    venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
    startsAt: '2026-10-10T19:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },
  {
    id: 'concert-checkin-gates',
    title: 'Concert Test Checkin Gates',
    venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
    startsAt: '2026-10-12T19:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },
  {
    id: 'concert-admin-csv',
    title: 'Concert Test Admin CSV',
    venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
    startsAt: '2026-12-15T19:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },
  {
    id: 'concert-nft-notif',
    title: 'Concert Test NFT Notif',
    venue: 'Sân khấu Trống Đồng, TP.HCM',
    startsAt: '2026-10-01T19:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },
  {
    id: 'concert-nft-cache',
    title: 'Concert Test NFT Cache',
    venue: 'Sân khấu Trống Đồng, TP.HCM',
    startsAt: '2026-10-05T19:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },
  {
    id: 'concert-nft-concurrency',
    title: 'Concert Test NFT Concurrency',
    venue: 'Sân khấu Trống Đồng, TP.HCM',
    startsAt: '2026-10-08T19:00:00.000Z',
    status: 'SALE_OPEN',
    coverImageUrl: null,
  },

  // Tab 2: Đã bán hết / Đóng bán (SALE_CLOSED)
  {
    id: 'autumn-kpop-wave-2026',
    title: 'AUTUMN K-POP WAVE VIETNAM 2026',
    venue: 'Cung điền kinh Quần Ngựa, Hà Nội, Việt Nam',
    startsAt: '2026-10-15T19:00:00.000Z',
    status: 'SALE_CLOSED',
    coverImageUrl: null,
  },
  {
    id: 'concert-purchase-limits',
    title: 'Concert Test Purchase Limits',
    venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
    startsAt: '2026-12-01T19:00:00.000Z',
    status: 'SALE_CLOSED',
    coverImageUrl: null,
  },

  // Tab 3: Đã diễn ra (COMPLETED / Past StartsAt)
  {
    id: 'tgc-vietnam-2026',
    title: 'TOKYO GIRLS COLLECTION in VIETNAM 2026',
    venue: 'Van Phuc City, Ho Chi Minh City, Vietnam',
    startsAt: '2026-03-29T18:30:00.000Z',
    status: 'COMPLETED',
    coverImageUrl: null,
  },
  {
    id: '2026-kangin-fan-meeting-in-ho-chi-minh',
    title: '2026 KANGIN FAN MEETING TOUR IN HO CHI MINH CITY',
    venue: 'Nhà hát Bến Thành, TP.HCM, Việt Nam',
    startsAt: '2026-01-24T19:00:00.000Z',
    status: 'COMPLETED',
    coverImageUrl: null,
  },
  {
    id: 'jessica-reflections-2026',
    title: "JESSICA'S REFLECTIONS CONCERT TOUR IN HO CHI MINH CITY 2026",
    venue: 'Sân vận động Tân Bình, TP.HCM, Việt Nam',
    startsAt: '2026-04-18T18:30:00.000Z',
    status: 'COMPLETED',
    coverImageUrl: null,
  },
  {
    id: 'concert-checkin-offline',
    title: 'Concert Test Checkin Offline',
    venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
    startsAt: '2026-05-10T19:00:00.000Z',
    status: 'COMPLETED',
    coverImageUrl: null,
  },
  {
    id: 'concert-nft-cb',
    title: 'Concert Test NFT CB',
    venue: 'Sân khấu Trống Đồng, TP.HCM',
    startsAt: '2026-06-01T19:00:00.000Z',
    status: 'COMPLETED',
    coverImageUrl: null,
  },
];

const createMockDetails = (): Record<string, Concert> => {
  const details: Record<string, Concert> = {};

  for (const c of MOCK_CONCERTS) {
    const isClosed = c.status === 'SALE_CLOSED';
    details[c.id] = {
      id: c.id,
      title: c.title,
      slug: c.id,
      description: `Đêm nhạc đặc biệt "${c.title}" mang lại không khí bùng nổ, quy tụ hệ thống âm thanh ánh sáng đạt chuẩn quốc tế và những màn trình diễn đỉnh cao.`,
      artistBio: 'Quy tụ dàn nghệ sĩ tên tuổi hàng đầu và các ban nhạc biểu diễn trực tiếp đỉnh cao.',
      venue: c.venue,
      startsAt: c.startsAt,
      saleStartsAt: '2026-01-01T00:00:00.000Z',
      saleEndsAt: isClosed ? '2026-06-15T17:00:00.000Z' : '2026-12-30T17:00:00.000Z',
      status: c.status as any,
      seatMapUrl: c.id === 'summer-music-festival-2026'
        ? '/seatmaps/concerts/summer-festival.svg'
        : '/seatmaps/concerts/theater-tiered.svg',
      coverImageUrl: null,
      organizerId: 'mock-organizer',
      organizerName: 'TicketBox Vietnam',
      ticketTypes: isClosed ? MOCK_TICKET_TYPES_SOLD_OUT : MOCK_TICKET_TYPES_DETAILED,
    };
  }

  return details;
};

const MOCK_CONCERT_DETAILS: Record<string, Concert> = createMockDetails();

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
  return MOCK_CONCERT_DETAILS[concertId]?.ticketTypes ?? MOCK_TICKET_TYPES_DETAILED;
}
