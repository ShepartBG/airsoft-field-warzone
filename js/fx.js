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

  // phase: 'dis' = разглобяване, 'as' = сглобяване; t: 0..1; secs – реално изминало време
  let lastActive = -1;
  function render(phase, t, secs = 0) {
    let active = -1;
    for (const p of parts) {
      // частите се движат една след друга; при сглобяване – в обратен ред
      const k = phase === 'dis' ? clamp(t * N - p.i) : 1 - clamp(t * N - (N - 1 - p.i));
      const e = ease(k);
      p.el.setAttribute('transform', `translate(${(p.dx * e).toFixed(1)} ${(p.dy * e).toFixed(1)}) rotate(${(p.rot * e).toFixed(1)} ${p.cx} ${p.cy - 150})`);
      p.text.style.opacity = clamp((k - 0.6) / 0.4).toFixed(2);
      if (k > 0 && k < 1) active = p.i;
    }
    if (active !== lastActive && active >= 0) sound.clack();
    lastActive = active;
    const done = t >= 1;
    ui.mode.textContent = phase === 'dis' ? (done ? 'НЕПЪЛНО РАЗГЛОБЕН' : t > 0 ? 'РАЗГЛОБЯВАНЕ' : 'ГОТОВНОСТ') : (done ? 'ГОТОВ ЗА БОЙ' : 'СГЛОБЯВАНЕ');
    ui.mode.dataset.state = phase === 'as' && done ? 'ok' : t > 0 ? 'run' : '';
    ui.timer.textContent = `00:${secs.toFixed(2).padStart(5, '0')}`;
    ui.step.textContent = active >= 0 ? `ЕТАП ${active + 1}/${N}: ${STEPS[active]}`
      : t === 0 ? 'НАТИСНИ БУТОНА ЗА СТАРТ' : phase === 'dis' ? '— ВСИЧКИ ЧАСТИ СА ИЗВАДЕНИ —' : '✔ АВТОМАТЪТ Е СГЛОБЕН';
    ui.bar.style.transform = `scaleX(${(phase === 'dis' ? t / 2 : 0.5 + t / 2).toFixed(3)})`;
  }

  // натискане: разглобява / сглобява (или по самия автомат)
  const btn = scene.querySelector('[data-ak-btn]');
  const DUR = { dis: 3200, as: 3800 };
  let state = 'assembled', raf = 0;
  function run(phase) {
    cancelAnimationFrame(raf);
    state = phase === 'dis' ? 'busy-dis' : 'busy-as';
    btn.disabled = true;
    btn.textContent = phase === 'dis' ? 'Разглобяване…' : 'Сглобяване…';
    const finish = () => {
      state = phase === 'dis' ? 'apart' : 'assembled';
      btn.disabled = false;
      btn.textContent = phase === 'dis' ? 'Натисни, за да сглобиш' : 'Натисни, за да разглобиш отново';
    };
    if (reduce) { render(phase, 1, 0); finish(); return; }
    const t0 = performance.now();
    const tick = (now) => {
      const t = clamp((now - t0) / DUR[phase]);
      render(phase, t, (now - t0) / 1000);
      if (t < 1) raf = requestAnimationFrame(tick); else finish();
    };
    raf = requestAnimationFrame(tick);
  }
  const toggle = () => {
    if (state === 'assembled') run('dis');
    else if (state === 'apart') run('as');
  };
  btn.addEventListener('click', toggle);
  svg.addEventListener('click', toggle);
  render('dis', 0);
}
