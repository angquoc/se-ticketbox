import { readFile } from 'fs/promises';
import path from 'path';
import { parseSvgSeats } from '@/lib/svg-seatmap';

const SVG_CACHE = new Map<string, { seats: ReturnType<typeof parseSvgSeats>; raw: string }>();

function resolvePublicPath(seatMapUrl: string): string {
  const normalized = seatMapUrl.startsWith('/') ? seatMapUrl.slice(1) : seatMapUrl;
  return path.join(process.cwd(), 'public', normalized);
}

export async function loadSeatmapSvgContent(seatMapUrl: string): Promise<string | null> {
  try {
    return await readFile(resolvePublicPath(seatMapUrl), 'utf-8');
  } catch {
    return null;
  }
}

export async function loadParsedSvgSeats(seatMapUrl: string) {
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && SVG_CACHE.has(seatMapUrl)) {
    return SVG_CACHE.get(seatMapUrl)!;
  }

  const raw = await loadSeatmapSvgContent(seatMapUrl);
  if (!raw) return null;

  const parsed = { raw, seats: parseSvgSeats(raw) };
  if (!isDev) {
    SVG_CACHE.set(seatMapUrl, parsed);
  }
  return parsed;
}

export function clearSeatmapSvgCache(): void {
  SVG_CACHE.clear();
}
