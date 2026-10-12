import { CONFIG } from './config.js';
import { sound } from './sound.js';
import { initRange } from './range.js';
import { initEvents } from './events.js';
import { initForms, openQuote } from './form.js';
import { initHeroVideo, initTikTok, initClips, initMap } from './media.js';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
if (!reduce) root.classList.add('motion');
if (!reduce && !mobile) root.classList.add('motion-full');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// ---------- Данни от config.js ----------
const viber = `viber://chat?number=${encodeURIComponent(CONFIG.phone)}`;
$$('[data-tel]').forEach((a) => (a.href = `tel:${CONFIG.phone}`));
$$('[data-viber]').forEach((a) => (a.href = viber));
$$('[data-phone-display]').forEach((n) => (n.textContent = CONFIG.phoneDisplay));
$$('[data-fb]').forEach((a) => (a.href = CONFIG.facebook));
$$('[data-ig]').forEach((a) => (a.href = CONFIG.instagram));
if (CONFIG.tiktokProfile) $$('[data-tt]').forEach((a) => (a.href = CONFIG.tiktokProfile));
else $$('[data-tt]').forEach((a) => (a.hidden = true));
$$('[data-mail]').forEach((a) => (a.href = `mailto:${CONFIG.email}`));
$$('[data-email-text]').forEach((n) => (n.textContent = CONFIG.email));
$$('[data-address]').forEach((n) => (n.textContent = CONFIG.address));
$$('[data-map]').forEach((a) => (a.href = CONFIG.mapUrl));
$('#year').textContent = new Date().getFullYear();

// ---------- Модули ----------
initForms(CONFIG);
initClips(CONFIG);
initTikTok(CONFIG);
initMap(CONFIG);
initHeroVideo(CONFIG, { reduce, mobile });
initRange({ reduce, mobile });

// ---------- Звук ----------
const soundBtn = $('#soundBtn');
function setSound(on) {
  sound.set(on);
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.title = on ? 'Изключи звука' : 'Включи звука';
}
if (sound.restore()) {
  // браузърът позволява аудио едва след взаимодействие
  soundBtn.setAttribute('aria-pressed', 'true');
  addEventListener('pointerdown', () => setSound(true), { once: true, capture: true });
}
soundBtn.addEventListener('click', () => { setSound(!sound.enabled); sound.ui(); });

// ---------- Навигация ----------
const nav = $('#nav'), burger = $('#burger'), links = $('#navLinks');
const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
addEventListener('scroll', onScroll, { passive: true });
onScroll();
function closeMenu() {
  links.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
burger.addEventListener('click', () => {
  const open = !links.classList.contains('open');
  links.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  sound.ui();
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

// глич преход при навигация между секциите
const veil = $('.glitch-veil');
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  closeMenu();
  if (a.getAttribute('href').length > 1 && !reduce) {
    veil.classList.remove('on'); void veil.offsetWidth; veil.classList.add('on');
    sound.ui();
  }
});

// активна връзка в менюто
const navMap = new Map($$('.nav-links a').map((a) => [a.getAttribute('href').slice(1), a]));
const spy = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    navMap.forEach((a) => a.classList.remove('active'));
    navMap.get(e.target.id)?.classList.add('active');
  }
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main > section[id]').forEach((s) => spy.observe(s));

// ---------- Поява на секциите като „мисии“ ----------
function glitch(el) {
  if (reduce || !el) return;
  el.classList.add('is-glitching');
  setTimeout(() => el.classList.remove('is-glitching'), 600);
}
const io = new IntersectionObserver((entries) => {
  let n = 0;
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const el = e.target;
    if (!el.style.getPropertyValue('--rd')) el.style.setProperty('--rd', `${Math.min(n++, 5) * 80}ms`);
    el.classList.add('in');
    if (el.classList.contains('mission-head')) glitch(el.querySelector('h2.glitch'));
    io.unobserve(el);
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
const observe = (el) => io.observe(el);
$$('.reveal, .mission-head').forEach(observe);

initEvents(CONFIG, { openQuote, observe });

// ---------- Паралакс (само десктоп, без reduced-motion) ----------
if (!reduce && !mobile) {
  const items = $$('[data-parallax]').map((el) => ({ el, f: parseFloat(el.dataset.parallax) || 0 }));
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = innerHeight;
    const rects = items.map((it) => it.el.getBoundingClientRect());
    items.forEach((it, i) => {
      const r = rects[i];
      if (r.bottom < -200 || r.top > vh + 200) return;
      const inHero = it.el.closest('.hero');
      const y = inHero ? scrollY * it.f : (r.top + r.height / 2 - vh / 2) * -it.f;
      it.el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

// ---------- HUD: часовник, координати, текст при зареждане ----------
const clock = $('#clock');
const p2 = (n) => String(n).padStart(2, '0');
const tickClock = () => { const d = new Date(); clock.textContent = `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };
tickClock();
setInterval(tickClock, 1000);

if (!mobile) {
  const hero = $('#hero'), gx = $('#gridX'), gy = $('#gridY');
  let pending = null;
  hero.addEventListener('pointermove', (e) => {
    if (pending) { pending = e; return; }
    pending = e;
    requestAnimationFrame(() => {
      const r = hero.getBoundingClientRect();
      gx.textContent = `34T FN ${4400 + Math.round(((pending.clientX - r.left) / r.width) * 99)} ${5200 + Math.round(((pending.clientY - r.top) / r.height) * 99)}`;
      gy.textContent = `${p2(Math.round(180 + (pending.clientX / innerWidth) * 60)).padStart(4, '0')} M`;
      pending = null;
    });
  });
}

const boot = $('.boot-text');
if (!reduce && boot) {
  const full = boot.dataset.text.replace('&gt;', '>');
  boot.textContent = '';
  let i = 0;
  const type = () => { boot.textContent = full.slice(0, ++i); if (i < full.length) setTimeout(type, 28); };
  setTimeout(type, 300);
}

// ---------- Лайтбокс ----------
const lb = $('#lightbox'), lbImg = $('img', lb), lbCap = $('figcaption', lb);
const gItems = $$('.g-item');
let cur = 0;
function show(i) {
  cur = (i + gItems.length) % gItems.length;
  const a = gItems[cur];
  lbImg.src = a.href;
  lbImg.alt = a.querySelector('img').alt;
  lbCap.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(gItems.length).padStart(2, '0')} // ${a.dataset.caption || ''}`;
}
gItems.forEach((a, i) => a.addEventListener('click', (e) => { e.preventDefault(); show(i); lb.showModal(); sound.ui(); }));
$('.lb-prev', lb).addEventListener('click', () => show(cur - 1));
$('.lb-next', lb).addEventListener('click', () => show(cur + 1));
lb.addEventListener('click', (e) => { if (e.target === lb || e.target.closest('[data-close]')) lb.close(); });
lb.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') show(cur - 1);
  if (e.key === 'ArrowRight') show(cur + 1);
});
let sx = null;
lb.addEventListener('pointerdown', (e) => (sx = e.clientX));
lb.addEventListener('pointerup', (e) => {
  if (sx !== null && Math.abs(e.clientX - sx) > 50) show(cur + (e.clientX < sx ? 1 : -1));
  sx = null;
});
