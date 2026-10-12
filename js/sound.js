// Звукови ефекти. По подразбиране са изключени; включват се от бутона в навигацията.
//  - изстрел: истински запис на AEG реплика от терена (assets/sfx/aeg-shot.wav)
//  - попадение: „hitmarker“ в стил Call of Duty, синтезиран с Web Audio
let ctx = null, master = null, comp = null, noise = null, shotBuf = null, loading = null;
let enabled = false;

function ensure() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10; comp.ratio.value = 4; comp.attack.value = 0.002; comp.release.value = 0.12;
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(comp).connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  loadShot();
  return true;
}

function loadShot() {
  if (shotBuf || loading) return;
  loading = fetch(new URL('../assets/sfx/aeg-shot.wav', import.meta.url))
    .then((r) => r.arrayBuffer())
    .then((a) => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej)))
    .then((b) => { shotBuf = b; })
    .catch(() => { loading = null; });
}

function env(g, t, peak, decay, attack = 0.001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}
function osc(type, f0, f1, t, dur, peak, dest = master) {
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); env(g, t, peak, dur);
  o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
}
function burst(t, dur, peak, type, freq, q = 1) {
  const s = ctx.createBufferSource(); s.buffer = noise;
  s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); env(g, t, peak, dur, 0.0005);
  s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 0.1); s.stop(t + dur + 0.02);
}

export const sound = {
  get enabled() { return enabled; },
  set(on) {
    enabled = on;
    if (on) ensure();
    try { localStorage.setItem('afw-sound', on ? '1' : '0'); } catch {}
  },
  restore() {
    try { return localStorage.getItem('afw-sound') === '1'; } catch { return false; }
  },
  // Изстрел от AEG – записът се пуска с леко различна височина всеки път, за да звучи живо
  shot() {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime;
    if (shotBuf) {
      const s = ctx.createBufferSource(); s.buffer = shotBuf;
      s.playbackRate.value = 0.95 + Math.random() * 0.1;
      const g = ctx.createGain(); g.gain.value = 0.95;
      s.connect(g).connect(master); s.start(t);
    } else {
      burst(t, 0.06, 0.6, 'bandpass', 2200, 0.8); // докато записът се зарежда
    }
    // лек „удар“ в ниските честоти за плътност
    osc('sine', 140, 55, t, 0.07, 0.25);
  },
  // Hitmarker: сухо щракване + удар в тялото; при хедшот/център – и метален звън
  hit(big = false) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime + 0.035; // куршумът „долита“
    burst(t, 0.022, 0.55, 'bandpass', 3800, 2.2);       // „тк“
    osc('triangle', 2100, 1650, t, 0.045, 0.22);         // кратък метален връх
    osc('sine', 190, 70, t, 0.11, 0.55);                 // плътен удар
    burst(t + 0.004, 0.05, 0.25, 'lowpass', 900, 0.7);   // „туп“
    if (big) {
      osc('sine', 2480, 2440, t + 0.01, 0.42, 0.13);
      osc('sine', 3720, 3700, t + 0.01, 0.3, 0.07);
      osc('square', 1240, 1230, t + 0.01, 0.06, 0.05);
    }
  },
  ui() {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime;
    osc('square', 1300, 1300, t, 0.035, 0.04);
    osc('square', 1750, 1750, t + 0.035, 0.04, 0.035);
  },
};
