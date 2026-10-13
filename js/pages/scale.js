import { getImages, loadJSON, imgSrc, esc, icon, formatSize, DEV, reducedMotion } from '../common.js';

const TOP = -2;     // log10 of 1 cm
const BOTTOM = -10; // log10 of 0.1 nm
const dev = DEV ? '&dev=1' : '';

const LIMITS = [
  { m: 1e-4, he: 'עד כאן רואה העין', sub: 'בערך 0.1 מ"מ', color: 'var(--text-2)' },
  { m: 2e-7, he: 'עד כאן רואה מיקרוסקופ אור', sub: 'גבול אבה: בערך 200 ננומטר. מכאן רק מיקרוסקופ אלקטרונים', color: 'var(--electron)' },
  { m: 1e-9, he: 'קבוצות קטנות של אטומים', sub: 'מיקרוסקופ מחט סורקת וטכניקות מתקדמות', color: 'var(--probe)' },
];
const TOASTS = [
  { m: 1e-3, html: '<b>עברנו למיקרונים!</b> מיקרון הוא אלפית המילימטר. בתוך מילימטר אחד נכנסים 1,000 מיקרונים.' },
  { m: 1e-4, html: '<b>גבול העין</b>: דברים קטנים מעשירית המילימטר כבר לא רואים בלי עזרה.' },
  { m: 1e-6, html: '<b>עברנו לננומטרים!</b> ננומטר הוא אלפית המיקרון, מיליונית המילימטר.' },
  { m: 2e-7, html: '<b>גבול האור</b>: כאן מיקרוסקופ אור מפסיק להבחין בפרטים. מכאן ממשיכים עם אלקטרונים.' },
  { m: 1e-9, html: '<b>ננומטר אחד</b>: בערך 5 עד 10 אטומים בשורה.' },
];

let H = 700; // px per decade (recomputed)
let items = [];
let lastSize = null;

const yOf = (m) => (TOP - Math.log10(m)) * H;
const mOf = (y) => 10 ** (TOP - y / H);

function unitOf(m) { return m >= 1e-3 ? 'mm' : m >= 1e-6 ? 'um' : 'nm'; }
const UNIT_HE = { mm: 'מילימטרים', um: 'מיקרונים', nm: 'ננומטרים' };

function layout() {
  const track = document.getElementById('track');
  const W = track.clientWidth;
  const narrow = W < 700;
  const cardH = narrow ? 76 : 92, gap = 10;
  // decade density decides the decade height
  const dens = {};
  for (const it of items) { const d = Math.floor(-Math.log10(it.m)); dens[d] = (dens[d] || 0) + 1; }
  const maxD = Math.max(...Object.values(dens));
  H = Math.max(narrow ? 520 : 640, Math.ceil(maxD / (narrow ? 1 : 2)) * (cardH + gap) * 1.05);
  const total = (TOP - BOTTOM) * H;
  track.style.height = `${total + 60}px`;

  const axisX = narrow ? W - 22 : W / 2;
  let html = `<div class="scale-axis" style="left:${axisX - 2}px;margin:0;--abbe:${(yOf(2e-7) / total) * 100}%"></div>`;
  for (let e = TOP; e >= BOTTOM; e--) {
    for (const k of [1, 2, 5]) {
      const m = k * 10 ** e;
      if (Math.log10(m) > TOP || Math.log10(m) < BOTTOM) continue;
      html += `<span class="scale-tick ${k === 1 ? '' : 'minor'}" style="top:${yOf(m)}px;left:${axisX}px">${formatSize(m, false).replace(' ', '&nbsp;')}</span>`;
    }
  }
  for (const L of LIMITS) {
    html += `<div class="scale-limit" style="top:${yOf(L.m)}px;--lim:${L.color}"><span class="lbl">${L.he}<small>${L.sub}</small></span></div>`;
  }
  // place cards, alternating sides on desktop, pushing down to avoid overlap
  const sorted = items.slice().sort((a, b) => b.m - a.m);
  const nextFree = [0, 0];
  const lines = [];
  sorted.forEach((it, i) => {
    const side = narrow ? 0 : i % 2;
    const yTrue = yOf(it.m);
    let y = Math.max(yTrue - cardH / 2, nextFree[side]);
    nextFree[side] = y + cardH + gap;
    const cw = narrow ? W - 70 : Math.min(330, W / 2 - 40);
    // RTL page: side 0 = right of the axis on desktop
    const left = narrow ? axisX - 30 - cw : side === 0 ? axisX + 28 : axisX - 28 - cw;
    it.y = y;
    const edgeX = narrow ? left + cw : side === 0 ? left : left + cw;
    lines.push(`<line x1="${axisX}" y1="${yTrue}" x2="${edgeX}" y2="${y + cardH / 2}"/>`, `<circle cx="${axisX}" cy="${yTrue}" r="4.5"/>`);
    const inner = it.img
      ? `<img src="${imgSrc(it.img, 400)}" alt="" loading="lazy"><span class="sc-txt"><b>${esc(it.img.title_he)}</b><span>${esc(it.img.scale.subject_size_label || formatSize(it.m))}</span></span>`
      : `<span class="ref-ico">${icon(it.ref.icon)}</span><span class="sc-txt"><span class="ref-tag">לשם השוואה</span><b>${esc(it.ref.name_he)}</b><span>${esc(it.ref.label_he)}</span></span>`;
    const tag = it.img ? 'a' : 'div';
    const attrs = it.img ? `href="image.html?id=${it.img.id}${dev}"` : `title="${esc(it.ref.note_he)}" tabindex="0"`;
    html += `<${tag} class="scale-item ${it.img ? '' : 'ref'}" ${attrs} style="top:${y}px;left:${left}px;width:${cw}px;height:${cardH}px;right:auto"><span class="sc-card">${inner}</span></${tag}>`;
  });
  html = `<svg width="${W}" height="${total + 60}" style="position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:2" aria-hidden="true">
      <g stroke="var(--text-3)" stroke-opacity=".55" fill="var(--text)">${lines.join('')}</g></svg>` + html;
  track.innerHTML = html;
  onScroll();
}

function showToast(html) {
  const t = document.getElementById('toast');
  t.innerHTML = html;
  t.classList.add('show');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => t.classList.remove('show'), 4200);
}

function onScroll() {
  const track = document.getElementById('track');
  const r = track.getBoundingClientRect();
  const probe = innerHeight * 0.5;
  const total = (TOP - BOTTOM) * H;
  const y = Math.min(total, Math.max(0, probe - r.top));
  const m = mOf(y);
  document.getElementById('hud-size').textContent = formatSize(m).replace('≈ ', '');
  document.getElementById('hud-unit').textContent = `עולם ה${UNIT_HE[unitOf(m)]}`;
  const range = document.getElementById('hud-range');
  if (document.activeElement !== range) range.value = Math.round((y / total) * 1000);
  if (lastSize !== null) {
    for (const t of TOASTS) {
      if (lastSize >= t.m && m < t.m) showToast(t.html);
    }
  }
  lastSize = m;
}

async function main() {
  const [images, refs] = await Promise.all([getImages(), loadJSON('scale-references')]);
  items = images.filter((x) => x.scale?.subject_size_m && x.category !== 'history')
    .map((img) => ({ m: img.scale.subject_size_m, img }))
    .concat(refs.map((ref) => ({ m: ref.size_m, ref })))
    .filter((it) => Math.log10(it.m) <= TOP && Math.log10(it.m) >= BOTTOM);
  layout();
  let raf = 0;
  addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(onScroll); }, { passive: true });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 150); });
  const range = document.getElementById('hud-range');
  range.addEventListener('input', () => {
    const track = document.getElementById('track');
    const total = (TOP - BOTTOM) * H;
    const top = track.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + (range.value / 1000) * total - innerHeight * 0.5, behavior: 'auto' });
  });
  if (!reducedMotion()) document.getElementById('track').classList.add('fade-in');
}
main().catch((e) => { console.error(e); document.getElementById('track').innerHTML = '<p class="loading">לא הצלחנו לטעון את המסע.</p>'; });
