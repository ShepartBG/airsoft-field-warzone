// Прави картинката за споделяне (og:image) от tools/og.html -> assets/img/og-image.jpg
// Пускане: node tools/build-og.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import sharp from 'sharp';

const PORT = 8097;
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT }, stdio: 'pipe' });
await new Promise((r) => server.stdout.once('data', r));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto(`http://localhost:${PORT}/tools/og.html`, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
const png = await p.screenshot({ type: 'png' });
await b.close();
server.kill();
await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toFile('assets/img/og-image.jpg');
console.log('✓ assets/img/og-image.jpg');
