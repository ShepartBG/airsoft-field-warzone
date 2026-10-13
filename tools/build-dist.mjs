// Събира само файловете, нужни за сайта, в папка dist/ (за качване онлайн).
// Пускане: node tools/build-dist.mjs
import { cp, rm, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const OUT = 'dist';
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const p of ['index.html', 'privacy.html', '_headers', 'css', 'js', 'data', 'assets/img', 'assets/sfx', 'assets/fonts']) await cp(p, path.join(OUT, p), { recursive: true });
// само готовите уеб видеа – без суровите клипове в assets/video/raw
await mkdir(path.join(OUT, 'assets/video'), { recursive: true });
for (const f of await readdir('assets/video')) {
  if (/\.(mp4|webp)$/.test(f)) await cp(path.join('assets/video', f), path.join(OUT, 'assets/video', f));
}

let total = 0, files = 0;
async function walk(d) {
  for (const f of await readdir(d)) {
    const p = path.join(d, f), s = await stat(p);
    if (s.isDirectory()) await walk(p); else { total += s.size; files++; }
  }
}
await walk(OUT);
console.log(`✓ dist/ — ${files} файла, ${(total / 1048576).toFixed(1)} MB`);
