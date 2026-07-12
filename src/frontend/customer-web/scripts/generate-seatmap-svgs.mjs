import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const SEATMAPS_ROOT = path.join(ROOT, 'public', 'seatmaps');
const BACKGROUNDS_DIR = path.join(SEATMAPS_ROOT, 'backgrounds');
const LAYOUTS_DIR = path.join(SEATMAPS_ROOT, 'configs', '_layouts');
const OUTPUT_DIR = path.join(SEATMAPS_ROOT, 'concerts');

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

function buildSeatmapSvg(backgroundContent, zones) {
  let insertIndex = backgroundContent.indexOf('</svg>');
  if (insertIndex === -1) {
    throw new Error('Không tìm thấy thẻ đóng </svg> trong background');
  }

  let zonesGroup = '\n  <g id="zones" style="cursor: pointer;">\n';
  for (const zone of zones) {
    const r = zone.rect;
    zonesGroup += `    <rect id="${zone.zoneId}" data-zone="${zone.zoneId}" data-ticket-type="${zone.ticketTypeName}" data-status="AVAILABLE" data-selected="false" data-hovered="false" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.rx ?? 0}" />\n`;
  }
  zonesGroup += '  </g>\n';

  return (
    backgroundContent.slice(0, insertIndex) +
    zonesGroup +
    backgroundContent.slice(insertIndex)
  );
}

async function resolveBackground(layout, defaultBg) {
  if (!layout.background) return defaultBg;
  const bgPath = path.join(BACKGROUNDS_DIR, layout.background.endsWith('.svg') ? layout.background : `${layout.background}.svg`);
  if (await fileExists(bgPath)) {
    return readFile(bgPath, 'utf-8');
  }
  return defaultBg;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const files = await readdir(LAYOUTS_DIR);
  const layoutFiles = files.filter(f => f.endsWith('.json'));

  const defaultBackground = await readFile(
    path.join(BACKGROUNDS_DIR, 'theater-tiered.svg'),
    'utf-8',
  );

  console.log('Generating reusable seatmap SVGs...');
  for (const file of layoutFiles) {
    const name = path.basename(file, '.json');
    const layoutPath = path.join(LAYOUTS_DIR, file);
    const layout = await readJson(layoutPath);

    const background = await resolveBackground(layout, defaultBackground);
    const svg = buildSeatmapSvg(background, layout.zones);
    const outputPath = path.join(OUTPUT_DIR, `${name}.svg`);
    await writeFile(outputPath, svg, 'utf-8');

    console.log(`✓ Generated SVG: ${path.relative(ROOT, outputPath)}`);
  }

  // Write manifest
  const manifestPath = path.join(SEATMAPS_ROOT, 'manifest.json');
  const manifest = {
    version: 3,
    description: 'Các sơ đồ phòng vé dùng chung cho các sự kiện',
    layouts: ['theater-tiered', 'summer-festival']
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
  console.log('\nĐồng bộ thành công.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
