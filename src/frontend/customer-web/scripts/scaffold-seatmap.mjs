/**
 * Tạo layout seatmap mới từ template có sẵn.
 *
 * Usage:
 *   npm run seatmap:new -- --slug my-concert-2026 --title "MY CONCERT 2026" --from summer-music-festival-2026
 *
 * Sau đó chỉnh zones trong configs/_layouts/{slug}.json rồi chạy npm run seatmap:sync
 */
import { readFile, writeFile, access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const LAYOUTS_DIR = path.join(ROOT, 'public', 'seatmaps', 'configs', '_layouts');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runSync() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'generate-seatmap-svgs.mjs')], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`seatmap:sync exited with code ${code}`));
    });
  });
}

async function main() {
  const { slug, title, from } = parseArgs(process.argv.slice(2));

  if (!slug || !from) {
    console.error('Thiếu tham số bắt buộc.');
    console.error('');
    console.error('Usage:');
    console.error(
      '  npm run seatmap:new -- --slug my-concert-2026 --title "MY CONCERT 2026" --from summer-music-festival-2026',
    );
    console.error('');
    console.error('Template gợi ý:');
    console.error('  - summer-music-festival-2026  (festival 4 zone, background summer-festival)');
    console.error('  - tgc-vietnam-2026            (theater tiered 6 zone)');
    console.error('  - jessica-reflections-2026  (theater tiered)');
    process.exit(1);
  }

  const templatePath = path.join(LAYOUTS_DIR, `${from}.json`);
  const targetPath = path.join(LAYOUTS_DIR, `${slug}.json`);

  if (!(await fileExists(templatePath))) {
    console.error(`Không tìm thấy template layout: ${templatePath}`);
    process.exit(1);
  }

  if (await fileExists(targetPath)) {
    console.error(`Layout đã tồn tại: ${targetPath}`);
    console.error('Xóa file cũ hoặc chọn slug khác.');
    process.exit(1);
  }

  const template = JSON.parse(await readFile(templatePath, 'utf-8'));
  const layout = {
    ...template,
    slug,
    ...(title ? { title } : {}),
  };

  await writeFile(targetPath, `${JSON.stringify(layout, null, 2)}\n`, 'utf-8');
  console.log(`Đã tạo layout: ${path.relative(ROOT, targetPath)}`);
  console.log('');
  console.log('Bước tiếp theo:');
  console.log(`  1. Chỉnh ticketTypeName trong zones cho khớp hạng vé backend`);
  console.log(`  2. npm run seatmap:sync`);
  console.log(`  3. Tạo concert với slug "${slug}" và seatMapUrl "/seatmaps/concerts/${slug}.svg"`);
  console.log('');

  await runSync();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
