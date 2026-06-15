export interface ParsedSvgZone {
  zoneId: string;
  zoneName: string;
  ticketTypeName: string;
}

export interface SvgViewBox {
  width: number;
  height: number;
}

const ZONE_ATTR_RE =
  /<(?:rect|path|polygon|g)\b[^>]*\bdata-zone="([^"]+)"[^>]*>/gi;

function readAttr(tag: string, name: string): string | null {
  const quoted = new RegExp(`\\b${name}="([^"]*)"`, 'i').exec(tag);
  if (quoted) return quoted[1];

  const single = new RegExp(`\\b${name}='([^']*)'`, 'i').exec(tag);
  return single?.[1] ?? null;
}

export function parseSvgViewBox(svgText: string): SvgViewBox {
  const match = /viewBox="([^"]+)"/i.exec(svgText);
  if (!match) {
    return { width: 800, height: 580 };
  }

  const parts = match[1].trim().split(/\s+/).map(Number);
  if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
    return { width: parts[2], height: parts[3] };
  }

  return { width: 800, height: 580 };
}

export function parseSvgZones(svgText: string): ParsedSvgZone[] {
  const zones: ParsedSvgZone[] = [];
  const seen = new Set<string>();

  for (const match of svgText.matchAll(ZONE_ATTR_RE)) {
    const tag = match[0];
    const zoneId = match[1]?.trim();
    if (!zoneId || seen.has(zoneId)) continue;

    const ticketTypeName = readAttr(tag, 'data-ticket-type')?.trim();
    if (!ticketTypeName) continue;

    const zoneName = readAttr(tag, 'data-zone-name')?.trim() ?? ticketTypeName;

    seen.add(zoneId);
    zones.push({ zoneId, zoneName, ticketTypeName });
  }

  return zones;
}
