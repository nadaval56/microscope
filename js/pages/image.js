import { escAttr, getImages, getCategories, getTechniques, imgSrc, imgSrcset, esc, icon, badgesFor, cardHTML, formatSI, MICROSCOPE, DEV, niceNum } from '../common.js';

const dev = DEV ? '&dev=1' : '';

/* ------------------------------------------------------------ helpers */
function humanLength(m) {
  if (m >= 1000) return `${niceNum(m / 1000)} קילומטר`;
  if (m >= 1) return `${niceNum(m)} מטר`;
  if (m >= 0.01) return `${niceNum(m * 100)} סנטימטר`;
  return `${niceNum(m * 1000)} מילימטר`;
}

function sizeComparison(img) {
  const s = img.scale?.subject_size_m;
  if (!s) return '';
  const BALL = 0.22; // football diameter, metres
  const f = BALL / s;
  const lines = [];
  if (s < 7e-5) lines.push(`שערה אחת (עובי של כ-70 מיקרון) הייתה עבה ${humanLength(7e-5 * f)}.`);
  if (s < 7.5e-6 * 0.8) lines.push(`כדורית דם אדומה (כ-7.5 מיקרון) הייתה בקוטר של ${humanLength(7.5e-6 * f)}.`);
  if (s > 2e-6 && s < 5e-4) lines.push(`חיידק (כ-2 מיקרון) היה באורך של ${humanLength(2e-6 * f)}.`);
  lines.push(`ואתם, בגובה של מטר וחצי, הייתם מתנשאים לגובה ${humanLength(1.5 * f)}.`);
  return `<div class="info-card compare-size"><h2>${icon('scale')} השוואת גודל</h2>
    <p style="margin-bottom:.5em">אם ${esc(img.title_he)} היה בגודל של כדורגל (22 ס״מ), אז:</p>
    <ul style="margin:0;padding-inline-start:1.2em">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>
    ${img.scale.comparison_he ? `<p style="margin:.6em 0 0" class="muted">ובמילים אחרות: ${esc(img.scale.comparison_he)}.</p>` : ''}
  </div>`;
}

function creditHTML(lic) {
  if (!lic) return '';
  const kind = lic.kind === 'pd' ? '' : ` · <a class="lic" href="${escAttr(lic.url)}" rel="license noopener">${esc(lic.name)}</a>`;
  return `<div class="credit"><b>קרדיט:</b> <bdi>${esc(lic.author || 'לא ידוע')}</bdi>${kind}${lic.kind === 'pd' ? ` · ${esc(lic.name)}` : ''}
    · <a href="${escAttr(lic.source_url)}" rel="noopener">מקור: Wikimedia Commons ${icon('ext').replace('<svg', '<svg style="width:13px;height:13px;display:inline;vertical-align:-1px"')}</a>
    · <span class="ltr">${esc(lic.modifications || '')}</span></div>`;
}

/* ------------------------------------------------------------- viewer */
function setupViewer(root, img) {
  const box = root.querySelector('.viewer');
  const el = box.querySelector('img');
  const bar = box.querySelector('.scalebar');
  const hint = box.querySelector('.viewer-hint');
  let s = 1, tx = 0, ty = 0;
  const MAX = 8;

  const contentSize = () => {
    const cw = box.clientWidth, ch = box.clientHeight;
    const ar = (img.width || 4) / (img.height || 3);
    return cw / ch > ar ? [ch * ar, ch] : [cw, cw / ar];
  };
  function clamp() {
    const cw = box.clientWidth, ch = box.clientHeight;
    const [w, h] = contentSize();
    // the image content is centred inside the element; allow panning until its edge hits the frame
    const ox = (cw - w) / 2, oy = (ch - h) / 2;
    if (s <= 1) { tx = 0; ty = 0; return; }
    const fit = (t, size, frame, off) => (size * s <= frame
      ? (frame - size * s) / 2 - off * s
      : Math.min(-off * s, Math.max(frame - (off + size) * s, t)));
    tx = fit(tx, w, cw, ox);
    ty = fit(ty, h, ch, oy);
  }
  function apply() {
    clamp();
    el.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    if (s > 1.6 && !el.dataset.hi && img.widths?.includes(1920)) { el.dataset.hi = 1; el.src = imgSrc(img, 1920); el.removeAttribute('srcset'); }
    updateBar();
  }
  function zoomAt(f, px, py) {
    const ns = Math.min(MAX, Math.max(1, s * f));
    const k = ns / s;
    tx = px - k * (px - tx);
    ty = py - k * (py - ty);
    s = ns;
    apply();
    if (hint) hint.style.opacity = 0;
  }
  function updateBar() {
    if (!bar) return;
    const fw = img.scale?.field_width_m;
    if (!fw) return;
    const [w] = contentSize();
    const mPerPx = fw / (w * s);
    const target = mPerPx * 110;
    const p = 10 ** Math.floor(Math.log10(target));
    const nice = [1, 2, 5, 10].map((n) => n * p).reverse().find((v) => v <= target) || p;
    bar.querySelector('.bar').style.width = `${nice / mPerPx}px`;
    bar.querySelector('.val').textContent = formatSI(nice);
  }
  const rel = (e) => { const r = box.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  box.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = rel(e); zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, x, y); }, { passive: false });
  box.addEventListener('dblclick', (e) => { const [x, y] = rel(e); s > 1.5 ? (s = 1, apply()) : zoomAt(2.5, x, y); });

  const pts = new Map();
  let last = null, pinch = null;
  box.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    box.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, rel(e));
    if (pts.size === 1) last = rel(e);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s }; }
    box.classList.add('dragging');
  });
  box.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, rel(e));
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt((pinch.s * d / pinch.d) / s, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    } else if (pts.size === 1 && last) {
      const p = rel(e);
      tx += p[0] - last[0]; ty += p[1] - last[1]; last = p;
      apply();
    }
  });
  const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (pts.size === 1) last = [...pts.values()][0]; if (!pts.size) { last = null; box.classList.remove('dragging'); } };
  box.addEventListener('pointerup', up);
  box.addEventListener('pointercancel', up);

  box.tabIndex = 0;
  box.addEventListener('keydown', (e) => {
    const c = [box.clientWidth / 2, box.clientHeight / 2];
    if (e.key === '+' || e.key === '=') zoomAt(1.3, ...c);
    else if (e.key === '-') zoomAt(1 / 1.3, ...c);
    else if (e.key === '0') { s = 1; apply(); }
    else if (e.key.startsWith('Arrow') && s > 1) {
      const d = 40; if (e.key === 'ArrowLeft') tx += d; if (e.key === 'ArrowRight') tx -= d; if (e.key === 'ArrowUp') ty += d; if (e.key === 'ArrowDown') ty -= d; apply();
    } else return;
    e.preventDefault();
  });
  root.querySelector('[data-z="in"]').addEventListener('click', () => zoomAt(1.4, box.clientWidth / 2, box.clientHeight / 2));
  root.querySelector('[data-z="out"]').addEventListener('click', () => zoomAt(1 / 1.4, box.clientWidth / 2, box.clientHeight / 2));
  root.querySelector('[data-z="reset"]').addEventListener('click', () => { s = 1; apply(); });
  root.querySelector('[data-z="full"]').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else box.requestFullscreen?.().catch(() => {});
  });
  addEventListener('resize', apply);
  document.addEventListener('fullscreenchange', () => setTimeout(apply, 50));
  el.addEventListener('load', updateBar);
  apply();
}

/* --------------------------------------------------------------- main */
async function main() {
  const root = document.getElementById('image-root');
  const id = new URLSearchParams(location.search).get('id');
  const [images, cats, techs] = await Promise.all([getImages(), getCategories(), getTechniques().catch(() => [])]);
  const img = images.find((x) => x.id === id);
  if (!img) {
    root.innerHTML = `<div class="empty"><h1>התמונה לא נמצאה</h1><p><a href="gallery.html">חזרה לגלריה</a></p></div>`;
    return;
  }
  const cat = cats.find((c) => c.id === img.category);
  const tech = techs.find((t) => t.key === img.technique);
  document.title = `${img.title_he} · מיקרוקוסמוס`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', img.text?.main_he || img.title_he);

  const catOrder = cats.map((c) => c.id);
  const ordered = images.slice().sort((a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category) || (b.scale?.subject_size_m || 0) - (a.scale?.subject_size_m || 0));
  const i = ordered.indexOf(img);
  const prev = ordered[(i - 1 + ordered.length) % ordered.length];
  const next = ordered[(i + 1) % ordered.length];

  const relIds = new Set(img.related || []);
  if (img.pair_id) images.filter((x) => x.pair_id === img.pair_id).forEach((x) => relIds.add(x.id));
  relIds.delete(img.id);
  let related = [...relIds].map((rid) => images.find((x) => x.id === rid)).filter(Boolean);
  const sameCat = images.filter((x) => x.category === img.category && x.id !== img.id && !relIds.has(x.id));
  // prefer same topic in a different technique first
  sameCat.sort((a, b) => (a.technique === img.technique) - (b.technique === img.technique));
  related = related.concat(sameCat).slice(0, 6);

  const pairs = img.pair_id ? images.filter((x) => x.pair_id === img.pair_id && x.id !== img.id) : [];
  const m = MICROSCOPE[img.microscope] || {};
  const colorLine = img.microscope === 'electron'
    ? (img.colorized ? 'מלאכותי: מיקרוסקופ אלקטרונים לא רואה צבע, והצבעים נוספו אחר כך' : 'אין צבע: כך יוצאות תמונות מיקרוסקופ אלקטרונים')
    : img.microscope === 'illustration' ? 'איור יד או הדפס'
    : img.colorized ? 'מלאכותי, נוסף אחרי הצילום'
    : img.technique === 'fluorescence' || img.technique === 'confocal' || img.technique === 'superres' ? 'אור שנפלט מצבענים זוהרים (כל צבע מסמן חלק אחר)'
    : img.technique === 'polarized' ? 'אמיתי: הצבעים נוצרים מהאור המקוטב שעובר בגביש'
    : 'אמיתי (לפעמים בעזרת צביעה כימית של הדגימה)';

  const ar = img.width && img.height ? `${img.width}/${img.height}` : '4/3';
  root.innerHTML = `
    <nav aria-label="פירורי לחם" style="padding-top:18px;font-size:.95rem" class="muted">
      <a href="gallery.html${DEV ? '?dev=1' : ''}">גלריה</a> ›
      <a href="gallery.html?cat=${img.category}${dev}">${esc(cat?.short_he || '')}</a>
    </nav>
    <article class="image-page">
      <div class="viewer-wrap">
        <div class="viewer" style="--ar:${ar}" role="img" aria-label="${esc(img.title_he)} — אפשר להגדיל ולהזיז">
          <img src="${imgSrc(img, 1200)}" srcset="${imgSrcset(img)}" sizes="(max-width: 960px) 100vw, 60vw" alt="${esc(img.title_he)}" fetchpriority="high">
          <span class="viewer-hint">גלגלת, צביטה או לחיצה כפולה להגדלה</span>
          ${img.scale?.field_width_m ? `<div class="scalebar" aria-hidden="true"><span class="val"></span><span class="bar"></span></div>` : ''}
          <div class="viewer-controls">
            <button type="button" data-z="in" aria-label="הגדלה">${icon('zoomIn')}</button>
            <button type="button" data-z="out" aria-label="הקטנה">${icon('zoomOut')}</button>
            <button type="button" data-z="reset" aria-label="איפוס">${icon('reset')}</button>
            <button type="button" data-z="full" aria-label="מסך מלא">${icon('full')}</button>
          </div>
        </div>
        <div class="scale-strip">${icon('ruler').replace('<svg', '<svg style="width:20px;height:20px"')}
          ${img.scale?.subject_size_label ? `<span>גודל אמיתי: <b>${esc(img.scale.subject_size_label)}</b></span>` : ''}
          ${img.scale?.field_width_m ? `<span class="muted">· רוחב השדה כולו <span class="ltr">${esc(formatSI(img.scale.field_width_m))}</span></span>` : ''}
        </div>
        ${creditHTML(img.license)}
      </div>

      <div class="image-info">
        <h1>${esc(img.title_he)}</h1>
        <div class="subtitle">${esc(img.title_en || '')}</div>
        <div class="badge-row">${badgesFor(img, { size: true })}</div>
        <p class="main-text">${esc(img.text?.main_he || '')}</p>
        ${img.text?.deep_he ? `<details class="deep"><summary>${icon('chevron')} לעומק</summary><div class="deep-body"><p>${esc(img.text.deep_he)}</p></div></details>` : ''}
        ${img.text?.fun_fact_he ? `<div class="info-card funfact"><h2>${icon('bulb')} הידעת?</h2><p style="margin:0">${esc(img.text.fun_fact_he)}</p></div>` : ''}
        <div class="info-card"><h2>${icon('camera')} איך צולם?</h2>
          <dl class="facts">
            <dt>מיקרוסקופ</dt><dd><span class="badge badge-${img.microscope}"><span class="dot"></span>${esc(m.he || img.microscope)}</span></dd>
            <dt>טכניקה</dt><dd><a href="microscopes.html${DEV ? '?dev=1' : ''}#tech-${img.technique}">${esc(tech?.name_he || img.technique)}</a>${tech?.how_he ? `<br><span class="muted" style="font-size:.92rem">${esc(tech.how_he)}</span>` : ''}</dd>
            ${img.magnification ? `<dt>הגדלה</dt><dd><span class="ltr">${esc(img.magnification)}</span> (משוערת)</dd>` : ''}
            <dt>צבע</dt><dd>${esc(colorLine)}</dd>
          </dl>
        </div>
        ${sizeComparison(img)}
        ${pairs.length ? `<div class="info-card"><h2>${icon('split')} ${pairs.every((p) => p.microscope === img.microscope) ? 'אותו נושא, טכניקה אחרת' : 'אותו נושא, מיקרוסקופ אחר'}</h2>
          <p style="margin:0">${pairs.map((p) => `<a href="image.html?id=${p.id}${dev}">${esc(p.title_he)}</a> (${esc(MICROSCOPE[p.microscope]?.short || '')})`).join(' · ')}
          ${pairs.some((p) => p.microscope !== img.microscope) ? `· <a href="microscopes.html${DEV ? '?dev=1' : ''}#pairs">להשוואה עם סליידר</a>` : ''}</p></div>` : ''}
        <div class="pager">
          <a class="btn btn-sm" href="image.html?id=${prev.id}${dev}" rel="prev">${icon('chevronR')} הקודמת</a>
          <a class="btn btn-sm" href="image.html?id=${next.id}${dev}" rel="next">הבאה ${icon('chevronL')}</a>
        </div>
      </div>
    </article>
    ${related.length ? `<section class="related" aria-labelledby="rel-title"><h2 id="rel-title">עוד בנושא</h2><div class="img-grid">${related.map(cardHTML).join('')}</div></section>` : ''}
  `;
  setupViewer(root, img);
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, .viewer')) return;
    if (e.key === 'ArrowLeft') location.href = `image.html?id=${next.id}${dev}`;
    if (e.key === 'ArrowRight') location.href = `image.html?id=${prev.id}${dev}`;
  });
}
main().catch((e) => { console.error(e); document.getElementById('image-root').innerHTML = '<div class="loading">לא הצלחנו לטעון את התמונה.</div>'; });
