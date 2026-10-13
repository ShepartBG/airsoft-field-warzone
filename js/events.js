// Предстоящи събития от Google Таблица (или data/events.csv) + отброяване.
const MONTHS = ['ЯНУ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ЮНИ', 'ЮЛИ', 'АВГ', 'СЕП', 'ОКТ', 'НОЕ', 'ДЕК'];
const FALLBACK_IMGS = ['group-big', 'briefing', 'snow', 'group-small', 'escort-action', 'ghillie'];
const HEADERS = {
  date: ['дата', 'date', 'кога', 'дата и час'],
  title: ['заглавие', 'title', 'име', 'събитие'],
  desc: ['описание', 'description', 'текст', 'детайли'],
  image: ['снимка', 'image', 'картинка', 'photo', 'изображение'],
  link: ['линк', 'link', 'url', 'връзка'],
};

// Приема линк за публикуване (CSV) или обикновен линк за споделяне.
export function sheetCsvUrl(url) {
  url = url.trim();
  if (/\/spreadsheets\/d\/e\//.test(url)) {
    if (/output=csv/.test(url)) return url;
    return url.replace(/\/pub(html)?(\?.*)?$/, '/pub?output=csv').replace(/\/pubhtml.*$/, '/pub?output=csv');
  }
  const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (id) {
    const gid = url.match(/[#&?]gid=(\d+)/);
    return `https://docs.google.com/spreadsheets/d/${id[1]}/gviz/tq?tqx=out:csv${gid ? '&gid=' + gid[1] : ''}`;
  }
  return url;
}

export function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export function parseDate(s) {
  s = String(s || '').trim().replace(/\s*г\.?\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  let y, mo, d, h = null, mi = 0;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) { [, y, mo, d] = m.map(Number); if (m[4]) { h = +m[4]; mi = +m[5]; } }
  else if ((m = s.match(/^(\d{1,2})([./-])(\d{1,2})\2(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/))) {
    let a = +m[1], b = +m[3];
    y = +m[4];
    // ден.месец.година; само ако „месецът“ е > 12, приемаме американски формат (м/д)
    if (b > 12 && a <= 12) { mo = a; d = b; } else { d = a; mo = b; }
    if (m[5]) { h = +m[5]; mi = +m[6]; }
  } else return null;
  const date = new Date(y, mo - 1, d, h ?? 0, mi);
  return isNaN(date) ? null : { date, hasTime: h !== null };
}

function driveImg(url) {
  const id = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
  return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1200` : url;
}

function toEvents(rows) {
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {};
  for (const [k, names] of Object.entries(HEADERS)) idx[k] = head.findIndex((h) => names.includes(h));
  const hasHeader = Object.values(idx).some((i) => i >= 0);
  if (!hasHeader) Object.assign(idx, { date: 0, title: 1, desc: 2, image: 3, link: 4 });
  const body = hasHeader ? rows.slice(1) : rows;
  return body.map((r, n) => {
    const g = (k) => (idx[k] >= 0 ? (r[idx[k]] || '').trim() : '');
    const pd = parseDate(g('date'));
    if (!pd || !g('title')) return null;
    let img = g('image');
    img = img ? driveImg(img) : `assets/img/${FALLBACK_IMGS[n % FALLBACK_IMGS.length]}-640.webp`;
    const link = g('link');
    return { ...pd, title: g('title'), desc: g('desc'), img, link: /^https?:\/\//.test(link) ? link : '' };
  }).filter(Boolean);
}

const fmt = (o) => new Intl.DateTimeFormat('bg-BG', o);
function longDate(ev) {
  const s = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(ev.date);
  return ev.hasTime ? `${s}, ${fmt({ hour: '2-digit', minute: '2-digit' }).format(ev.date)} ч.` : s;
}

function card(ev) {
  const a = document.createElement('article');
  a.className = 'event-card reveal';
  const days = Math.ceil((ev.date - Date.now()) / 864e5);
  a.innerHTML = `
    <div class="ev-img"><img loading="lazy" decoding="async" alt=""><div class="ev-date"><b></b><span></span></div><span class="ev-tag mono"></span></div>
    <div class="ev-body"><p class="ev-time mono"></p><h3></h3><p class="ev-desc"></p></div>`;
  const img = a.querySelector('img');
  img.src = ev.img;
  img.onerror = () => { img.onerror = null; img.src = 'assets/img/group-big-640.webp'; };
  a.querySelector('.ev-date b').textContent = ev.date.getDate();
  a.querySelector('.ev-date span').textContent = MONTHS[ev.date.getMonth()];
  a.querySelector('.ev-tag').textContent = days <= 0 ? '● ДНЕС' : days <= 7 ? `● СЛЕД ${days} ДН.` : '● ПЛАНИРАНА';
  const wd = fmt({ weekday: 'short' }).format(ev.date).replace('.', '').toUpperCase();
  const dd = fmt({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(ev.date).replace(/s*г.?/, '');
  a.querySelector('.ev-time').textContent = `${wd} ${dd}${ev.hasTime ? ' // ' + fmt({ hour: '2-digit', minute: '2-digit' }).format(ev.date) + ' Ч.' : ''}`;
  a.querySelector('h3').textContent = ev.title;
  a.querySelector('.ev-desc').textContent = ev.desc;
  const body = a.querySelector('.ev-body');
  if (ev.link) {
    const l = document.createElement('a');
    l.className = 'btn btn-sm btn-ghost'; l.href = ev.link; l.target = '_blank'; l.rel = 'noopener';
    l.innerHTML = 'Детайли <svg><use href="#i-arrow"/></svg>';
    body.append(l);
  }
  // записването става през BattleBooking
  const b = document.createElement('a');
  b.className = 'btn btn-sm btn-primary'; b.href = booking; b.target = '_blank'; b.rel = 'noopener';
  b.innerHTML = '<svg><use href="#i-ticket"/></svg> Запиши се';
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap';
  btns.append(b, ...body.querySelectorAll('a.btn'));
  body.append(btns);
  return a;
}

// Събития, описани направо в index.html (data-event) – напр. „Достойният път“.
// Скриват се сами, след като минат.
function htmlEvents() {
  const now = Date.now();
  return [...document.querySelectorAll('[data-event]')].map((el) => {
    const date = new Date(el.dataset.date);
    const end = el.dataset.end ? new Date(el.dataset.end) : new Date(date.getTime() + 6 * 36e5);
    if (end.getTime() < now) { el.remove(); return null; }
    el.querySelector('[data-ics]')?.addEventListener('click', () => downloadIcs(el, date, end));
    return { date, end, hasTime: true, title: el.dataset.title, place: el.dataset.place };
  }).filter(Boolean);
}

function downloadIcs(el, start, end) {
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const esc = (s) => String(s).replace(/[,;\\]/g, (m) => '\\' + m);
  const lead = el.querySelector('.op-lead')?.textContent.trim() || '';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Airsoft Field Warzone//BG', 'BEGIN:VEVENT',
    `UID:${f(start)}-afw@airsoft-field-warzone`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
    `SUMMARY:${esc(el.dataset.title)}`, `LOCATION:${esc(el.dataset.place)}`, `DESCRIPTION:${esc(lead)}`,
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'dostoyniyat-pat.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

let booking = '#';

export async function initEvents(cfg, { observe }) {
  booking = cfg.booking || '#';
  const featured = htmlEvents();
  const grid = document.getElementById('eventsGrid');
  let rows = null;
  if (cfg.eventsSheetUrl) {
    try {
      const r = await fetch(sheetCsvUrl(cfg.eventsSheetUrl), { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const txt = await r.text();
      if (/^\s*</.test(txt)) throw new Error('Таблицата не е публична');
      rows = parseCSV(txt);
    } catch (e) { console.warn('Google Таблица:', e); }
  }
  if (!rows) {
    try { rows = parseCSV(await (await fetch('data/events.csv', { cache: 'no-store' })).text()); } catch { rows = []; }
  }
  const now = Date.now();
  const upcoming = toEvents(rows)
    .filter((e) => e.date.getTime() + (e.hasTime ? 6 : 24) * 36e5 > now)
    .sort((a, b) => a.date - b.date);

  grid.replaceChildren();
  grid.hidden = !upcoming.length;
  upcoming.slice(0, 6).forEach((ev, i) => {
    const c = card(ev);
    c.style.setProperty('--rd', `${i * 90}ms`);
    grid.append(c);
    observe(c);
  });
  const all = [...featured, ...upcoming].sort((a, b) => a.date - b.date);
  startCountdown(all.find((e) => e.date.getTime() > now) || all[0]);
}

function startCountdown(ev) {
  const q = (s) => document.querySelectorAll(s);
  const titles = q('[data-next-title]'), dates = q('[data-next-date]'), compact = q('[data-countdown-compact]');
  const cd = { d: q('[data-cd="d"]'), h: q('[data-cd="h"]'), m: q('[data-cd="m"]'), s: q('[data-cd="s"]') };
  const set = (list, v) => list.forEach((n) => { if (n.textContent !== v) n.textContent = v; });
  if (!ev) {
    set(titles, 'Очаквайте нови заповеди');
    set(compact, 'T- ПРЕДСТОИ');
    return;
  }
  set(titles, ev.title);
  set(dates, longDate(ev).toUpperCase());
  const p = (n) => String(n).padStart(2, '0');
  const tick = () => {
    let diff = Math.max(0, ev.date - Date.now());
    if (diff === 0) {
      set(compact, 'ОПЕРАЦИЯТА ТЕЧЕ');
      ['d', 'h', 'm', 's'].forEach((k) => set(cd[k], '00'));
      return;
    }
    const d = Math.floor(diff / 864e5); diff %= 864e5;
    const h = Math.floor(diff / 36e5); diff %= 36e5;
    const m = Math.floor(diff / 6e4); const s = Math.floor((diff % 6e4) / 1000);
    set(cd.d, p(d)); set(cd.h, p(h)); set(cd.m, p(m)); set(cd.s, p(s));
    set(compact, `T- ${p(d)}д ${p(h)}:${p(m)}:${p(s)}`);
    setTimeout(tick, 1000 - (Date.now() % 1000));
  };
  tick();
}
