import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SEATMAPS_ROOT = path.join(ROOT, 'public', 'seatmaps');
const LAYOUTS_DIR = path.join(SEATMAPS_ROOT, 'configs', '_layouts');
const BACKGROUNDS_DIR = path.join(SEATMAPS_ROOT, 'backgrounds');
const OUTPUT_DIR = path.join(SEATMAPS_ROOT, 'concerts');

const SEAT_SIZE = 20;
const DEFAULT_SEAT_FILL = '#4CAF50';

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function generateSeatRects(zone) {
  const { layout, seatPrefix, ticketTypeName } = zone;
  const lines = [];

  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const row = String.fromCharCode(65 + r);
      const column = c + 1;
      const seatNumber = `${seatPrefix}-${row}${column}`;
      const x = layout.startX + c * layout.colGap;
      const y = layout.startY + r * layout.rowGap;
      lines.push(
        `  <rect data-seat="${escapeXml(seatNumber)}" data-ticket-type="${escapeXml(ticketTypeName)}" data-row="${row}" data-column="${column}" x="${x}" y="${y}" width="${SEAT_SIZE}" height="${SEAT_SIZE}" rx="3" fill="${DEFAULT_SEAT_FILL}" stroke="transparent" stroke-width="0" class="seat"/>`,
      );
    }
  }

  return lines.join('\n');
}

function buildSeatmapSvg(backgroundSvg, zones) {
  const viewBox = parseViewBox(backgroundSvg);
  const background = stripSvgWrapper(backgroundSvg);
  const seatLayer = zones
    .filter((zone) => zone.ticketTypeName && zone.layout)
    .map(generateSeatRects)
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox.width} ${viewBox.height}" role="img" aria-label="Sơ đồ ghế">
${background}
<g id="seats" aria-label="Ghế">
${seatLayer}
</g>
</svg>
`;
}

const SUMMER_FESTIVAL_BACKGROUND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 580" role="img" aria-label="Summer festival seat map">
  <rect width="800" height="580" fill="#f8fafc"/>
  <rect x="275" y="20" width="250" height="48" rx="8" fill="#1e293b"/>
  <text x="400" y="50" text-anchor="middle" fill="white" font-size="14" font-weight="600" font-family="system-ui,sans-serif">MAIN STAGE</text>
  <rect x="260" y="120" width="280" height="90" rx="8" fill="#FEF3C7" opacity="0.68" stroke="#F59E0B" stroke-width="1.5"/>
  <text x="278" y="140" fill="#92400e" font-size="12" font-weight="700" font-family="system-ui,sans-serif">PLATINUM PASS</text>
  <rect x="120" y="260" width="250" height="130" rx="8" fill="#FFEDD5" opacity="0.68" stroke="#F97316" stroke-width="1.5"/>
  <text x="138" y="280" fill="#9a3412" font-size="12" font-weight="700" font-family="system-ui,sans-serif">GOLD PASS</text>
  <rect x="430" y="260" width="250" height="130" rx="8" fill="#DBEAFE" opacity="0.68" stroke="#3B82F6" stroke-width="1.5"/>
  <text x="448" y="280" fill="#1d4ed8" font-size="12" font-weight="700" font-family="system-ui,sans-serif">SILVER PASS</text>
  <rect x="160" y="420" width="480" height="120" rx="8" fill="#DCFCE7" opacity="0.68" stroke="#22C55E" stroke-width="1.5"/>
  <text x="178" y="440" fill="#166534" font-size="12" font-weight="700" font-family="system-ui,sans-serif">GENERAL ADMISSION</text>
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
    const zones = (layout?.zones ?? []).map((zone) => ({
      ticketTypeName: zone.ticketTypeName,
      seatPrefix: zone.seatPrefix,
      layout: zone.layout,
    }));

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
