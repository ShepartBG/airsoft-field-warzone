// Локален статичен сървър: npm start  ->  http://localhost:8080
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const PORT = Number(process.env.PORT) || 8080;
const ROOT = path.resolve(process.env.ROOT || '.');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.csv': 'text/csv; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || /node_modules|[\/]\./.test(path.relative(ROOT, file))) throw 0;
    const st = await stat(file);
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range; // нужно за <video> в Safari
    if (range) {
      const [s, e] = range.replace('bytes=', '').split('-');
      const start = Number(s), end = e ? Number(e) : st.size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      return createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Airsoft Field Warzone работи на:\n  ► http://localhost:${PORT}`);
  for (const ifs of Object.values(os.networkInterfaces()))
    for (const i of ifs) if (i.family === 'IPv4' && !i.internal) console.log(`  ► http://${i.address}:${PORT}   (от телефон в същата Wi-Fi мрежа)`);
});
