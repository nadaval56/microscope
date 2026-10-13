import { getImages, getTechniques, imgTag, imgSrc, esc, icon, MICROSCOPE, DEV } from '../common.js';

const dev = DEV ? '&dev=1' : '';

function compareHTML(a, b, la, lb, gray = false) {
  return `<div class="compare" style="--pos:50%">
    <img class="${gray ? 'before-gray' : ''}" src="${imgSrc(a, 1200)}" alt="${esc(a.title_he)}${gray ? ' בגווני אפור' : ''}" loading="lazy">
    <img class="after" src="${imgSrc(b, 1200)}" alt="${esc(b.title_he)}" loading="lazy">
    <span class="handle"></span>
    <span class="lbl l">${la}</span><span class="lbl r">${lb}</span>
    <input type="range" min="0" max="100" value="50" aria-label="הזזת קו ההשוואה">
  </div>`;
}
function wireCompare(scope) {
  scope.querySelectorAll('.compare').forEach((c) => {
    const r = c.querySelector('input');
    r.addEventListener('input', () => c.style.setProperty('--pos', `${r.value}%`));
  });
}

async function main() {
  const [images, techs] = await Promise.all([getImages(), getTechniques()]);
  const byTech = (k) => images.filter((x) => x.technique === k).sort((a, b) => b.featured - a.featured)[0];

  const lightSample = images.find((x) => x.microscope === 'light' && x.featured) || images.find((x) => x.microscope === 'light');
  const elSample = images.find((x) => x.microscope === 'electron' && x.featured) || images.find((x) => x.microscope === 'electron');
  for (const [id, im] of [['sample-light', lightSample], ['sample-electron', elSample]]) {
    if (im) document.getElementById(id).innerHTML = `<a href="image.html?id=${im.id}${dev}">${imgTag(im, { sizes: '(max-width: 760px) 100vw, 560px', w: 1200 })}</a>`;
  }

  // Colorization demo: a colourised SEM image vs. its greyscale version
  const col = images.filter((x) => x.microscope === 'electron' && x.colorized && x.technique === 'sem');
  const cimg = col.find((x) => x.featured) || col[0];
  if (cimg) {
    const fig = document.getElementById('colorize-fig');
    fig.innerHTML = compareHTML(cimg, cimg, 'גווני אפור', 'צבע מלאכותי', true)
      + `<figcaption style="padding:12px 16px 16px" class="muted">${esc(cimg.title_he)}. הגרסה האפורה נוצרה כאן בדפדפן מהתמונה הצבועה. <a href="image.html?id=${cimg.id}${dev}">לתמונה</a></figcaption>`;
    // the greyscale side should be on the left: the clipped (.after) layer shows the right part
    wireCompare(fig);
  }

  // Pairs
  const groups = {};
  for (const im of images) if (im.pair_id) (groups[im.pair_id] ||= []).push(im);
  const pairsGrid = document.getElementById('pairs-grid');
  const cards = Object.values(groups).map((g) => {
    const l = g.find((x) => x.microscope === 'light') || g.find((x) => x.microscope !== 'electron');
    const e = g.find((x) => x.microscope === 'electron');
    if (!l || !e) return '';
    return `<figure class="card pair-card" style="margin:0">
      ${compareHTML(e, l, 'אלקטרונים', 'אור')}
      <figcaption>
        <div class="legend">
          <a href="image.html?id=${l.id}${dev}"><span class="badge badge-light"><span class="dot"></span>אור</span> ${esc(l.title_he)}</a>
          <a href="image.html?id=${e.id}${dev}"><span class="badge badge-electron"><span class="dot"></span>אלקטרונים</span> ${esc(e.title_he)}</a>
        </div>
      </figcaption>
    </figure>`;
  }).filter(Boolean);
  pairsGrid.innerHTML = cards.join('') || '<p class="muted">עוד אין זוגות תמונות.</p>';
  wireCompare(pairsGrid);

  // Techniques
  document.getElementById('tech-grid').innerHTML = techs.map((t) => {
    const ex = byTech(t.key);
    const n = images.filter((x) => x.technique === t.key).length;
    const mcls = t.microscope;
    return `<article class="card tech-card" id="tech-${t.key}" style="border-top:3px solid var(--${mcls === 'illustration' ? 'illus' : mcls})">
      <div class="tc-img">${ex ? `<a href="image.html?id=${ex.id}${dev}">${imgTag(ex, { sizes: '(max-width: 700px) 100vw, 380px', alt: `דוגמה: ${ex.title_he}` })}</a>` : `<div class="ph">${icon(t.microscope === 'electron' ? 'bolt' : t.microscope === 'probe' ? 'atom' : 'micro')}</div>`}</div>
      <div class="tc-body">
        <span class="badge badge-${mcls}" style="align-self:flex-start"><span class="dot"></span>${esc(MICROSCOPE[mcls]?.short || '')}</span>
        <h3>${esc(t.name_he)}</h3>
        <div class="en">${esc(t.name_en || '')}</div>
        <p style="margin:0"><b>איך:</b> ${esc(t.how_he)}</p>
        <p style="margin:0"><b>למה:</b> ${esc(t.why_he)}</p>
        ${t.deep_he ? `<details class="deep"><summary>${icon('chevron')} לעומק</summary><div class="deep-body"><p style="margin:0">${esc(t.deep_he)}</p></div></details>` : ''}
        <div class="who">${[t.inventor_he, t.year_label || t.year].filter(Boolean).map(esc).join(' · ')}${t.nobel_he ? `<br>🏅 ${esc(t.nobel_he)}` : ''}
        ${n ? `<br><a href="gallery.html?tech=${t.key}${dev}">${n} תמונות בגלריה</a>` : ''}</div>
      </div>
    </article>`;
  }).join('');
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}
main().catch((e) => console.error(e));
