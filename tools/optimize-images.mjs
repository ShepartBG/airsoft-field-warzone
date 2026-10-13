// Оптимизира снимките от assets/src -> assets/img (webp, няколко размера).
// Пускане: npm run images
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'assets/src';
const OUT = 'assets/img';
await mkdir(OUT, { recursive: true });

// изходно име -> файл в assets/src
const photos = {
  'group-small': '2.jpg',
  'group-big': '3.jpg',
  'snow': '4.jpg',
  'pistol': '5.jpg',
  'ghillie': '6.jpg',
  'briefing': '7.jpg',
  'escort-action': '8.jpg',
  'wedding-escort': '9.jpg',
  'escort-team': '10.jpg',
  'marshal': '12.jpg',
  'ivy': '13.jpg',
  'banner-crew': '14.jpg',
  'briefing-wide': '15.jpg',
  'operator': '16.jpg',
  'squad-talk': '17.jpg',
  'poster-dostoyniyat': 'poster-dostoyniyat.png',
};
const widths = [640, 1280, 1920];
// Изрязвания: escort-team – без табелата на ресторанта отгоре
const CROPS = { 'escort-team': { left: 0, top: 2350, width: 3811, height: 5717 - 2350 } };

for (const [name, file] of Object.entries(photos)) {
  const crop = CROPS[name];
  let buf = await sharp(path.join(SRC, file)).rotate().toBuffer();
  if (crop) buf = await sharp(buf).extract(crop).toBuffer();
  const meta = await sharp(buf).metadata();
  for (const w of widths) {
    if (w > Math.max(meta.width, meta.height) && w !== widths[0]) continue;
    await sharp(buf)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: w >= 1920 ? 62 : 70 })
      .toFile(path.join(OUT, `${name}-${w}.webp`));
  }
  // картинката за споделяне (og-image.jpg) се прави отделно: node tools/build-og.mjs
  console.log('✓', name);
}

// Лого (прозрачно PNG): пълно за hero/footer, монограм за навигация, фавикон
const LOGO = path.join(SRC, 'logo-new.png');
for (const w of [520, 900]) await sharp(LOGO).resize(w).webp({ quality: 86, alphaQuality: 90 }).toFile(path.join(OUT, `logo-full-${w}.webp`));
const MARK = { left: 110, top: 0, width: 1250, height: 800 };
await sharp(LOGO).extract(MARK).resize(240).webp({ quality: 88, alphaQuality: 90 }).toFile(path.join(OUT, 'logo-mark.webp'));
const square = async (size, bg) => sharp(await sharp(LOGO).extract(MARK).toBuffer())
  .resize(size, size, { fit: 'contain', background: bg }).png();
await (await square(180, '#0a0b08')).toFile(path.join(OUT, 'apple-touch-icon.png'));
await (await square(64, { r: 0, g: 0, b: 0, alpha: 0 })).toFile(path.join(OUT, 'favicon.png'));

// Шумова текстура (малка плочка, повтаря се)
const S = 128;
const buf = Buffer.alloc(S * S * 4);
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let i = 0; i < S * S; i++) {
  const v = Math.floor(rnd() * 255);
  buf[i * 4] = buf[i * 4 + 1] = buf[i * 4 + 2] = v;
  buf[i * 4 + 3] = Math.floor(rnd() * 38);
}
await sharp(buf, { raw: { width: S, height: S, channels: 4 } }).png({ palette: true, colors: 32 }).toFile(path.join(OUT, 'noise.png'));

// Камуфлажна текстура – процедурно генерирани петна (SVG, ~10 KB)
seed = 42;
const colors = ['#1c2214', '#2a3320', '#3a4429', '#11140c'];
const W = 600;
const blob = (cx, cy, r) => {
  const n = 7 + Math.floor(rnd() * 4);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.55 + rnd() * 0.7);
    pts.push([cx + Math.cos(a) * rr * 1.5, cy + Math.sin(a) * rr]);
  }
  // гладка затворена крива (Catmull-Rom -> Bezier)
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
};
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}"><rect width="${W}" height="${W}" fill="${colors[0]}"/>`;
for (const [ci, count, rmin, rmax] of [[1, 26, 30, 70], [2, 22, 20, 50], [3, 18, 12, 34]]) {
  let paths = '';
  for (let i = 0; i < count; i++) {
    const cx = rnd() * W, cy = rnd() * W, r = rmin + rnd() * (rmax - rmin);
    // рисуваме и копия по ръбовете, за да се повтаря безшевно
    for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) {
      if (cx + dx + r * 2 < 0 || cx + dx - r * 2 > W || cy + dy + r * 2 < 0 || cy + dy - r * 2 > W) continue;
      paths += blob(cx + dx, cy + dy, r);
    }
  }
  svg += `<path fill="${colors[ci]}" d="${paths}"/>`;
}
svg += '</svg>';
await writeFile(path.join(OUT, 'camo.svg'), svg);
console.log('✓ logo, noise, camo');
