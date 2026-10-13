// Cloudflare: отдава видеата на части (HTTP Range) – без това Safari на iPhone не ги пуска.
// Включва се само за /assets/video/* (виж wrangler.jsonc), останалото се сервира директно.
export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const range = request.headers.get('Range');
    if (res.status !== 200) return res;
    if (!range) {
      const r = new Response(res.body, res);
      r.headers.set('Accept-Ranges', 'bytes');
      return r;
    }
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    const buf = await res.arrayBuffer();
    const size = buf.byteLength;
    let start, end;
    if (m && m[1] === '' && m[2] !== '') { start = Math.max(0, size - Number(m[2])); end = size - 1; }
    else if (m && m[1] !== '') { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
    if (start === undefined || start >= size || start > end) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    const headers = new Headers(res.headers);
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    headers.set('Accept-Ranges', 'bytes');
    return new Response(buf.slice(start, end + 1), { status: 206, headers });
  },
};
