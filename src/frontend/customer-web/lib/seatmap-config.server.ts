import { access, readFile } from 'fs/promises';
import path from 'path';
import {
  defaultSeatMapUrlForSlug,
  type ConcertSeatmapConfigFile,
  type ResolvedSeatmapConfig,
} from '@/lib/seatmap-config';

const CONFIG_CACHE = new Map<string, ResolvedSeatmapConfig | null>();

const SEATMAPS_ROOT = path.join(process.cwd(), 'public', 'seatmaps');

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

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
 * Server-only: resolve seatmap config theo thứ tự:
 * 1. public/seatmaps/configs/{slug}.json
 * 2. public/seatmaps/concerts/{slug}.svg (tự nhận nếu SVG đã được generate)
 * 3. public/seatmaps/configs/_layouts/{slug}.json (title từ layout thiết kế)
 */
export async function loadSeatmapConfig(slug: string): Promise<ResolvedSeatmapConfig | null> {
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && CONFIG_CACHE.has(slug)) {
    return CONFIG_CACHE.get(slug) ?? null;
  }

  const configFilePath = path.join(SEATMAPS_ROOT, 'configs', `${slug}.json`);
  const raw = await readJsonFile<ConcertSeatmapConfigFile>(configFilePath);
  if (raw) {
    const resolved = resolveFromFile(raw);
    if (!isDev) CONFIG_CACHE.set(slug, resolved);
    return resolved;
  }

  const svgPath = path.join(SEATMAPS_ROOT, 'concerts', `${slug}.svg`);
  if (await fileExists(svgPath)) {
    const resolved: ResolvedSeatmapConfig = {
      slug,
      seatMapUrl: defaultSeatMapUrlForSlug(slug),
    };
    if (!isDev) CONFIG_CACHE.set(slug, resolved);
    return resolved;
  }

  const layoutPath = path.join(SEATMAPS_ROOT, 'configs', '_layouts', `${slug}.json`);
  const layout = await readJsonFile<{ title?: string }>(layoutPath);
  if (layout) {
    const resolved: ResolvedSeatmapConfig = {
      slug,
      title: layout.title,
      seatMapUrl: defaultSeatMapUrlForSlug(slug),
    };
    if (!isDev) CONFIG_CACHE.set(slug, resolved);
    return resolved;
  }

  if (!isDev) CONFIG_CACHE.set(slug, null);
  return null;
}

export function clearSeatmapConfigCache(): void {
  CONFIG_CACHE.clear();
}
