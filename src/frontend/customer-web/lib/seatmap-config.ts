export interface ConcertSeatmapConfigFile {
  slug: string;
  title?: string;
  /** SVG đầy đủ (background + ghế) tại public/seatmaps/concerts/{slug}.svg */
  seatMapUrl?: string;
}

export interface ResolvedSeatmapConfig {
  slug: string;
  title?: string;
  seatMapUrl: string;
}

export const DEFAULT_SEATMAP_URL = '/seatmaps/concerts/summer-music-festival-2026.svg';

export function resolveSeatMapUrl(
  backendSeatMapUrl: string | null | undefined,
  config: ResolvedSeatmapConfig | null,
): string {
  if (config?.seatMapUrl) return config.seatMapUrl;
  if (backendSeatMapUrl) return backendSeatMapUrl;
  return DEFAULT_SEATMAP_URL;
}

export function defaultSeatMapUrlForSlug(slug: string): string {
  return `/seatmaps/concerts/${slug}.svg`;
}
