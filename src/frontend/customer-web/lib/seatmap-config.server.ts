import { readFile } from 'fs/promises';
import path from 'path';
import {
  defaultSeatMapUrlForSlug,
  type ConcertSeatmapConfigFile,
  type ResolvedSeatmapConfig,
} from '@/lib/seatmap-config';

const CONFIG_CACHE = new Map<string, ResolvedSeatmapConfig | null>();

const SEATMAPS_ROOT = path.join(process.cwd(), 'public', 'seatmaps');

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function resolveFromFile(raw: ConcertSeatmapConfigFile): ResolvedSeatmapConfig {
  return {
    slug: raw.slug,
    title: raw.title,
    seatMapUrl: raw.seatMapUrl ?? defaultSeatMapUrlForSlug(raw.slug),
  };
}

/**
 * Server-only: đọc cấu hình seatmap từ public/seatmaps/configs/{slug}.json
 */
export async function loadSeatmapConfig(slug: string): Promise<ResolvedSeatmapConfig | null> {
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && CONFIG_CACHE.has(slug)) {
    return CONFIG_CACHE.get(slug) ?? null;
  }

  const filePath = path.join(SEATMAPS_ROOT, 'configs', `${slug}.json`);
  const raw = await readJsonFile<ConcertSeatmapConfigFile>(filePath);
  if (!raw) {
    if (!isDev) CONFIG_CACHE.set(slug, null);
    return null;
  }

  const resolved = resolveFromFile(raw);
  if (!isDev) CONFIG_CACHE.set(slug, resolved);
  return resolved;
}

export function clearSeatmapConfigCache(): void {
  CONFIG_CACHE.clear();
}
