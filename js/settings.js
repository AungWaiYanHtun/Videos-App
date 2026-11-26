// =====================================================
// User settings (saved on this device) - theme, accent, layout, playback
// =====================================================
(function () {
  const KEY = 'video_app_prefs';
  const DEFAULTS = { theme: 'system', accent: 'blue', cols: '2', autoplay: true, loop: false, size: 'default', preset: 'classic', font: 'system' };
  const FONTS = {
    system: { name: 'System', css: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Roboto' },
    inter: { name: 'Inter', css: '"Inter"', g: 'Inter:wght@400;500;600;700' },
    poppins: { name: 'Poppins', css: '"Poppins"', g: 'Poppins:wght@400;500;600;700' },
    nunito: { name: 'Rounded', css: '"Nunito"', g: 'Nunito:wght@400;600;700;800' },
    comfortaa: { name: 'Comfortaa', css: '"Comfortaa"', g: 'Comfortaa:wght@400;600;700' },
    lora: { name: 'Serif', css: '"Lora"', g: 'Lora:wght@400;600;700' },
    mono: { name: 'Mono', css: '"JetBrains Mono"', g: 'JetBrains+Mono:wght@400;600;700' },
  };
  const PRESETS = {
    classic: { name: 'Classic', mode: null, accent: 'blue', bg: '' },
    day: { name: 'Day', mode: 'light', accent: 'blue', bg: 'linear-gradient(165deg,#d7ecff 0%,#f4f9ff 55%,#ffffff 100%)' },
    night: { name: 'Night', mode: 'dark', accent: 'blue', bg: 'linear-gradient(165deg,#13233b 0%,#070b14 60%,#000 100%)' },
    ocean: { name: 'Ocean', mode: 'dark', accent: 'teal', bg: 'radial-gradient(120% 80% at 80% 0%,#0e7c9b 0%,transparent 60%),linear-gradient(165deg,#062a3f,#020d16)' },
    sunset: { name: 'Sunset', mode: 'light', accent: 'orange', bg: 'linear-gradient(165deg,#ffd29d 0%,#ffb4b4 50%,#e6c9ff 100%)' },
    forest: { name: 'Forest', mode: 'dark', accent: 'green', bg: 'radial-gradient(100% 70% at 10% 0%,#1d5c3a 0%,transparent 60%),linear-gradient(165deg,#0b2618,#030a06)' },
    sakura: { name: 'Sakura', mode: 'light', accent: 'pink', bg: 'radial-gradient(90% 60% at 90% 10%,#ffc4dc 0%,transparent 60%),linear-gradient(165deg,#ffe9f2,#fff8fb)' },
    galaxy: { name: 'Galaxy', mode: 'dark', accent: 'purple', bg: 'radial-gradient(1.5px 1.5px at 20% 30%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 70% 20%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 85% 65%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 35% 80%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 55% 50%,#fff 50%,transparent 51%),radial-gradient(90% 60% at 80% 10%,#5b2a9e 0%,transparent 60%),radial-gradient(80% 60% at 0% 90%,#1b3a8f 0%,transparent 60%),linear-gradient(#06051a,#06051a)' },
    gold: { name: 'Gold', mode: 'dark', accent: 'gold', bg: 'radial-gradient(100% 60% at 50% 0%,#5a4312 0%,transparent 65%),linear-gradient(165deg,#1a1406,#000)' },
  };
  const ACCENTS = {
    blue: ['#007aff', '#0a84ff'],
    purple: ['#8e44ef', '#a066ff'],
    green: ['#1fae4b', '#30d158'],
    orange: ['#ff8a00', '#ff9f0a'],
    pink: ['#ff2d78', '#ff4d8d'],
    red: ['#ff3b30', '#ff453a'],
    teal: ['#00a5b8', '#2cd4e6'],
    gold: ['#c99400', '#f5c542'],
  };
  let prefs = { ...DEFAULTS };
  try { prefs = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch {}

  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const tg = window.Telegram && window.Telegram.WebApp;

  function resolvedTheme() {
    if (prefs.theme === 'light' || prefs.theme === 'dark') return prefs.theme;
    if (tg && tg.initData && tg.colorScheme) return tg.colorScheme; // follow Telegram's theme
    return mq && mq.matches ? 'dark' : 'light';
  }

  function apply() {
    const root = document.documentElement;
    const dark = resolvedTheme() === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.cols = prefs.cols;
    root.dataset.size = prefs.size;
    const a = ACCENTS[prefs.accent] || ACCENTS.blue;
    root.style.setProperty('--blue', dark ? a[1] : a[0]);
    const p = PRESETS[prefs.preset] || PRESETS.classic;
    root.dataset.preset = p.bg ? 'on' : 'off';
    root.style.setProperty('--app-bg', p.bg || 'none');
    const f = FONTS[prefs.font] || FONTS.system;
    if (f.g) loadFonts([f.g]);
    root.style.setProperty('--font', f.css + ', "Noto Sans Myanmar", "Myanmar Text", Padauk, Arial, sans-serif');
    const meta = document.querySelector('meta[name="theme-color"]');
    const bg = dark ? '#000000' : '#f2f2f7';
    if (meta) meta.setAttribute('content', bg);
    if (tg && tg.initData) {
      try { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); } catch {}
    }
  }

  const loaded = new Set();
  function loadFonts(list) {
    const need = list.filter((g) => !loaded.has(g));
    if (!need.length) return;
    need.forEach((g) => loaded.add(g));
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?' + need.map((g) => 'family=' + g).join('&') + '&display=swap';
    document.head.appendChild(l);
  }
  function setPreset(id) {
    const p = PRESETS[id]; if (!p) return;
    prefs.preset = id;
    if (p.mode) prefs.theme = p.mode;
    if (p.accent) prefs.accent = p.accent;
    localStorage.setItem(KEY, JSON.stringify(prefs));
    apply();
  }

  function set(k, v) {
    prefs[k] = v;
    localStorage.setItem(KEY, JSON.stringify(prefs));
    apply();
  }
  function reset() {
    prefs = { ...DEFAULTS };
    localStorage.removeItem(KEY);
    apply();
  }

  if (mq) (mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply));
  if (tg && tg.onEvent) tg.onEvent('themeChanged', apply);
  apply();

  window.Prefs = { get: (k) => prefs[k], set, reset, setPreset, loadFonts, ACCENTS, FONTS, PRESETS };
})();

// ---- Settings screen wiring ----
document.addEventListener('DOMContentLoaded', () => {
  const $ = (q) => document.querySelector(q);
  const sw = $('#swatches');
  if (!sw) return;
  const toast = (m) => { const t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800); };

  function paint() {
    document.querySelectorAll('.seg[data-pref]').forEach((seg) => {
      const v = String(Prefs.get(seg.dataset.pref));
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    });
    document.querySelectorAll('.theme-card').forEach((b) => b.classList.toggle('on', b.dataset.v === Prefs.get('preset')));
    document.querySelectorAll('.font-chip').forEach((b) => b.classList.toggle('on', b.dataset.v === Prefs.get('font')));
    sw.querySelectorAll('.swatch').forEach((b) => b.classList.toggle('on', b.dataset.v === Prefs.get('accent')));
    document.querySelectorAll('[data-toggle]').forEach((i) => (i.checked = !!Prefs.get(i.dataset.toggle)));
  }

  // Theme preview cards
  const tw = $('#themeCards');
  Object.entries(Prefs.PRESETS).forEach(([id, p]) => {
    const a = Prefs.ACCENTS[p.accent] || Prefs.ACCENTS.blue;
    const dark = p.mode === 'dark';
    const b = document.createElement('button');
    b.className = 'theme-card'; b.dataset.v = id;
    b.innerHTML = '<div class="theme-prev' + (dark ? ' dark' : '') + '"><span class="tp-card"></span><span class="tp-card short"></span><span class="tp-pill"></span></div><div class="theme-name"></div>';
    const prev = b.firstChild;
    prev.style.background = p.bg || 'linear-gradient(165deg,#f2f2f7 50%,#000 50%)';
    prev.querySelector('.tp-pill').style.background = dark ? a[1] : a[0];
    b.lastChild.textContent = p.name;
    b.onclick = () => { Prefs.setPreset(id); paint(); };
    tw.appendChild(b);
  });

  // Font chips
  const fw = $('#fontChips');
  Object.entries(Prefs.FONTS).forEach(([id, f]) => {
    const b = document.createElement('button');
    b.className = 'font-chip'; b.dataset.v = id;
    b.innerHTML = '<span class="aa">Aa</span><span class="fn"></span>';
    b.style.fontFamily = f.css + ', sans-serif';
    b.lastChild.textContent = f.name;
    b.onclick = () => { Prefs.set('font', id); paint(); };
    fw.appendChild(b);
  });
  // Load font previews only when Settings is opened
  const st = document.querySelector('.tab[data-tab="settings"]');
  const loadPreviews = () => Prefs.loadFonts(Object.values(Prefs.FONTS).filter((f) => f.g).map((f) => f.g));
  if (st) st.addEventListener('click', loadPreviews, { once: true });

  Object.entries(Prefs.ACCENTS).forEach(([name, c]) => {
    const b = document.createElement('button');
    b.className = 'swatch'; b.dataset.v = name; b.style.background = c[0]; b.style.color = c[0];
    b.setAttribute('aria-label', name);
    b.onclick = () => { Prefs.set('accent', name); paint(); };
    sw.appendChild(b);
  });
  document.querySelectorAll('.seg[data-pref]').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      Prefs.set(seg.dataset.pref, b.dataset.v); paint();
    });
  });
  document.querySelectorAll('[data-toggle]').forEach((i) => i.addEventListener('change', () => Prefs.set(i.dataset.toggle, i.checked)));

  $('#shareAppBtn').onclick = async () => {
    const url = location.origin;
    const tg = window.Telegram && window.Telegram.WebApp;
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else if (tg && tg.initData) tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(url));
      else { await navigator.clipboard.writeText(url); toast('Link copied ✓'); }
    } catch {}
  };
  $('#refreshAppBtn').onclick = () => location.reload();
  $('#resetPrefsBtn').onclick = () => { if (confirm('Reset all settings to default?')) { Prefs.reset(); paint(); toast('Settings reset'); } };
  paint();
});
