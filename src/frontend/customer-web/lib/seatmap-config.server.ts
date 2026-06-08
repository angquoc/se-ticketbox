import { readFile } from 'fs/promises';
import path from 'path';
import type {
  ConcertSeatmapConfigFile,
  ResolvedSeatmapConfig,
  SeatmapTemplateFile,
  ZoneLayoutConfig,
} from '@/lib/seatmap-config';

const CONFIG_CACHE = new Map<string, ResolvedSeatmapConfig | null>();
const TEMPLATE_CACHE = new Map<string, SeatmapTemplateFile>();

const SEATMAPS_ROOT = path.join(process.cwd(), 'public', 'seatmaps');

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function loadTemplate(templateName: string): Promise<SeatmapTemplateFile | null> {
  const isDev = process.env.NODE_ENV === 'development';
  const cached = !isDev ? TEMPLATE_CACHE.get(templateName) : undefined;
  if (cached) return cached;

  const filePath = path.join(SEATMAPS_ROOT, 'templates', `${templateName}.json`);
  const template = await readJsonFile<SeatmapTemplateFile>(filePath);
  if (template && !isDev) {
    TEMPLATE_CACHE.set(templateName, template);
  }
  return template;
}

function applyZoneOverrides(
  zones: ZoneLayoutConfig[],
  overrides?: ConcertSeatmapConfigFile['zoneOverrides'],
): ZoneLayoutConfig[] {
  if (!overrides?.length) return zones;

  return zones.map((zone, index) => {
    const override = overrides.find((item) => item.zoneIndex === index);
    if (!override) return zone;
    return { ...zone, seatPrefix: override.seatPrefix };
  });
}

function resolveFromFile(raw: ConcertSeatmapConfigFile): ResolvedSeatmapConfig {
  const zonesByTicketTypeName = new Map<string, ZoneLayoutConfig>();

  for (const zone of raw.zones ?? []) {
    if (zone.ticketTypeName) {
      zonesByTicketTypeName.set(normalizeName(zone.ticketTypeName), zone);
    }
  }

  return {
    slug: raw.slug,
    title: raw.title,
    seatMapUrl: raw.seatMapUrl,
    zonesByTicketTypeName,
    templateZones: [],
  };
}

async function resolveFromTemplate(
  raw: ConcertSeatmapConfigFile,
): Promise<ResolvedSeatmapConfig | null> {
  if (!raw.template) return null;

  const template = await loadTemplate(raw.template);
  if (!template) return null;

  const templateZones = applyZoneOverrides(
    template.zones.map((zone) => ({
      seatPrefix: zone.seatPrefix,
      layout: zone.layout,
    })),
    raw.zoneOverrides,
  );

  return {
    slug: raw.slug,
    title: raw.title,
    seatMapUrl: raw.seatMapUrl ?? template.seatMapUrl,
    zonesByTicketTypeName: new Map(
      (raw.zones ?? [])
        .filter((zone) => zone.ticketTypeName)
        .map((zone) => [normalizeName(zone.ticketTypeName!), zone]),
    ),
    templateZones,
  };
}

/**
 * Server-only: đọc cấu hình seatmap từ public/seatmaps/configs/{slug}.json
 */
export async function loadSeatmapConfig(slug: string): Promise<ResolvedSeatmapConfig | null> {
  // Skip cache in development for hot reload
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

  let resolved: ResolvedSeatmapConfig;

  if (raw.template && (!raw.zones || raw.zones.length === 0)) {
    const fromTemplate = await resolveFromTemplate(raw);
    if (!fromTemplate) {
      if (!isDev) CONFIG_CACHE.set(slug, null);
      return null;
    }
    resolved = fromTemplate;
  } else if (raw.template) {
    const fromTemplate = await resolveFromTemplate(raw);
    const explicit = resolveFromFile(raw);
    resolved = {
      ...explicit,
      seatMapUrl: explicit.seatMapUrl ?? fromTemplate?.seatMapUrl,
      templateZones: fromTemplate?.templateZones ?? [],
    };
  } else {
    resolved = resolveFromFile(raw);
  }

  if (!isDev) CONFIG_CACHE.set(slug, resolved);
  return resolved;
}

export function clearSeatmapConfigCache(): void {
  CONFIG_CACHE.clear();
  TEMPLATE_CACHE.clear();
}
