import { getImages, getCategories, imgTag, imgSrc, imgSrcset, esc, icon, dayIndex, badgesFor, DEV } from '../common.js';

const dev = DEV ? '&dev=1' : '';
const devQ = DEV ? '?dev=1' : '';

const GATES = [
  { href: 'gallery.html', icon: 'grid', title: 'גלריה', text: 'עשרות תצלומים, כל אחד עם הסבר.', color: 'var(--brand)', cat: null },
  { href: 'scale.html', icon: 'scale', title: 'מסע בגדלים', text: 'מהמילימטר ועד הננומטר, בגלילה אחת.', color: 'var(--probe)' },
  { href: 'microscopes.html', icon: 'split', title: 'אור או אלקטרונים?', text: 'שני עולמות, ואיך כל אחד מהם רואה.', color: 'var(--electron)' },
  { href: 'quiz.html', icon: 'quiz', title: 'חידון', text: 'מה זה? מי יותר קטן? בדקו את עצמכם.', color: 'var(--ok)' },
  { href: 'history.html', icon: 'history', title: 'היסטוריה', text: 'מהפרעוש של הוק ועד נובל 2017.', color: 'var(--light)' },
];

async function main() {
  const [images, cats] = await Promise.all([getImages(), getCategories()]);
  if (!images.length) return;

  // Hero: random among featured (fallback: first electron+light images)
  let featured = images.filter((x) => x.featured);
  if (featured.length < 2) featured = images.filter((x) => (x.width || 0) >= 1200).slice(0, 5);
  const hero = featured[Math.floor(Math.random() * featured.length)];
  const media = document.getElementById('hero-media');
  media.innerHTML = `<img src="${imgSrc(hero, 1920)}" srcset="${imgSrcset(hero)}" sizes="100vw" alt="" fetchpriority="high">`;
  const hi = media.querySelector('img');
  const show = () => hi.classList.add('loaded');
  hi.complete ? show() : hi.addEventListener('load', show);
  const cap = document.getElementById('hero-caption');
  cap.href = `image.html?id=${hero.id}${dev}`;
  cap.innerHTML = `${badgesFor(hero)}<span>ברקע: ${esc(hero.title_he)}</span>`;

  // Gates (small background image per gate)
  const pick = (pred) => images.find(pred) || images[0];
  const gateImgs = [
    pick((x) => x.featured),
    pick((x) => x.microscope === 'electron' && x.scale?.subject_size_m < 1e-6),
    pick((x) => x.pair_id),
    pick((x) => x.quiz?.difficulty === 'easy' && x.microscope === 'light'),
    pick((x) => x.category === 'history'),
  ];
  document.getElementById('gates').innerHTML = GATES.map((g, i) => `
    <a class="gate" href="${g.href}${devQ}" style="--gate:${g.color}">
      <span class="gate-icon">${icon(g.icon)}</span>
      <h3>${g.title}</h3><p>${g.text}</p>
      <img class="gate-bg" src="${imgSrc(gateImgs[i], 400)}" alt="" loading="lazy">
    </a>`).join('');

  // Image of the day
  const iotd = images[dayIndex(images.length)];
  document.getElementById('iotd').innerHTML = `
    <a class="media" href="image.html?id=${iotd.id}${dev}" aria-label="${esc(iotd.title_he)}">${imgTag(iotd, { sizes: '(max-width: 760px) 100vw, 640px', w: 1200 })}</a>
    <div class="body">
      <div class="badge-row">${badgesFor(iotd, { size: true })}</div>
      <h3 style="font-size:1.6rem">${esc(iotd.title_he)}</h3>
      <p>${esc(iotd.text?.main_he || '')}</p>
      ${iotd.text?.fun_fact_he ? `<p class="muted"><b>הידעת?</b> ${esc(iotd.text.fun_fact_he)}</p>` : ''}
      <div><a class="btn btn-sm" href="image.html?id=${iotd.id}${dev}">לתמונה המלאה ${icon('chevronL')}</a></div>
    </div>`;

  // Category tiles
  document.getElementById('cat-strip').innerHTML = cats.map((c) => {
    const inCat = images.filter((x) => x.category === c.id);
    if (!inCat.length) return '';
    const im = inCat[dayIndex(inCat.length, new Date(Date.now() + 864e5 * c.id.length))];
    return `<a class="cat-tile" href="gallery.html?cat=${c.id}${dev}">
      <img src="${imgSrc(im, 400)}" alt="" loading="lazy"><span>${esc(c.short_he)} <small class="muted" style="color:#ccc">· ${inCat.length}</small></span></a>`;
  }).join('');
}

main().catch((e) => {
  console.error(e);
  document.getElementById('iotd').innerHTML = '<div class="loading">לא הצלחנו לטעון את התמונות.</div>';
});
