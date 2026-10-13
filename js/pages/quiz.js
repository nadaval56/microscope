import { getImages, imgSrc, esc, icon, shuffle, store, MICROSCOPE, reducedMotion, DEV } from '../common.js';

const ROUND = 10;
const GENERIC_ALT = 'תמונת מיקרוסקופ לזיהוי';
const MODES = {
  what: { title: 'מה זה?', text: 'תמונה וארבע תשובות. המצב הקלאסי.', icon: 'quiz', max: 1 },
  le: { title: 'אור או אלקטרונים?', text: 'באיזה מיקרוסקופ צולמה התמונה?', icon: 'split', max: 1 },
  small: { title: 'מי יותר קטן?', text: 'שתי תמונות. מי מהן קטנה יותר במציאות?', icon: 'scale', max: 1 },
  zoom: { title: 'זום אאוט', text: 'התמונה נחשפת לאט. עונים מוקדם, מקבלים יותר נקודות.', icon: 'eye', max: 5 },
};
const LEVELS = { easy: 'קל', medium: 'בינוני', expert: 'מומחה' };
const ZOOM_STEPS = [7, 4.2, 2.6, 1.6, 1];
const ZOOM_BLUR = [14, 8, 4, 1.5, 0];

let images = [];
let cfg = { mode: store.get('quiz-mode', 'what'), level: store.get('quiz-level', 'easy') };
let round = null;
const root = () => document.getElementById('quiz-root');
const dev = DEV ? '&dev=1' : '';

/* --------------------------------------------------------------- pools */
function levelPool(pool) {
  const by = (lv) => pool.filter((x) => (x.quiz?.difficulty || 'medium') === lv);
  const order = { easy: ['easy', 'medium', 'expert'], medium: ['medium', 'easy', 'expert'], expert: ['expert', 'medium', 'easy'] }[cfg.level];
  let out = [];
  for (const lv of order) { if (out.length >= ROUND) break; out = out.concat(shuffle(by(lv))); }
  return out;
}

function optionsFor(img) {
  const answer = img.quiz?.answer_he || img.title_he;
  let ds = (img.quiz?.distractors_he || []).filter((d) => d && d !== answer).slice(0, 3);
  if (ds.length < 3) {
    // emergency fallback: titles from the same category and a similar size
    const s = img.scale?.subject_size_m || 1e-5;
    const near = images.filter((x) => x.id !== img.id && x.category === img.category)
      .sort((a, b) => Math.abs(Math.log10((a.scale?.subject_size_m || 1e-5) / s)) - Math.abs(Math.log10((b.scale?.subject_size_m || 1e-5) / s)));
    for (const x of near) { const t = x.quiz?.answer_he || x.title_he; if (ds.length < 3 && !ds.includes(t) && t !== answer) ds.push(t); }
  }
  return shuffle([{ label: answer, correct: true }, ...ds.map((d) => ({ label: d, correct: false }))]);
}

function buildRound() {
  let qs = [];
  if (cfg.mode === 'what' || cfg.mode === 'zoom') {
    qs = levelPool(images).slice(0, ROUND).map((img) => ({ img, options: optionsFor(img) }));
  } else if (cfg.mode === 'le') {
    const pool = images.filter((x) => x.microscope === 'light' || x.microscope === 'electron');
    qs = levelPool(pool).slice(0, ROUND).map((img) => ({
      img,
      options: [{ label: 'מיקרוסקופ אור', key: 'light', correct: img.microscope === 'light' }, { label: 'מיקרוסקופ אלקטרונים', key: 'electron', correct: img.microscope === 'electron' }],
    }));
  } else {
    const pool = images.filter((x) => x.scale?.subject_size_m);
    const minRatio = { easy: 8, medium: 3, expert: 1.6 }[cfg.level];
    const used = new Set();
    for (const a of shuffle(pool)) {
      if (qs.length >= ROUND) break;
      if (used.has(a.id)) continue;
      const b = shuffle(pool).find((x) => !used.has(x.id) && x.id !== a.id && x.category !== 'history' && Math.max(x.scale.subject_size_m, a.scale.subject_size_m) / Math.min(x.scale.subject_size_m, a.scale.subject_size_m) >= minRatio && (cfg.level !== 'expert' || Math.max(x.scale.subject_size_m, a.scale.subject_size_m) / Math.min(x.scale.subject_size_m, a.scale.subject_size_m) < 12));
      if (!b || a.category === 'history') continue;
      used.add(a.id); used.add(b.id);
      qs.push({ pair: shuffle([a, b]) });
    }
  }
  return { qs, i: 0, score: 0, answered: false, stage: 0, timer: null };
}

/* ---------------------------------------------------------------- views */
function renderSetup() {
  const best = (m, l) => store.get(`best:${m}:${l}`, null);
  root().innerHTML = `
    <div class="page-head" style="padding-bottom:8px">
      <span class="eyebrow">חידון</span>
      <h1>מה רואים כאן?</h1>
      <p>עשר שאלות בכל סבב, בלי הרשמה. בחרו סוג משחק ורמת קושי.</p>
    </div>
    <h2 style="font-size:1.1rem" id="mode-h">סוג משחק</h2>
    <div class="mode-grid" role="group" aria-labelledby="mode-h">
      ${Object.entries(MODES).map(([k, m]) => `<button type="button" class="mode-card" data-mode="${k}" aria-pressed="${cfg.mode === k}">
        <span class="mi">${icon(m.icon)}</span><span><h3>${m.title}${k === 'zoom' ? ' <span class="badge">בונוס</span>' : ''}</h3><p>${m.text}</p></span></button>`).join('')}
    </div>
    <h2 style="font-size:1.1rem;margin-top:22px" id="lvl-h">רמת קושי</h2>
    <div class="seg" role="group" aria-labelledby="lvl-h">
      ${Object.entries(LEVELS).map(([k, v]) => `<button type="button" data-level="${k}" aria-pressed="${cfg.level === k}">${v}</button>`).join('')}
    </div>
    <p class="muted" id="best-line" style="margin-top:14px"></p>
    <button class="btn btn-primary" id="start" type="button" style="margin-top:6px;min-width:200px;font-size:1.1rem">יאללה, מתחילים!</button>
  `;
  const upd = () => {
    const b = best(cfg.mode, cfg.level);
    document.getElementById('best-line').innerHTML = b !== null ? `${icon('trophy').replace('<svg', '<svg style="width:18px;height:18px;display:inline;vertical-align:-3px"')} השיא שלכם במצב הזה: <b>${b}</b> מתוך ${ROUND * MODES[cfg.mode].max}` : 'עוד לא שיחקתם במצב הזה.';
  };
  upd();
  root().querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    cfg.mode = b.dataset.mode; store.set('quiz-mode', cfg.mode);
    root().querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', x === b)); upd();
  }));
  root().querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => {
    cfg.level = b.dataset.level; store.set('quiz-level', cfg.level);
    root().querySelectorAll('[data-level]').forEach((x) => x.setAttribute('aria-pressed', x === b)); upd();
  }));
  document.getElementById('start').addEventListener('click', start);
}

function start() {
  round = buildRound();
  if (!round.qs.length) { root().insertAdjacentHTML('beforeend', '<p class="muted">אין מספיק תמונות למצב הזה.</p>'); return; }
  renderQuestion();
}

function topBar() {
  const n = round.qs.length;
  return `<div class="quiz-top">
    <button class="btn btn-sm" type="button" id="quit">${icon('x')} יציאה</button>
    <span class="muted" style="font-family:var(--font-head);font-weight:600">שאלה ${round.i + 1} מתוך ${n}</span>
    <div class="progress" aria-hidden="true"><span style="width:${(round.i / n) * 100}%"></span></div>
    <span style="font-family:var(--font-head);font-weight:700">ניקוד: ${round.score}</span>
  </div>`;
}

function renderQuestion() {
  clearInterval(round.timer);
  round.answered = false;
  round.stage = 0;
  const q = round.qs[round.i];
  let html = topBar();
  if (cfg.mode === 'small') {
    html += `<p class="q-text">מי מהשניים קטן יותר במציאות?</p>
      <div class="q-two">${q.pair.map((im, k) => `<button type="button" data-k="${k}" aria-label="${esc(im.quiz?.answer_he || im.title_he)}">
        <img src="${imgSrc(im, 400)}" alt="" ><span class="cap">${esc(im.quiz?.answer_he || im.title_he)}</span></button>`).join('')}</div>`;
  } else {
    const zoom = cfg.mode === 'zoom';
    html += `<div class="q-image ${zoom ? 'zoomer' : ''}"><img src="${imgSrc(q.img, 1200)}" alt="${GENERIC_ALT}" id="q-img"></div>`;
    if (zoom) html += `<div class="reveal-meter" aria-hidden="true">${ZOOM_STEPS.map((_, k) => `<span class="${k === 0 ? 'on' : ''}"></span>`).join('')}</div>`;
    html += `<p class="q-text">${cfg.mode === 'le' ? 'באיזה מיקרוסקופ זה צולם?' : 'מה רואים בתמונה?'}${zoom ? ` <span class="muted" style="font-size:1rem" id="pts-left">(${MODES.zoom.max} נקודות)</span>` : ''}</p>
      <div class="answers">${q.options.map((o, k) => `<button type="button" class="answer ${cfg.mode === 'le' ? `big ${o.key}-a` : ''}" data-k="${k}"><span class="muted" aria-hidden="true">${k + 1}</span> ${esc(o.label)}</button>`).join('')}</div>
      ${zoom ? `<button class="btn btn-sm" type="button" id="reveal" style="margin-top:10px">${icon('zoomOut')} חשיפה נוספת</button>` : ''}`;
  }
  html += `<div id="fb" aria-live="polite"></div>`;
  root().innerHTML = html;
  document.getElementById('quit').addEventListener('click', () => { clearInterval(round.timer); renderSetup(); });
  root().querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => answer(+b.dataset.k)));
  if (cfg.mode === 'zoom') {
    const img = document.getElementById('q-img');
    const ox = 30 + Math.random() * 40, oy = 30 + Math.random() * 40;
    img.style.transformOrigin = `${ox}% ${oy}%`;
    setStage(0);
    document.getElementById('reveal').addEventListener('click', () => setStage(round.stage + 1));
    round.timer = setInterval(() => { if (round.stage < ZOOM_STEPS.length - 1) setStage(round.stage + 1); else clearInterval(round.timer); }, reducedMotion() ? 5000 : 3500);
  }
  root().querySelector('.answer, .q-two button')?.focus({ preventScroll: true });
}

function setStage(k) {
  if (round.answered) return;
  round.stage = Math.min(k, ZOOM_STEPS.length - 1);
  const img = document.getElementById('q-img');
  img.style.transform = `scale(${ZOOM_STEPS[round.stage]})`;
  img.style.filter = `blur(${ZOOM_BLUR[round.stage]}px)`;
  root().querySelectorAll('.reveal-meter span').forEach((s, i) => s.classList.toggle('on', i <= round.stage));
  const pts = MODES.zoom.max - round.stage;
  const el = document.getElementById('pts-left');
  if (el) el.textContent = `(${pts} ${pts === 1 ? 'נקודה' : 'נקודות'})`;
  if (round.stage === ZOOM_STEPS.length - 1) document.getElementById('reveal')?.setAttribute('disabled', '');
}

function answer(k) {
  if (round.answered) return;
  round.answered = true;
  clearInterval(round.timer);
  const q = round.qs[round.i];
  let ok, img, extra = '';
  if (cfg.mode === 'small') {
    const [a, b] = q.pair;
    const smaller = a.scale.subject_size_m <= b.scale.subject_size_m ? 0 : 1;
    ok = k === smaller;
    img = q.pair[smaller];
    const other = q.pair[1 - smaller];
    root().querySelectorAll('.q-two button').forEach((btn, i) => { if (i === smaller) btn.classList.add('correct'); else if (i === k) btn.classList.add('wrong'); btn.disabled = true; });
    const ratio = other.scale.subject_size_m / img.scale.subject_size_m;
    extra = `<p style="margin:0">${esc(img.quiz?.answer_he || img.title_he)}: <b>${esc(img.scale.subject_size_label || '')}</b>. ${esc(other.quiz?.answer_he || other.title_he)}: <b>${esc(other.scale.subject_size_label || '')}</b>. ההפרש: בערך פי ${ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10}.</p>`;
  } else {
    img = q.img;
    ok = q.options[k].correct;
    root().querySelectorAll('.answer').forEach((btn, i) => { btn.disabled = true; if (q.options[i].correct) btn.classList.add('correct'); else if (i === k) btn.classList.add('wrong'); });
    const qi = document.getElementById('q-img');
    qi.alt = img.title_he;
    if (cfg.mode === 'zoom') { qi.style.transform = 'scale(1)'; qi.style.filter = 'none'; root().querySelectorAll('.reveal-meter span').forEach((s) => s.classList.add('on')); }
    document.getElementById('reveal')?.setAttribute('disabled', '');
    if (cfg.mode === 'le') extra = `<p style="margin:0 0 6px"><span class="badge badge-${img.microscope}"><span class="dot"></span>${MICROSCOPE[img.microscope].he}</span> · ${esc(img.title_he)}${img.colorized ? ' · <span class="badge badge-false">צבע מלאכותי</span>' : ''}</p>`;
  }
  const gained = ok ? (cfg.mode === 'zoom' ? MODES.zoom.max - round.stage : 1) : 0;
  round.score += gained;
  const last = round.i === round.qs.length - 1;
  const praise = ['נכון!', 'בדיוק!', 'יפה מאוד!', 'עין של מדען!', 'מצוין!'];
  document.getElementById('fb').innerHTML = `<div class="feedback ${ok ? 'good' : 'bad'}">
    <h3>${icon(ok ? 'check' : 'cross').replace('<svg', '<svg style="width:22px;height:22px"')} ${ok ? praise[Math.floor(Math.random() * praise.length)] + (gained > 1 ? ` +${gained}` : '') : `לא הפעם. התשובה: ${esc(cfg.mode === 'le' ? MICROSCOPE[img.microscope].he : cfg.mode === 'small' ? (img.quiz?.answer_he || img.title_he) : (img.quiz?.answer_he || img.title_he))}`}</h3>
    ${extra}
    ${cfg.mode !== 'small' ? `<p style="margin:0">${esc(img.text?.main_he || '')}</p>` : ''}
    <div class="row">
      <a href="image.html?id=${img.id}${dev}" target="_blank" rel="noopener">לקרוא עוד ${icon('ext').replace('<svg', '<svg style="width:14px;height:14px;display:inline;vertical-align:-2px"')}</a>
      <button class="btn btn-primary" type="button" id="next">${last ? 'לתוצאות' : 'לשאלה הבאה'} ${icon('chevronL')}</button>
    </div></div>`;
  document.getElementById('next').addEventListener('click', () => { if (last) renderEnd(); else { round.i++; renderQuestion(); } });
  document.getElementById('next').focus({ preventScroll: true });
  document.getElementById('fb').scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
}

function renderEnd() {
  const max = round.qs.length * MODES[cfg.mode].max;
  const key = `best:${cfg.mode}:${cfg.level}`;
  const prev = store.get(key, null);
  const isBest = prev === null || round.score > prev;
  if (isBest) store.set(key, round.score);
  const pct = round.score / max;
  const msg = pct === 1 ? 'מושלם! אתם רואים את העולם הזעיר כמו מומחים.'
    : pct >= 0.8 ? 'מצוין! עוד קצת ואתם עובדים במעבדה.'
    : pct >= 0.6 ? 'יפה מאוד! יש לכם עין חדה.'
    : pct >= 0.4 ? 'לא רע בכלל. עוד סיבוב בגלריה, ותשתפרו מהר.'
    : 'זו התחלה! העולם הזעיר מבלבל גם מדענים. נסו שוב, או הציצו קודם בגלריה.';
  root().innerHTML = `<div class="card card-pad" style="text-align:center;margin-top:30px">
    <span class="eyebrow">${MODES[cfg.mode].title} · ${LEVELS[cfg.level]}</span>
    <div class="score-big">${round.score}<span style="font-size:.4em;color:var(--text-3)"> / ${max}</span></div>
    <p class="lead" style="margin:14px auto">${msg}</p>
    <p class="muted">${isBest ? `${icon('trophy').replace('<svg', '<svg style="width:18px;height:18px;display:inline;vertical-align:-3px"')} שיא אישי חדש!` : `השיא שלכם: ${prev}`}</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn btn-primary" type="button" id="again">${icon('shuffle')} סבב נוסף</button>
      <button class="btn" type="button" id="menu">בחירת מצב אחר</button>
      <a class="btn" href="gallery.html${DEV ? '?dev=1' : ''}">לגלריה</a>
    </div></div>`;
  document.getElementById('again').addEventListener('click', start);
  document.getElementById('menu').addEventListener('click', renderSetup);
}

document.addEventListener('keydown', (e) => {
  if (!round || e.target.closest('input')) return;
  const n = +e.key;
  if (n >= 1 && n <= 4 && !round.answered && document.querySelector(`[data-k="${n - 1}"]`)) answer(n - 1);
});

async function main() {
  images = (await getImages()).filter((x) => x.quiz);
  renderSetup();
}
main().catch((e) => { console.error(e); root().innerHTML = '<p class="loading">לא הצלחנו לטעון את החידון.</p>'; });
