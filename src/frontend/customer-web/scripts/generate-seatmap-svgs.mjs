import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SEATMAPS_ROOT = path.join(ROOT, 'public', 'seatmaps');
const LAYOUTS_DIR = path.join(SEATMAPS_ROOT, 'configs', '_layouts');
const BACKGROUNDS_DIR = path.join(SEATMAPS_ROOT, 'backgrounds');
const OUTPUT_DIR = path.join(SEATMAPS_ROOT, 'concerts');

const DEFAULT_ZONE_FILL = '#4CAF50';

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseViewBox(svgText) {
  const match = /viewBox="([^"]+)"/i.exec(svgText);
  if (!match) return { width: 800, height: 580 };
  const parts = match[1].trim().split(/\s+/).map(Number);
  if (parts.length === 4) return { width: parts[2], height: parts[3] };
  return { width: 800, height: 580 };
}

function stripSvgWrapper(svgText) {
  const openTagEnd = svgText.indexOf('>');
  const closeTagStart = svgText.lastIndexOf('</svg>');
  if (openTagEnd === -1 || closeTagStart === -1) return svgText;
  return svgText.slice(openTagEnd + 1, closeTagStart).trim();
}

function generateZoneRect(zone) {
  const zoneId = zone.zoneId ?? slugify(zone.ticketTypeName);
  const zoneName = zone.zoneName ?? zone.ticketTypeName;
  const { x, y, width, height, rx = 8 } = zone.rect;

  return `  <rect data-zone="${escapeXml(zoneId)}" data-zone-name="${escapeXml(zoneName)}" data-ticket-type="${escapeXml(zone.ticketTypeName)}" x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${DEFAULT_ZONE_FILL}" stroke="transparent" stroke-width="2" class="zone"/>`;
}

function buildSeatmapSvg(backgroundSvg, zones) {
  const viewBox = parseViewBox(backgroundSvg);
  const background = stripSvgWrapper(backgroundSvg);
  const zoneLayer = zones
    .filter((zone) => zone.ticketTypeName && zone.rect)
    .map(generateZoneRect)
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox.width} ${viewBox.height}" role="img" aria-label="Sơ đồ khu vực ghế">
${background}
<g id="zones" aria-label="Khu vực ghế">
${zoneLayer}
</g>
</svg>
`;
}

const SUMMER_FESTIVAL_BACKGROUND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 580" role="img" aria-label="Summer festival seat map">
  <g id="background" pointer-events="none" aria-hidden="true">
    <rect width="800" height="580" fill="#f8fafc"/>
    <rect x="275" y="20" width="250" height="48" rx="8" fill="#1e293b"/>
    <text x="400" y="50" text-anchor="middle" fill="white" font-size="14" font-weight="600" font-family="system-ui,sans-serif">MAIN STAGE</text>
    <rect x="275" y="115" width="250" height="120" rx="8" fill="#FEF3C7" opacity="0.68" stroke="#F59E0B" stroke-width="1.5"/>
    <text x="293" y="135" fill="#92400e" font-size="12" font-weight="700" font-family="system-ui,sans-serif">PLATINUM PASS</text>
    <rect x="95" y="260" width="290" height="150" rx="8" fill="#FFEDD5" opacity="0.68" stroke="#F97316" stroke-width="1.5"/>
    <text x="113" y="280" fill="#9a3412" font-size="12" font-weight="700" font-family="system-ui,sans-serif">GOLD PASS</text>
    <rect x="415" y="260" width="290" height="150" rx="8" fill="#DBEAFE" opacity="0.68" stroke="#3B82F6" stroke-width="1.5"/>
    <text x="433" y="280" fill="#1d4ed8" font-size="12" font-weight="700" font-family="system-ui,sans-serif">SILVER PASS</text>
    <rect x="130" y="425" width="540" height="120" rx="8" fill="#DCFCE7" opacity="0.68" stroke="#22C55E" stroke-width="1.5"/>
    <text x="148" y="445" fill="#166534" font-size="12" font-weight="700" font-family="system-ui,sans-serif">GENERAL ADMISSION</text>
  </g>
</svg>`;

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const manifest = await readJson(path.join(SEATMAPS_ROOT, 'manifest.json'));
  const theaterBackground = await readFile(
    path.join(BACKGROUNDS_DIR, 'theater-tiered.svg'),
    'utf-8',
  );

  for (const slug of manifest.configs) {
    const layout = await readJson(path.join(LAYOUTS_DIR, `${slug}.json`));
    const zones = layout?.zones ?? [];

    if (zones.length === 0) {
      console.warn(`Skip ${slug}: no zones defined in _layouts`);
      continue;
    }

    const background =
      layout?.background === 'summer-festival'
        ? SUMMER_FESTIVAL_BACKGROUND
        : theaterBackground;

    const svg = buildSeatmapSvg(background, zones);
    const outputPath = path.join(OUTPUT_DIR, `${slug}.svg`);
    await writeFile(outputPath, svg, 'utf-8');
    console.log(`Generated ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
