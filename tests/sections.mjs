// Screenshots на всяка секция поотделно (за визуален преглед)
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
const PORT = 8093;
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT }, stdio: 'pipe' });
await new Promise((r) => server.stdout.once('data', r));
await mkdir('screenshots/sections', { recursive: true });
const only = process.argv[2];
const ids = ['about', 'events', 'services', 'process', 'safety', 'gallery', 'vouchers', 'faq', 'contact'];
const b = await chromium.launch({ channel: 'msedge' });
for (const [label, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { ...devices['iPhone 13'], defaultBrowserType: undefined }]]) {
  if (only && only !== label) continue;
  const p = await b.newPage(opts);
  await p.goto(`http://localhost:${PORT}/`);
  const h = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 400) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(50); }
  await p.waitForTimeout(1000);
  await p.addStyleTag({ content: '.nav,.mobile-bar,.grain{visibility:hidden!important}' });
  for (const id of ids) await p.locator('#' + id).screenshot({ path: `screenshots/sections/${label}-${id}.png` });
  await p.locator('.footer').screenshot({ path: `screenshots/sections/${label}-footer.png` });
  await p.close();
}
await b.close(); server.kill();
