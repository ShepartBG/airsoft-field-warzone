// Прави уеб версии на клиповете от assets/video/raw:
//  - hero-desktop.mp4 (1280x720) и hero-mobile.mp4 (576x1024) – монтаж без звук за фона
//  - action-*.mp4 (576x1024, със звук) + постери – за секция „Виж ни в действие“
// Пускане: node tools/build-clips.mjs [hero|action]
import ffmpeg from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const RAW = 'assets/video/raw';
const OUT = 'assets/video';
const TMP = path.join(OUT, '_tmp');
await mkdir(TMP, { recursive: true });

// iPhone клиповете са HDR (HLG) – превръщаме ги в нормален SDR, иначе цветовете са бледи
const HDR = 'zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv';
const SDR_FILES = ['1 clip.mp4', 'hit.mp4'];
const tone = (file) => (SDR_FILES.includes(file) ? 'null' : HDR);
// леко „кино“ оцветяване: малко повече контраст и по-приглушени цветове
const GRADE = 'eq=contrast=1.08:saturation=0.9';

const run = (args) => execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });

// [файл, старт, продължителност, вертикално отместване на кадъра за десктоп 0..1]
const MONTAGE = [
  ['IMG_6022.MOV', 0.2, 3.4, 0.45],
  ['IMG_6013.MOV', 0.3, 3.2, 0.5],
  ['IMG_6015.MOV', 15.5, 3.4, 0.72],
  ['IMG_6022.MOV', 8.0, 3.0, 0.3],
  ['IMG_6021.MOV', 33.4, 3.4, 0.5],
  ['IMG_5941.MOV', 7.3, 3.0, 0.55],
  ['IMG_8153.MOV', 0.4, 3.2, 0.5],
];

const ACTION = [
  { id: 'cqb', file: 'IMG_6022.MOV', ss: 0, t: 20, poster: 8.4, title: 'Щурм на руините' },
  { id: 'hall', file: 'IMG_6013.MOV', ss: 0, t: 10.2, poster: 0.9, title: 'Бой в халето' },
  { id: 'mg', file: 'IMG_6015.MOV', ss: 0, t: 15, poster: 6.6, title: 'Картечно гнездо' },
  { id: 'patrol', file: 'IMG_6021.MOV', ss: 21, t: 22, poster: 34, title: 'Отрядът настъпва' },
  { id: 'push', file: 'IMG_5941.MOV', ss: 0, t: 12.5, poster: 8.5, title: 'Пробив през храстите' },
  { id: 'crowd', file: 'IMG_8153.MOV', ss: 0, t: 5.6, poster: 2.5, title: 'Голямата игра' },
];

const x264 = (crf, maxrate) => ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-maxrate', maxrate, '-bufsize', '3M', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
const mb = async (f) => ((await stat(f)).size / 1048576).toFixed(2) + ' MB';

async function hero() {
  for (const variant of ['desktop', 'mobile']) {
    const parts = [];
    for (const [i, [file, ss, t, y]] of MONTAGE.entries()) {
      const out = path.join(TMP, `${variant}-${i}.mp4`);
      const geo = variant === 'desktop'
        ? `scale=1280:-2,${tone(file)},crop=1280:720:0:(ih-720)*${y}`
        : `scale=576:1024,${tone(file)}`;
      run(['-ss', String(ss), '-t', String(t), '-i', path.join(RAW, file), '-an',
        '-vf', `${geo},${GRADE},fps=30,setsar=1,format=yuv420p`, ...x264(18, '20M'), out]);
      parts.push(`file '${path.resolve(out).replace(/\\/g, '/')}'`);
    }
    const list = path.join(TMP, `${variant}.txt`);
    await writeFile(list, parts.join('\n'));
    const dest = path.join(OUT, `hero-${variant}.mp4`);
    run(['-f', 'concat', '-safe', '0', '-i', list, '-an', ...(variant === 'desktop' ? x264(27, '1.6M') : x264(30, '0.8M')), dest]);
    run(['-ss', '7.6', '-i', dest, '-frames:v', '1', '-q:v', '72', path.join(OUT, `hero-${variant}-poster.webp`)]);
    console.log(`✓ hero-${variant}.mp4  ${await mb(dest)}`);
  }
}

async function action() {
  for (const c of ACTION) {
    const src = path.join(RAW, c.file);
    const vf = `scale=576:1024,${tone(c.file)},${GRADE},fps=30,setsar=1,format=yuv420p`;
    const dest = path.join(OUT, `action-${c.id}.mp4`);
    run(['-ss', String(c.ss), '-t', String(c.t), '-i', src, '-map', '0:v:0', '-map', '0:a:0',
      '-vf', vf, ...x264(27, '1.5M'), '-c:a', 'aac', '-b:a', '96k', '-ac', '2',
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', dest]);
    run(['-ss', String(c.poster), '-i', src, '-frames:v', '1', '-vf', vf, '-q:v', '72', path.join(OUT, `action-${c.id}.webp`)]);
    console.log(`✓ action-${c.id}.mp4  ${await mb(dest)}  — ${c.title}`);
  }
}

const what = process.argv[2];
if (!what || what === 'hero') await hero();
if (!what || what === 'action') await action();
await rm(TMP, { recursive: true, force: true });
