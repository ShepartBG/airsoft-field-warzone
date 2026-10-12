// Стрелбище в началната секция: движещи се мишени, точки, дупки от куршуми.
import { sound } from './sound.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const pad = (n) => String(n).padStart(4, '0');

// Зони в координатите на мишената (viewBox 0 0 100 150) – виж #target в index.html
function scoreAt(x, y) {
  if (x >= 35 && x <= 65 && y >= 4 && y <= 35) {
    return (x >= 41 && x <= 59 && y >= 11 && y <= 28) ? { pts: 150, label: 'ХЕДШОТ!', big: true } : { pts: 60, label: 'ГЛАВА' };
  }
  if (x >= 38 && x <= 62 && y >= 52 && y <= 92) return { pts: 100, label: 'ЦЕНТЪР', big: true };
  if (x >= 25 && x <= 75 && y >= 45 && y <= 115) return { pts: 50, label: 'ПОПАДЕНИЕ' };
  return { pts: 20, label: 'ДРАСКОТИНА' };
}

export function initRange({ reduce, mobile }) {
  const hero = document.getElementById('hero');
  const range = document.getElementById('range');
  const lane = document.getElementById('lane');
  if (!hero || !range || !lane) return;
  const $ = (id) => document.getElementById(id);
  const ui = { score: $('score'), hits: $('hits'), acc: $('acc'), best: $('best'), streak: $('streak') };

  let score = 0, shots = 0, hits = 0, streak = 0;
  let best = 0;
  try { best = Number(localStorage.getItem('afw-best')) || 0; } catch {}
  ui.best.textContent = best;

  const N = mobile ? 3 : 4;
  let box = { x: 0, y: 0, w: 0, h: 0 }, hudSpace = 0, baseSize = 100;
  const targets = [];

  function measure() {
    const r = range.getBoundingClientRect(), l = lane.getBoundingClientRect();
    box = { x: l.left - r.left, y: l.top - r.top, w: l.width, h: l.height };
    const hud = lane.querySelector('.hud-score');
    hudSpace = hud ? hud.offsetHeight + (mobile ? 14 : 24) : 0;
    const avail = box.h - hudSpace;
    baseSize = Math.max(56, Math.min(mobile ? 92 : 132, avail * (mobile ? 0.42 : 0.36), box.w / (N * 0.95)));
  }

  function place(t, i) {
    const slotW = box.w / N;
    t.depth = 0.7 + Math.random() * 0.3;
    t.w = baseSize * t.depth;
    t.h = t.w * 1.5;
    t.el.style.width = t.w + 'px';
    t.el.style.zIndex = Math.round(t.depth * 100);
    t.el.style.filter = `brightness(${(0.55 + t.depth * 0.45).toFixed(2)})`;
    t.x0 = box.x + slotW * (i + 0.5) - t.w / 2 + (Math.random() - 0.5) * slotW * 0.3;
    t.amp = reduce ? 0 : Math.max(10, slotW * 0.42);
    t.speed = 0.5 + Math.random() * 0.7;
    t.phase = Math.random() * Math.PI * 2;
    const avail = box.h - hudSpace - t.h - 18;
    // далечните мишени стоят по-високо (перспектива)
    t.y = box.y + hudSpace + Math.max(0, avail) * (0.25 + ((t.depth - 0.7) / 0.3) * 0.75);
    t.x0 = Math.min(Math.max(t.x0, box.x + t.amp), box.x + box.w - t.w - t.amp);
  }

  function make(i) {
    const el = document.createElement('div');
    el.className = 'tgt';
    el.innerHTML = '<div class="tgt-pole"></div><div class="tgt-shadow"></div><div class="tgt-body"><svg viewBox="0 0 100 150"><use href="#target"/><g class="holes"></g></svg></div>';
    range.appendChild(el);
    const t = { el, svg: el.querySelector('svg'), holes: el.querySelector('.holes'), up: true, i, popper: !reduce && (i % 3 === 1), timer: 0 };
    place(t, i);
    t.timer = 1 + Math.random() * 2.5;
    return t;
  }

  measure();
  for (let i = 0; i < N; i++) targets.push(make(i));

  function setDown(t, down) {
    t.up = !down;
    t.el.classList.toggle('down', down);
  }

  function respawn(t) {
    t.holes.replaceChildren();
    place(t, t.i);
    t.el.classList.add('spawn');
    t.el.classList.remove('down');
    position(t, performance.now() / 1000);
    requestAnimationFrame(() => requestAnimationFrame(() => { t.el.classList.remove('spawn'); t.up = true; }));
    t.timer = 2 + Math.random() * 2.5;
  }

  function position(t, s) {
    const x = t.x0 + Math.sin(s * t.speed + t.phase) * t.amp;
    const bob = reduce ? 0 : Math.sin(s * 2.1 + t.phase) * 3;
    t.el.style.transform = `translate3d(${x.toFixed(1)}px, ${(t.y + bob).toFixed(1)}px, 0)`;
  }

  // ---------- цикъл (работи само когато hero е видим) ----------
  let running = false, last = 0, raf = 0;
  function frame(now) {
    const s = now / 1000, dt = Math.min(0.1, s - last);
    last = s;
    for (const t of targets) {
      if (t.hitLock) continue;
      position(t, s);
      if (t.popper) {
        t.timer -= dt;
        if (t.timer <= 0) {
          setDown(t, t.up);
          t.timer = t.up ? 2.2 + Math.random() * 2 : 0.9 + Math.random() * 1.2;
        }
      }
    }
    raf = running ? requestAnimationFrame(frame) : 0;
  }
  function start() { if (running) return; running = true; last = performance.now() / 1000; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  for (const t of targets) position(t, 0);

  let heroVisible = true;
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    heroVisible && !document.hidden ? start() : stop();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden || !heroVisible ? stop() : start()));

  // преизчисляване при промяна на оформлението (шрифтове, завъртане на телефона, resize)
  let rt, lastKey = '';
  const relayout = () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const l = lane.getBoundingClientRect(), r = range.getBoundingClientRect();
      const key = [l.left - r.left, l.top - r.top, l.width, l.height].map(Math.round).join();
      if (key === lastKey) return;
      lastKey = key;
      measure(); targets.forEach(place); targets.forEach((t) => position(t, performance.now() / 1000));
    }, 120);
  };
  new ResizeObserver(relayout).observe(hero);
  new ResizeObserver(relayout).observe(lane);
  document.fonts?.ready.then(relayout);

  // ---------- стрелба ----------
  function fx(cls, x, y, text, life) {
    const d = document.createElement('div');
    d.className = cls;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    if (text) d.textContent = text;
    range.appendChild(d);
    setTimeout(() => d.remove(), life);
    return d;
  }

  function updateHud() {
    ui.score.textContent = pad(score);
    ui.hits.textContent = `${hits}/${shots}`;
    ui.acc.textContent = shots ? Math.round((hits / shots) * 100) + '%' : '—';
    if (score > best) {
      best = score;
      ui.best.textContent = best;
      try { localStorage.setItem('afw-best', best); } catch {}
    }
    ui.streak.textContent = streak >= 3 ? `СЕРИЯ ×${streak >= 6 ? 3 : 2} (${streak})` : '';
  }

  let missHoles = [];
  function fire(cx, cy, node) {
    const r = range.getBoundingClientRect();
    const x = cx - r.left, y = cy - r.top;
    shots++;
    sound.shot();
    if (!reduce) fx('muzzle', x, y, '', 200);

    const tEl = node && node.closest && node.closest('.tgt');
    const t = tEl && targets.find((q) => q.el === tEl);
    if (t && t.up && !t.hitLock) {
      const p = new DOMPoint(cx, cy).matrixTransform(t.svg.getScreenCTM().inverse());
      const z = scoreAt(p.x, p.y);
      streak++;
      hits++;
      const mult = streak >= 6 ? 3 : streak >= 3 ? 2 : 1;
      const gained = z.pts * mult;
      score += gained;
      // дупка от куршум върху самата мишена – движи се с нея
      const ring = document.createElementNS(SVGNS, 'circle');
      ring.setAttribute('class', 'hole-ring'); ring.setAttribute('cx', p.x); ring.setAttribute('cy', p.y); ring.setAttribute('r', 3.4);
      const hole = document.createElementNS(SVGNS, 'circle');
      hole.setAttribute('class', 'hole'); hole.setAttribute('cx', p.x); hole.setAttribute('cy', p.y); hole.setAttribute('r', 2);
      t.holes.append(ring, hole);
      fx('pop' + (z.big ? ' big' : ''), x, y - 10, `+${gained} ${z.label}`, 950);
      sound.hit(z.big);
      t.hitLock = true;
      t.el.classList.add('hit-flash');
      if (z.big && !reduce) { hero.classList.remove('shake'); void hero.offsetWidth; hero.classList.add('shake'); }
      setTimeout(() => { t.el.classList.remove('hit-flash'); setDown(t, true); }, 170);
      setTimeout(() => { t.hitLock = false; respawn(t); }, 1300);
    } else {
      streak = 0;
      const h = fx('miss-hole', x, y, '', 5000);
      missHoles.push(h);
      if (missHoles.length > 14) missHoles.shift().remove();
      missHoles = missHoles.filter((n) => n.isConnected);
    }
    updateHud();
  }

  // Клик = единичен изстрел; задържане = автоматичен огън (18 изстр./сек, като записаната реплика)
  const ROF = 55;
  let auto = 0, delay = 0, aim = null;
  const stopAuto = () => { clearTimeout(delay); clearInterval(auto); delay = auto = 0; };
  range.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    aim = { x: e.clientX, y: e.clientY };
    fire(e.clientX, e.clientY, e.target);
    stopAuto();
    delay = setTimeout(() => {
      auto = setInterval(() => {
        const n = document.elementFromPoint(aim.x, aim.y);
        if (!n || !range.contains(n)) return stopAuto();
        fire(aim.x, aim.y, n);
      }, ROF);
    }, 260);
  });
  range.addEventListener('pointermove', (e) => { if (aim) aim = { x: e.clientX, y: e.clientY }; });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'blur']) (ev === 'blur' ? window : range).addEventListener(ev, () => { aim = null; stopAuto(); });
}
