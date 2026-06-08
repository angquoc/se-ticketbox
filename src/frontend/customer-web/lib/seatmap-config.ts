import {
  buildFallbackLayout,
  slugPrefixFromName,
  type TicketTypeZoneLayout,
} from '@/lib/seat-layout-helpers';

export interface ZoneLayoutConfig {
  ticketTypeName?: string;
  seatPrefix?: string;
  layout: TicketTypeZoneLayout;
}

export interface ConcertSeatmapConfigFile {
  slug: string;
  title?: string;
  seatMapUrl?: string;
  /** Tham chiếu template trong public/seatmaps/templates/ */
  template?: string;
  /** Ghi đè seatPrefix theo zoneIndex khi dùng template */
  zoneOverrides?: Array<{ zoneIndex: number; seatPrefix: string }>;
  zones?: ZoneLayoutConfig[];
}

export interface SeatmapTemplateFile {
  name: string;
  description?: string;
  seatMapUrl?: string;
  zones: Array<{ seatPrefix?: string; layout: TicketTypeZoneLayout }>;
}

export interface ResolvedSeatmapConfig {
  slug: string;
  title?: string;
  seatMapUrl?: string;
  zonesByTicketTypeName: Map<string, ZoneLayoutConfig>;
  templateZones: ZoneLayoutConfig[];
}

export const DEFAULT_SEATMAP_URL = '/seatmaps/backgrounds/theater-tiered.svg';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function resolveSeatMapUrl(
  backendSeatMapUrl: string | null | undefined,
  config: ResolvedSeatmapConfig | null,
): string {
  return backendSeatMapUrl ?? config?.seatMapUrl ?? DEFAULT_SEATMAP_URL;
}

/**
 * Tìm layout cho một loại vé.
 * Ưu tiên: zone theo tên → template zone theo thứ tự giá (zoneIndex) → fallback tự động.
 */
export function resolveZoneLayout(
  config: ResolvedSeatmapConfig | null,
  ticketTypeName: string,
  zoneIndex: number,
  totalQty: number,
): TicketTypeZoneLayout & { seatPrefix?: string } {
  const normalized = normalizeName(ticketTypeName);

  if (config) {
    const explicit = config.zonesByTicketTypeName.get(normalized);
    if (explicit) {
      return {
        ...explicit.layout,
        seatPrefix: explicit.seatPrefix,
      };
    }

    if (config.templateZones[zoneIndex]) {
      const templateZone = config.templateZones[zoneIndex];
      return {
        ...templateZone.layout,
        seatPrefix: templateZone.seatPrefix ?? slugPrefixFromName(ticketTypeName),
      };
    }
  }

  return buildFallbackLayout(zoneIndex, totalQty);
}
