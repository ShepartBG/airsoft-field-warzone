// Компресира клип за фоновото видео в hero.
// Пускане:  npm run video -- "път/до/клип.mp4" [начална_секунда] [продължителност]
// Резултат: assets/video/hero-1280.mp4 (десктоп), hero-720.mp4 (телефон), hero-poster.webp
import ffmpeg from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';

const [input, start = '0', dur = '15'] = process.argv.slice(2);
if (!input) { console.log('Употреба: npm run video -- клип.mp4 [старт_сек] [продълж_сек]'); process.exit(1); }
await mkdir('assets/video', { recursive: true });

const run = (args) => execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const base = ['-ss', start, '-t', dur, '-i', input, '-an', '-c:v', 'libx264', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];

// Видеото е тъмно и замъглено отгоре – затова може да е силно компресирано.
run([...base, '-vf', 'scale=1280:-2,fps=30', '-crf', '28', '-maxrate', '2.2M', '-bufsize', '4M', 'assets/video/hero-1280.mp4']);
run([...base, '-vf', 'scale=720:-2,fps=30', '-crf', '30', '-maxrate', '1M', '-bufsize', '2M', 'assets/video/hero-720.mp4']);
run(['-ss', start, '-i', input, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '70', 'assets/video/hero-poster.webp']);

for (const f of ['hero-1280.mp4', 'hero-720.mp4', 'hero-poster.webp'])
  console.log(`✓ assets/video/${f}  ${((await stat('assets/video/' + f)).size / 1024 / 1024).toFixed(2)} MB`);
console.log(`
Сложете в js/config.js:
  heroVideo: { desktop: 'assets/video/hero-1280.mp4', mobile: 'assets/video/hero-720.mp4', poster: 'assets/video/hero-poster.webp' },`);
