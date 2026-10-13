// Военни ефекти:
//  - граната: пада, изскача лостчето, избухва – и под прикритието на взрива
//    страницата прескача до избраната секция
//  - учебен полигон: автомат, който се разглобява и сглобява при скролиране
import { sound } from './sound.js';

// ---------------- ГРАНАТА ----------------
let busy = false;
export function grenadeTo(target, { reduce }) {
  const jump = () => target.scrollIntoView({ behavior: 'instant', block: 'start' });
  const fx = document.getElementById('nadeFx');
  if (reduce || !fx || busy) { jump(); return; }
  busy = true;
  fx.classList.remove('go');
  void fx.offsetWidth;
  fx.classList.add('go');
  setTimeout(() => {
    sound.explosion();
    document.documentElement.classList.add('quake');
  }, 560);
  setTimeout(jump, 640); // скок по време на светкавицата
  setTimeout(() => document.documentElement.classList.remove('quake'), 1000);
  setTimeout(() => { fx.classList.remove('go'); busy = false; }, 1500);
}

// ---------------- РАЗГЛОБЯВАНЕ НА АК ----------------
const STEPS = ['ПЪЛНИТЕЛ', 'ШОМПОЛ', 'КАПАК НА СТВОЛНАТА КУТИЯ', 'ВЪЗВРАТНА ПРУЖИНА', 'ЗАТВОРНА РАМА', 'ЗАТВОР', 'ГАЗОВА ТРЪБА'];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function initAk({ reduce }) {
  const scene = document.getElementById('drill');
  if (!scene) return;
  const svg = scene.querySelector('.ak-svg');
  const parts = [...svg.querySelectorAll('.ak-part')]
    .map((el) => ({ el, i: +el.dataset.part, dx: +el.dataset.dx, dy: +el.dataset.dy, rot: +el.dataset.rot, label: el.dataset.label }))
    .sort((a, b) => a.i - b.i);
  const N = parts.length;
  const labelsG = svg.querySelector('.ak-labels');
  const ui = {
    mode: scene.querySelector('[data-ak-mode]'), timer: scene.querySelector('[data-ak-timer]'),
    step: scene.querySelector('[data-ak-step]'), bar: scene.querySelector('[data-ak-bar]'),
  };

  // етикет до всяка част (центърът се мери веднъж, в сглобено положение)
  const NS = 'http://www.w3.org/2000/svg';
  for (const p of parts) {
    const b = p.el.getBBox();
    p.cx = b.x + b.width / 2; p.cy = b.y + b.height / 2 + 150;
    const t = document.createElementNS(NS, 'text');
    t.textContent = p.label;
    t.setAttribute('text-anchor', 'middle');
    const below = p.dy > 0;
    t.setAttribute('x', p.cx + p.dx);
    t.setAttribute('y', p.cy + p.dy + (below ? b.height / 2 + 26 : -b.height / 2 - 14));
    labelsG.append(t);
    p.text = t;
  }

  function render(progress) {
    // 0–0.46: разглобяване (части една по една), 0.46–0.54: пауза, 0.54–1: сглобяване в обратен ред
    let active = -1, mode;
    for (const p of parts) {
      let t;
      if (progress <= 0.5) t = clamp((progress - 0.04) / 0.42 * N - p.i);
      else t = 1 - clamp((progress - 0.54) / 0.42 * N - (N - 1 - p.i));
      const e = ease(t);
      p.el.setAttribute('transform', `translate(${(p.dx * e).toFixed(1)} ${(p.dy * e).toFixed(1)}) rotate(${(p.rot * e).toFixed(1)} ${p.cx} ${p.cy - 150})`);
      p.text.style.opacity = clamp((t - 0.6) / 0.4).toFixed(2);
      if (t > 0 && t < 1) active = p.i;
    }
    if (progress < 0.04) mode = 'ГОТОВНОСТ';
    else if (progress < 0.46) mode = 'РАЗГЛОБЯВАНЕ';
    else if (progress < 0.54) mode = 'НЕПЪЛНО РАЗГЛОБЕН';
    else if (progress < 0.97) mode = 'СГЛОБЯВАНЕ';
    else mode = 'ГОТОВ ЗА БОЙ';
    ui.mode.textContent = mode;
    ui.mode.dataset.state = progress >= 0.97 ? 'ok' : progress < 0.04 ? '' : 'run';
    // учебен таймер: 0 → 9.8 сек разглобяване, после 0 → 12.4 сек сглобяване
    const secs = progress <= 0.5 ? clamp((progress - 0.04) / 0.42) * 9.8 : clamp((progress - 0.54) / 0.42) * 12.4;
    ui.timer.textContent = `00:${secs.toFixed(2).padStart(5, '0')}`;
    ui.step.textContent = active >= 0 ? `ЕТАП ${active + 1}/${N}: ${STEPS[active]}` : progress < 0.04 ? 'СКРОЛНИ ЗА СТАРТ ↓' : progress >= 0.97 ? '✔ АВТОМАТЪТ Е СГЛОБЕН' : '— ВСИЧКИ ЧАСТИ СА ИЗВАДЕНИ —';
    ui.bar.style.transform = `scaleX(${progress.toFixed(3)})`;
  }

  if (reduce) { scene.classList.add('ak-static'); render(0.5); return; }

  let ticking = false, visible = false;
  const update = () => {
    ticking = false;
    const r = scene.getBoundingClientRect();
    const total = r.height - innerHeight;
    render(clamp(-r.top / (total > 0 ? total : 1)));
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) update(); }).observe(scene);
  addEventListener('scroll', () => { if (visible && !ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  render(0);
}
