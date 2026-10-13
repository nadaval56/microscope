import { escAttr, loadJSON, esc, icon } from '../common.js';

const TYPES = { instrument: 'מכשירים', discovery: 'תגליות', nobel: 'פרסי נובל', photography: 'צילום' };
let events = [];
let filter = 'all';

function itemHTML(ev) {
  const img = ev.image;
  const tall = img && img.height > img.width * 1.1;
  const srcset = img ? img.widths.map((w) => `${img.src}-${w}.webp ${Math.min(w, img.width)}w`).join(', ') : '';
  const lic = img?.license;
  return `<article class="tl-item type-${ev.track === 'photography' ? 'photography' : ev.type} ${tall ? 'tall' : ''} fade-in" id="${escAttr(ev.key)}">
    <div class="card">
      ${img ? `<div class="tl-img"><img src="${img.src}-${img.widths[img.widths.length - 1]}.webp" srcset="${srcset}" sizes="(max-width: 760px) 100vw, 560px" alt="${esc(img.alt_he)}" loading="lazy" width="${img.width}" height="${img.height}"></div>` : ''}
      <div class="tl-body">
        <div class="tl-year">${esc(ev.year_label || ev.year)}${ev.track === 'photography' ? '<span class="tl-track">מסלול הצילום</span>' : ''}</div>
        <h3>${esc(ev.title_he)}</h3>
        <p>${esc(ev.text_he)}</p>
        ${ev.disputed && ev.dispute_note_he ? `<div class="dispute">${icon('info').replace('<svg', '<svg style="width:15px;height:15px;display:inline;vertical-align:-2px"')} ${esc(ev.dispute_note_he)}</div>` : ''}
      </div>
      ${lic ? `<div class="tl-credit">תמונה: <bdi>${esc(lic.author || 'לא ידוע')}</bdi> · ${lic.url ? `<a href="${escAttr(lic.url)}" rel="license noopener">${esc(lic.name)}</a>` : esc(lic.name)} · <a href="${escAttr(lic.source_url)}" rel="noopener">Wikimedia Commons</a></div>` : ''}
    </div>
  </article>`;
}

function render() {
  const list = events.filter((ev) => filter === 'all' || (filter === 'photography' ? ev.track === 'photography' : ev.type === filter && ev.track !== 'photography'));
  const tl = document.getElementById('timeline');
  if (!list.length) { tl.innerHTML = '<p class="muted">אין אירועים.</p>'; }
  else if (matchMedia('(max-width: 760px)').matches) {
    tl.innerHTML = `<div class="tl-col">${list.map(itemHTML).join('')}</div>`;
  } else {
    // two balanced columns, filled in year order (light masonry)
    const cols = [[], []], h = [0, 0.6];
    for (const ev of list) { const c = h[0] <= h[1] ? 0 : 1; cols[c].push(ev); h[c] += ev.image ? 2.3 : 1; }
    tl.innerHTML = cols.map((c) => `<div class="tl-col">${c.map(itemHTML).join('')}</div>`).join('');
  }
  document.getElementById('tl-filters').innerHTML = [['all', 'הכול'], ...Object.entries(TYPES)]
    .map(([k, v]) => `<button type="button" class="chip" data-f="${k}" aria-pressed="${filter === k}">${v}</button>`).join('');
  if (!document.getElementById('abbe')) {
    const a = list.find((ev) => /אבה|abbe/i.test(ev.title_he + ev.key));
    if (a) document.getElementById(a.key).insertAdjacentHTML('afterbegin', '<span id="abbe"></span>');
  }
}

async function main() {
  events = (await loadJSON('timeline')).slice().sort((a, b) => a.year - b.year);
  document.getElementById('tl-filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    filter = b.dataset.f;
    render();
  });
  render();
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}
addEventListener('resize', () => { clearTimeout(render.t); render.t = setTimeout(render, 200); });
main().catch((e) => { console.error(e); document.getElementById('timeline').innerHTML = '<p class="muted">לא הצלחנו לטעון את ציר הזמן.</p>'; });
