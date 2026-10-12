// E2E проверки + screenshots (десктоп и телефон). Пускане: npm test
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const PORT = 8091;
const URL = `http://localhost:${PORT}/`;
const OUT = 'screenshots';
await mkdir(OUT, { recursive: true });

const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT }, stdio: 'pipe' });
await new Promise((r) => server.stdout.once('data', r));

const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok, info }); console.log(`${ok ? '✔' : '✘'} ${name}${info ? ' — ' + info : ''}`); };

async function revealAll(page) {
  // скролваме през страницата, за да се задействат анимациите за поява
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 500) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(60); }
  await page.waitForTimeout(900);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(400);
}

async function run(label, ctxOpts, { cpu = 1 } = {}) {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ ...ctxOpts, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/google|gstatic/.test(m.location().url || '')) errors.push(m.text()); });
  page.on('requestfailed', (r) => {
    // видеото се тегли на части – браузърът сам прекъсва първата заявка (ERR_ABORTED), това е нормално
    if (/\.mp4$/.test(r.url()) && /ABORTED/.test(r.failure()?.errorText || '')) return;
    if (!/fonts.g|google.|gstatic|tel:|viber:/.test(r.url())) errors.push('FAILED ' + r.url());
  });
  if (cpu > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }

  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'load' });
  const lcp = await page.evaluate(() => new Promise((res) => {
    new PerformanceObserver((l) => { const e = l.getEntries(); res(Math.round(e[e.length - 1].startTime)); }).observe({ type: 'largest-contentful-paint', buffered: true });
    setTimeout(() => res(-1), 3000);
  }));
  check(`[${label}] зареждане`, true, `load ${Date.now() - t0} ms, LCP ${lcp} ms`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${label}-hero.png` });
  if (label === 'mobile') { await page.evaluate(() => scrollTo(0, 420)); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${label}-range.png` }); await page.evaluate(() => scrollTo(0, 0)); }

  // хоризонтален скрол
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`[${label}] без хоризонтален скрол`, overflow <= 0, `излишък ${overflow}px`);

  // стрелба по мишена
  await page.evaluate(() => { const l = document.getElementById('lane').getBoundingClientRect(); scrollBy(0, l.bottom - innerHeight + 40); });
  await page.waitForTimeout(500);
  const before = await page.textContent('#score');
  const tgt = await page.evaluate(() => {
    const t = [...document.querySelectorAll('.tgt:not(.down)')].map((e) => e.querySelector('use').getBoundingClientRect()).find((r) => r.width > 0 && r.top > 70 && r.bottom < innerHeight - 70);
    return t && { x: t.left + t.width / 2, y: t.top + t.height * 0.47 };
  });
  if (tgt) {
    await page.mouse.click(tgt.x, tgt.y);
    await page.waitForTimeout(120);
    const after = await page.textContent('#score');
    const holes = await page.locator('.tgt .hole').count();
    check(`[${label}] попадение в мишена`, after !== before && holes > 0, `точки ${before} → ${after}`);
    await page.screenshot({ path: `${OUT}/${label}-hit.png` });
  } else check(`[${label}] попадение в мишена`, false, 'няма видима мишена');

  // пропуск -> дупка във фона
  const pt = await page.evaluate(() => {
    const l = document.getElementById('lane').getBoundingClientRect();
    for (let y = l.top + 60; y < Math.min(l.bottom, innerHeight - 80); y += 10)
      for (let x = l.left + 4; x < l.right; x += 12)
        if (document.elementFromPoint(x, y)?.id === 'range') return { x, y };
  });
  await page.mouse.click(pt.x, pt.y);
  check(`[${label}] пропуск оставя дупка`, (await page.locator('.miss-hole').count()) > 0);

  // събития
  await page.locator('#events').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const evCount = await page.locator('#eventsGrid .event-card:not(.skeleton)').count();
  const cd = await page.textContent('[data-cd="d"]');
  check(`[${label}] събития + отброяване`, evCount > 0 && /\d\d/.test(cd), `${evCount} събития, ${cd} дни`);

  // цени никъде
  const priceHit = await page.evaluate(() => /(\d+\s?(лв|лева|€|евро|eur|bgn))|цена:/i.test(document.body.innerText));
  check(`[${label}] няма цени в текста`, !priceHit);

  // модал „Поискай оферта“: телефон / Viber / имейл с готов текст
  await page.locator('#services [data-quote="Сватбен ескорт"]').click();
  await page.waitForTimeout(450);
  check(`[${label}] модал „Поискай оферта“`, await page.locator('#quoteModal[open]').count() === 1);
  const svc = await page.textContent('#quoteModal [data-q-service]');
  check(`[${label}] показва избраната услуга`, svc === 'Сватбен ескорт', svc);
  const vh = decodeURIComponent(await page.getAttribute('#quoteModal [data-q-viber]', 'href'));
  const mh = decodeURIComponent(await page.getAttribute('#quoteModal [data-q-mail]', 'href'));
  const th = await page.getAttribute('#quoteModal [data-q-tel]', 'href');
  check(`[${label}] Viber/имейл/телефон с готов текст`, vh.includes('Сватбен ескорт') && mh.startsWith('mailto:airsoft.field.warzone@abv.bg') && mh.includes('Запитване: Сватбен ескорт') && th === 'tel:+359897047668', mh.slice(0, 70));
  await page.screenshot({ path: `${OUT}/${label}-modal.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // видео фон
  const vid = await page.evaluate(() => { const v = document.querySelector('.hero-media video'); return v ? { t: v.currentTime, src: v.currentSrc.split('/').pop(), on: v.classList.contains('on') } : null; });
  check(`[${label}] фоново видео върви`, !!vid && vid.on && vid.t > 0, vid ? `${vid.src} @ ${vid.t.toFixed(1)}s` : 'няма');

  // звуков файл с изстрела
  const sfx = await page.evaluate(async () => (await fetch('assets/sfx/aeg-shot.wav')).status);
  check(`[${label}] звук на изстрела е достъпен`, sfx === 200);

  // клипове „Виж ни в действие“
  await page.locator('#clipsGrid .clip-facade').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${label}-clips.png` });
  await page.locator('#clipsGrid .clip-facade').first().click();
  await page.waitForTimeout(1500);
  const cv = await page.evaluate(() => { const v = document.querySelector('#clipsGrid video'); return v && { t: v.currentTime, err: v.error && v.error.code }; });
  check(`[${label}] клип се пуска при натискане`, !!cv && !cv.err && cv.t > 0, cv ? `${cv.t.toFixed(1)}s` : 'няма');
  await page.evaluate(() => document.querySelector('#clipsGrid video')?.pause());

  // карта
  await page.locator('#mapLoad').scrollIntoViewIfNeeded();
  await page.locator('#mapLoad').click();
  await page.waitForTimeout(2500);
  check(`[${label}] картата се зарежда`, (await page.locator('#map iframe').count()) === 1);
  await page.locator('#map').screenshot({ path: `${OUT}/${label}-map.png` });

  // лайтбокс
  await page.locator('.g-item').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.locator('.g-item').first().click();
  await page.waitForTimeout(500);
  check(`[${label}] лайтбокс`, await page.locator('#lightbox[open]').count() === 1);
  await page.screenshot({ path: `${OUT}/${label}-lightbox.png` });
  await page.keyboard.press('Escape');

  // FPS при скрол
  await page.evaluate(() => scrollTo(0, 0));
  const fps = await page.evaluate(() => new Promise((res) => {
    let frames = 0; const start = performance.now(); const H = document.body.scrollHeight - innerHeight;
    const step = (now) => {
      frames++;
      const p = (now - start) / 3000;
      scrollTo(0, H * Math.min(1, p));
      if (p < 1) requestAnimationFrame(step); else res(Math.round(frames / ((now - start) / 1000)));
    };
    requestAnimationFrame(step);
  }));
  check(`[${label}] плавност при скрол`, fps >= (cpu > 1 ? 30 : 50), `${fps} fps${cpu > 1 ? ` (CPU ×${cpu})` : ''}`);

  // пълна страница
  await page.evaluate(() => scrollTo(0, 0));
  await revealAll(page);
  await page.screenshot({ path: `${OUT}/${label}-full.png`, fullPage: true });

  check(`[${label}] без JS грешки`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
}

await run('desktop', { viewport: { width: 1440, height: 900 } });
await run('mobile', { ...devices['iPhone 13'], browserName: undefined, defaultBrowserType: undefined }, { cpu: 4 });

// reduced motion: съдържанието трябва да е видимо без анимации
{
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await page.goto(URL);
  await page.locator('#services').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const op = await page.evaluate(() => getComputedStyle(document.querySelector('.dossier')).opacity);
  const motion = await page.evaluate(() => document.documentElement.classList.contains('motion'));
  check('[reduced-motion] без анимации, съдържанието е видимо', op === '1' && !motion, `opacity ${op}`);
  await page.screenshot({ path: `${OUT}/reduced-services.png` });
  await browser.close();
}

server.kill();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} проверки минаха`);
process.exit(failed.length ? 1 : 0);
