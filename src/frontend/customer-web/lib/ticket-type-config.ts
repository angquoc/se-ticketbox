/**
 * Cấu hình loại vé theo concert slug — khớp với backend/prisma/seed.ts
 * và blueprint/specs/ticket-type-inventory.md
 */

export interface TicketTypeZoneLayout {
  rows: number;
  cols: number;
  startX: number;
  startY: number;
  colGap: number;
  rowGap: number;
}

export interface TicketTypeConfig {
  /** ID mock dùng khi không có backend (seatmap fallback) */
  mockId: string;
  name: string;
  price: number;
  maxPerUser: number;
  /** Chỉ hiển thị khi status ACTIVE và còn vé (theo public API) */
  active: boolean;
  seatPrefix: string;
  layout: TicketTypeZoneLayout;
}

export interface ConcertTicketConfig {
  slug: string;
  title: string;
  ticketTypes: TicketTypeConfig[];
}

const TGC_LAYOUTS: TicketTypeZoneLayout[] = [
  { rows: 3, cols: 8, startX: 280, startY: 90, colGap: 28, rowGap: 28 },
  { rows: 4, cols: 10, startX: 200, startY: 200, colGap: 26, rowGap: 26 },
  { rows: 5, cols: 12, startX: 120, startY: 330, colGap: 24, rowGap: 24 },
];

export const CONCERT_TICKET_CONFIGS: ConcertTicketConfig[] = [
  {
    slug: 'tgc-vietnam-2026',
    title: 'TOKYO GIRLS COLLECTION in VIETNAM 2026',
    ticketTypes: [
      {
        mockId: 'tgc-vip-1',
        name: 'VIP 1',
        price: 2_200_000,
        maxPerUser: 4,
        active: true,
        seatPrefix: 'VIP',
        layout: TGC_LAYOUTS[0],
      },
      {
        mockId: 'tgc-shibuya-2',
        name: 'SHIBUYA 2',
        price: 790_000,
        maxPerUser: 4,
        active: true,
        seatPrefix: 'SHB',
        layout: TGC_LAYOUTS[1],
      },
      {
        mockId: 'tgc-harajuku-1',
        name: 'HARAJUKU 1',
        price: 550_000,
        maxPerUser: 6,
        active: true,
        seatPrefix: 'HRJ',
        layout: TGC_LAYOUTS[2],
      },
    ],
  },
  {
    slug: '2026-kangin-fan-meeting-in-ho-chi-minh',
    title: '2026 KANGIN FAN MEETING TOUR: STUNNING TOGETHER in HO CHI MINH CITY',
    ticketTypes: [
      {
        mockId: 'kangin-gen-ad',
        name: 'GEN AD',
        price: 1_500_000,
        maxPerUser: 4,
        active: true,
        seatPrefix: 'GEN',
        layout: { rows: 8, cols: 12, startX: 100, startY: 120, colGap: 24, rowGap: 26 },
      },
    ],
  },
  {
    slug: 'jessica-reflections-2026',
    title: "JESSICA'S REFLECTIONS CONCERT TOUR IN HO CHI MINH CITY 2026",
    ticketTypes: [
      {
        mockId: 'jessica-vip',
        name: 'VIP',
        price: 4_250_000,
        maxPerUser: 4,
        active: true,
        seatPrefix: 'VIP',
        layout: { rows: 3, cols: 8, startX: 280, startY: 90, colGap: 28, rowGap: 28 },
      },
      {
        mockId: 'jessica-pre',
        name: 'PRE',
        price: 3_500_000,
        maxPerUser: 4,
        active: true,
        seatPrefix: 'PRE',
        layout: { rows: 4, cols: 10, startX: 200, startY: 200, colGap: 26, rowGap: 26 },
      },
      {
        mockId: 'jessica-cat1',
        name: 'CAT1',
        price: 2_750_000,
        maxPerUser: 6,
        active: true,
        seatPrefix: 'C1',
        layout: { rows: 5, cols: 12, startX: 120, startY: 310, colGap: 24, rowGap: 24 },
      },
      {
        mockId: 'jessica-cat2',
        name: 'CAT2',
        price: 2_250_000,
        maxPerUser: 6,
        active: true,
        seatPrefix: 'C2',
        layout: { rows: 5, cols: 14, startX: 80, startY: 430, colGap: 22, rowGap: 24 },
      },
    ],
  },
];

const configBySlug = new Map(CONCERT_TICKET_CONFIGS.map((c) => [c.slug, c]));

const mockIdToName = new Map<string, string>();
for (const concert of CONCERT_TICKET_CONFIGS) {
  for (const ticketType of concert.ticketTypes) {
    mockIdToName.set(ticketType.mockId, ticketType.name);
  }
}

export function getConcertTicketConfig(slug: string): ConcertTicketConfig | undefined {
  return configBySlug.get(slug);
}

export function getActiveTicketTypes(slug: string): TicketTypeConfig[] {
  return getConcertTicketConfig(slug)?.ticketTypes.filter((t) => t.active) ?? [];
}

/** Tra cứu tên loại vé từ mock ID (dùng khi map sang backend UUID lúc checkout) */
export function resolveTicketTypeName(ticketTypeId: string): string | undefined {
  return mockIdToName.get(ticketTypeId);
}

/** Config mặc định khi không xác định được concert (demo UI) */
export function getDefaultTicketConfig(): ConcertTicketConfig {
  return CONCERT_TICKET_CONFIGS[0];
}
