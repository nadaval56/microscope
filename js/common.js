// Shared helpers for every page: header/footer, theme, data loading, formatting.

export const DEV = new URLSearchParams(location.search).has('dev');

/* ------------------------------------------------------------ storage */
export const store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem('mk:' + key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('mk:' + key, JSON.stringify(value)); } catch { /* private mode etc. */ }
  },
};

/* -------------------------------------------------------------- icons */
const P = {
  logo: '<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="10" r="2.6" fill="var(--electron)"/><circle cx="15.2" cy="13.6" r="3.3" fill="var(--light)"/><circle cx="10.6" cy="16.2" r="1.3" fill="var(--brand)"/><circle cx="15" cy="7.6" r="1" fill="var(--probe)"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  ruler: '<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
  scale: '<circle cx="6" cy="18" r="3"/><circle cx="14" cy="10" r="2"/><circle cx="19" cy="5" r="1"/>',
  split: '<path d="M12 3v18"/><circle cx="7" cy="12" r="4"/><path d="M15 8h6v8h-6z"/>',
  quiz: '<circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 4"/><circle cx="12" cy="17.3" r=".6" fill="currentColor"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  micro: '<path d="M6 21h12M9 21v-3h6v3M8 18c-2-1-3-3-3-5"/><path d="M10 4l4 0 0 3-1 0 0 6-2 0 0-6-1 0z"/><path d="M12 13v2M14 11a5 5 0 0 1 0 7"/>',
  home: '<path d="M3 11 12 3l9 8M5 9.5V21h14V9.5"/>',
  zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
  zoomOut: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  full: '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>',
  chevron: '<path d="m15 18-6-6 6-6"/>',
  chevronL: '<path d="m15 18-6-6 6-6"/>',
  chevronR: '<path d="m9 18 6-6-6-6"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.5"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  cross: '<path d="M18 6 6 18M6 6l12 12"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  atom: '<circle cx="12" cy="12" r="1.6" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-60 12 12)"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  sunRay: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  hand: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.5 15a1.6 1.6 0 0 1 2.6-1.8L7 14.5"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19 13 11"/>',
  hair: '<path d="M4 20c4-6 3-12 8-16M9 21c3-5 4-11 9-15"/>',
  sand: '<path d="M6 15c-1.5-3 1-7 4.5-7.5 3.4-.5 7 1.5 7.4 5 .5 3.6-3 6.5-6.7 6.5-2.6 0-4.3-1.6-5.2-4z"/>',
  cell: '<ellipse cx="12" cy="12" rx="9" ry="7"/><circle cx="13" cy="11" r="2.5"/>',
  blood: '<ellipse cx="12" cy="12" rx="9" ry="9"/><ellipse cx="12" cy="12" rx="4" ry="4"/>',
  bacteria: '<rect x="4" y="9" width="16" height="6" rx="3"/><path d="M20 12h2M2 11c1 1 1 2 0 3"/>',
  virus: '<circle cx="12" cy="12" r="5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M5 19l3.5-3.5M15.5 8.5 19 5"/>',
  dna: '<path d="M7 3c0 6 10 6 10 12s-10 6-10 6M17 3c0 6-10 6-10 12"/><path d="M8.5 6h7M8.5 18h7M10 9.5h4M10 14.5h4"/>',
  protein: '<path d="M6 7c3-4 9 0 6 4s3 8 6 4"/><circle cx="6" cy="7" r="1.6"/><circle cx="18" cy="15" r="1.6"/>',
  dust: '<circle cx="7" cy="8" r="1.2"/><circle cx="15" cy="6" r="1.8"/><circle cx="11" cy="14" r="2.2"/><circle cx="18" cy="16" r="1"/><circle cx="6" cy="17" r=".8"/>',
  paper: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  arrowDown: '<path d="M12 4v16M6 14l6 6 6-6"/>',
};
export function icon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

/* ------------------------------------------------------------- labels */
export const MICROSCOPE = {
  light: { he: 'מיקרוסקופ אור', short: 'אור' },
  electron: { he: 'מיקרוסקופ אלקטרונים', short: 'אלקטרונים' },
  probe: { he: 'מיקרוסקופ מחט סורקת', short: 'מחט סורקת' },
  illustration: { he: 'איור היסטורי', short: 'איור' },
};

// Number ranges ("1609–1625", "0.5–1") get reversed inside RTL text; wrap them in a
// left-to-right isolate (U+2066 … U+2069) so they read in the right order.
const RANGE = /\d+(?:[.,]\d+)?\s*[–-]\s*\d+(?:[.,]\d+)?/g;
/** Escape for attributes that must stay byte-exact (URLs, ids). */
export function escAttr(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function esc(s) {
  return String(s ?? '')
    .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    .replace(RANGE, '\u2066$&\u2069');
}

/** Hebrew size label from metres: "≈ 30 מיקרון", "≈ 0.2 מ\"מ", "≈ 100 ננומטר" */
export function formatSize(m, approx = true) {
  if (!m && m !== 0) return '';
  let v, u;
  if (m >= 1e-2) { v = m * 100; u = 'ס"מ'; }
  else if (m >= 1e-3) { v = m * 1e3; u = 'מ"מ'; }
  else if (m >= 1e-6) { v = m * 1e6; u = 'מיקרון'; }
  else if (m >= 1e-9) { v = m * 1e9; u = 'ננומטר'; }
  else { v = m * 1e12; u = 'פיקומטר'; }
  return `${approx ? '≈ ' : ''}${niceNum(v)} ${u}`;
}
export function niceNum(v) {
  if (v >= 100) return String(Math.round(v));
  if (v >= 10) return String(Math.round(v));
  if (v >= 1) return String(Math.round(v * 10) / 10);
  return String(Math.round(v * 100) / 100);
}
/** Latin-unit label for scale bars: "10 µm" */
export function formatSI(m) {
  if (m >= 1e-3) return `${niceNum(m * 1e3)} mm`;
  if (m >= 1e-6) return `${niceNum(m * 1e6)} µm`;
  return `${niceNum(m * 1e9)} nm`;
}

export function badgesFor(img, { size = false } = {}) {
  const m = MICROSCOPE[img.microscope] || { short: img.microscope };
  let out = `<span class="badge badge-${img.microscope}"><span class="dot"></span>${esc(m.short)}</span>`;
  if (img.colorized) out += `<span class="badge badge-false" title="הצבעים נוספו אחרי הצילום">צבע מלאכותי</span>`;
  if (DEV && !img.verified) out += `<span class="badge badge-unverified">לא מאומת</span>`;
  if (size && img.scale?.subject_size_label) out += `<span class="badge">${esc(img.scale.subject_size_label)}</span>`;
  return out;
}

/* --------------------------------------------------------------- data */
const cache = {};
export async function loadJSON(name) {
  if (!cache[name]) {
    cache[name] = fetch(`data/${name}.json`).then((r) => {
      if (!r.ok) throw new Error(`${name}: ${r.status}`);
      return r.json();
    });
  }
  return cache[name];
}
export async function getImages() {
  const all = await loadJSON('images');
  return DEV ? all : all.filter((x) => x.verified);
}
export async function getCategories() { return loadJSON('categories'); }
export async function getTechniques() { return loadJSON('techniques'); }

export function imgSrc(img, w = 1200) {
  const ws = img.widths?.length ? img.widths : [400, 1200];
  const best = ws.find((x) => x >= w) ?? ws[ws.length - 1];
  return `img/micro/${img.id}-${best}.webp`;
}
export function imgSrcset(img) {
  const ws = img.widths?.length ? img.widths : [400, 1200];
  return ws.map((w) => `img/micro/${img.id}-${w}.webp ${Math.min(w, img.width || w)}w`).join(', ');
}
export function imgTag(img, { sizes = '(max-width: 600px) 50vw, 300px', alt, cls = '', eager = false, w = 400 } = {}) {
  const a = alt ?? img.title_he;
  const ratio = img.width && img.height ? ` width="${img.width}" height="${img.height}"` : '';
  return `<img class="${cls}" src="${imgSrc(img, w)}" srcset="${imgSrcset(img)}" sizes="${sizes}" alt="${esc(a)}"${ratio} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

export function cardHTML(img) {
  return `<a class="img-card fade-in" href="image.html?id=${img.id}${DEV ? '&dev=1' : ''}">
    <div class="thumb">${imgTag(img, { sizes: '(max-width: 520px) 50vw, (max-width: 900px) 33vw, 260px' })}
      <div class="badges">${badgesFor(img)}</div></div>
    <div class="meta"><h3>${esc(img.title_he)}</h3>${img.scale?.subject_size_label ? `<span class="size">${esc(img.scale.subject_size_label)}</span>` : ''}</div>
    <span class="mtype mtype-${img.microscope}"></span>
  </a>`;
}

/** deterministic pick by date (image of the day) */
export function dayIndex(n, date = new Date()) {
  const d = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
  return ((d * 2654435761) >>> 0) % n;
}
export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------- page chrome */
const NAV = [
  ['index.html', 'בית'],
  ['gallery.html', 'גלריה'],
  ['scale.html', 'מסע בגדלים'],
  ['microscopes.html', 'אור או אלקטרונים?'],
  ['history.html', 'היסטוריה'],
  ['quiz.html', 'חידון'],
  ['diy.html', 'מיקרוסקופ בבית'],
];

function currentPage() {
  const f = location.pathname.split('/').pop() || 'index.html';
  return f === '' ? 'index.html' : f;
}

export function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const btn = document.getElementById('theme-btn');
  if (btn) {
    btn.innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
    btn.setAttribute('aria-label', t === 'dark' ? 'מעבר לערכה בהירה' : 'מעבר לערכה כהה');
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t === 'dark' ? '#0f1419' : '#f6f7f9';
}

export function renderChrome() {
  const cur = currentPage();
  const dev = DEV ? '?dev=1' : '';
  const header = document.getElementById('site-header');
  if (header) {
    header.className = 'site-header';
    header.innerHTML = `<div class="container">
      <a class="logo" href="index.html${dev}" aria-label="מיקרוקוסמוס — דף הבית"><svg viewBox="0 0 24 24" aria-hidden="true">${P.logo}</svg><span>מיקרוקוסמוס</span></a>
      <button class="icon-btn menu-btn" id="menu-btn" aria-expanded="false" aria-controls="main-nav" aria-label="תפריט">${icon('menu')}</button>
      <nav class="nav" id="main-nav" aria-label="ניווט ראשי">
        ${NAV.map(([href, label]) => `<a href="${href}${dev}"${href === cur ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
      </nav>
      <button class="icon-btn" id="theme-btn" type="button"></button>
    </div>`;
    const menuBtn = header.querySelector('#menu-btn');
    const nav = header.querySelector('#main-nav');
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
      menuBtn.innerHTML = icon(open ? 'x' : 'menu');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.innerHTML = icon('menu'); menuBtn.focus(); }
    });
    header.querySelector('#theme-btn').addEventListener('click', () => {
      const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      store.set('theme', t);
      applyTheme(t);
    });
  }
  applyTheme(document.documentElement.dataset.theme || 'dark');

  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.className = 'site-footer';
    footer.innerHTML = `<div class="container">
      <div>מיקרוקוסמוס · אתר חינוכי על העולם שהעין לא רואה</div>
      <nav aria-label="קישורי תחתית">
        <a href="credits.html${dev}">קרדיטים ורישיונות</a>
        <a href="gallery.html${dev}">כל התמונות</a>
        <a href="microscopes.html${dev}#techniques">סוגי מיקרוסקופים</a>
        <a href="https://github.com/nadaval56/microscope" rel="noopener">קוד המקור</a>
      </nav>
    </div>`;
  }
  if (DEV) {
    const b = document.createElement('div');
    b.className = 'dev-banner';
    b.textContent = 'מצב פיתוח: מוצגות גם תמונות שלא אומתו';
    document.body.prepend(b);
  }
}

renderChrome();
