// Фоново видео в hero, клипове „Виж ни в действие“, TikTok и карта.
// Всичко тежко се зарежда едва когато е нужно – сайтът остава бърз.
export function initHeroVideo(cfg, { reduce, mobile }) {
  const v = cfg.heroVideo || {};
  const src = mobile ? (v.mobile || v.desktop) : (v.desktop || v.mobile);
  const saveData = navigator.connection && navigator.connection.saveData;
  if (!src || reduce || saveData) return;
  const wrap = document.querySelector('.hero-media');
  const start = () => {
    const video = document.createElement('video');
    Object.assign(video, { muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto' });
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.src = src;
    video.addEventListener('playing', () => video.classList.add('on'), { once: true });
    wrap.append(video);
    // пауза, когато hero не се вижда – пести батерия
    new IntersectionObserver(([e]) => { e.isIntersecting ? video.play().catch(() => {}) : video.pause(); })
      .observe(document.getElementById('hero'));
  };
  // видеото тръгва след като страницата е заредена (постерът се показва веднага)
  if (document.readyState === 'complete') setTimeout(start, 150);
  else addEventListener('load', () => setTimeout(start, 150), { once: true });
}

export function initClips(cfg) {
  const grid = document.getElementById('clipsGrid');
  if (!grid) return;
  const clips = cfg.actionClips || [];
  let playing = null;
  clips.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'tt-card clip-card reveal';
    card.style.setProperty('--rd', `${(i % 3) * 90}ms`);
    const poster = `assets/video/action-${c.id}.webp`;
    card.innerHTML = `<button type="button" class="tt-facade clip-facade" aria-label="Пусни видео: ${c.title}">
        <img src="${poster}" alt="" loading="lazy" decoding="async" width="576" height="1024">
        <span class="clip-rec mono"><i></i> REC // CAM-${String(i + 1).padStart(2, '0')}</span>
        <span class="tt-play"><svg><use href="#i-play"/></svg></span>
        <span class="clip-title"><b class="stencil">${c.title}</b><small class="mono">НАТИСНИ ЗА ВИДЕО СЪС ЗВУК</small></span>
      </button>`;
    card.querySelector('button').addEventListener('click', () => {
      const v = document.createElement('video');
      Object.assign(v, { src: `assets/video/action-${c.id}.mp4`, poster, controls: true, playsInline: true, autoplay: true, preload: 'auto' });
      v.setAttribute('playsinline', '');
      v.addEventListener('play', () => { if (playing && playing !== v) playing.pause(); playing = v; });
      card.replaceChildren(v);
      v.play().catch(() => {});
    });
    grid.append(card);
  });
  // спира видеото, когато излезе от екрана
  new IntersectionObserver(([e]) => { if (!e.isIntersecting && playing) playing.pause(); }).observe(grid);
}

function tiktokId(url) {
  const m = String(url).match(/video\/(\d+)/) || String(url).match(/^(\d{10,})$/);
  return m ? m[1] : null;
}

export function initTikTok(cfg) {
  const grid = document.getElementById('tiktokGrid');
  if (!grid) return;
  const ids = (cfg.tiktokVideos || []).map(tiktokId).filter(Boolean);
  if (!ids.length) { grid.remove(); return; }
  ids.forEach((id, i) => {
    const card = document.createElement('div');
    card.className = 'tt-card reveal';
    card.style.setProperty('--rd', `${(i % 3) * 90}ms`);
    card.innerHTML = `<button type="button" class="tt-facade">
        <span class="tt-play"><svg><use href="#i-tiktok"/></svg></span>
        <b class="stencil">TikTok ${String(i + 1).padStart(2, '0')}</b><small class="mono">НАТИСНИ ЗА ВИДЕО</small></button>`;
    card.querySelector('button').addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.tiktok.com/player/v1/${id}?autoplay=1&music_info=1&description=1&rel=0`;
      f.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
      f.title = 'TikTok видео';
      card.replaceChildren(f);
    });
    grid.append(card);
  });
}

// Google карта – зарежда се при натискане (иначе тежи ~1 MB)
export function initMap(cfg) {
  const btn = document.getElementById('mapLoad');
  if (!btn || !cfg.mapCoords) return;
  const [lat, lng] = cfg.mapCoords;
  btn.querySelector('[data-coords]').textContent = `N ${lat.toFixed(5)}° / E ${lng.toFixed(5)}°`;
  btn.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = `https://maps.google.com/maps?q=${lat},${lng}&z=15&hl=bg&output=embed`;
    f.title = 'Карта: Airsoft Field Warzone';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.allowFullscreen = true;
    btn.replaceWith(f);
  });
}
