import { getImages, getCategories, getTechniques, cardHTML, icon, esc, MICROSCOPE } from '../common.js';

const state = { q: '', cat: new Set(), micro: new Set(), tech: new Set(), sort: 'topic' };
let images = [], cats = [], techs = [];

function readURL() {
  const p = new URLSearchParams(location.search);
  state.q = p.get('q') || '';
  for (const k of ['cat', 'micro', 'tech']) state[k] = new Set((p.get(k) || '').split(',').filter(Boolean));
  state.sort = p.get('sort') || 'topic';
}
function writeURL() {
  const p = new URLSearchParams(location.search);
  for (const k of ['cat', 'micro', 'tech']) state[k].size ? p.set(k, [...state[k]].join(',')) : p.delete(k);
  state.q ? p.set('q', state.q) : p.delete('q');
  state.sort !== 'topic' ? p.set('sort', state.sort) : p.delete('sort');
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

const norm = (s) => String(s || '').toLowerCase().replace(/[֑-ׇ]/g, '');

function matches(img, skip) {
  if (skip !== 'cat' && state.cat.size && !state.cat.has(img.category)) return false;
  if (skip !== 'micro' && state.micro.size && !state.micro.has(img.microscope)) return false;
  if (skip !== 'tech' && state.tech.size && !state.tech.has(img.technique)) return false;
  if (state.q) {
    const hay = norm([img.title_he, img.title_en, ...(img.tags || []), techName(img.technique), catName(img.category)].join(' '));
    if (!norm(state.q).split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}
const techName = (k) => techs.find((t) => t.key === k)?.name_he || k;
const catName = (k) => cats.find((c) => c.id === k)?.short_he || k;

function chip(group, value, label, count, extra = '') {
  const on = state[group].has(value);
  return `<button type="button" class="chip" data-g="${group}" data-v="${value}" aria-pressed="${on}" ${extra}${!count && !on ? ' disabled style="opacity:.45"' : ''}>${esc(label)} <span class="count">${count}</span></button>`;
}

function renderChips() {
  const count = (group, val) => images.filter((x) => matches(x, group) && (group === 'cat' ? x.category : group === 'micro' ? x.microscope : x.technique) === val).length;
  document.getElementById('f-micro').innerHTML = Object.keys(MICROSCOPE)
    .filter((k) => images.some((x) => x.microscope === k))
    .map((k) => chip('micro', k, MICROSCOPE[k].short, count('micro', k), `data-m="${k}"`)).join('');
  document.getElementById('f-cat').innerHTML = cats
    .filter((c) => images.some((x) => x.category === c.id))
    .map((c) => chip('cat', c.id, c.short_he, count('cat', c.id))).join('');
  const usedTech = techs.filter((t) => images.some((x) => x.technique === t.key));
  for (const k of new Set(images.map((x) => x.technique))) if (!usedTech.find((t) => t.key === k)) usedTech.push({ key: k, name_he: k });
  document.getElementById('f-tech').innerHTML = usedTech.map((t) => chip('tech', t.key, t.short_he || t.name_he, count('tech', t.key))).join('');
}

function render() {
  let list = images.filter((x) => matches(x));
  const catOrder = cats.map((c) => c.id);
  if (state.sort === 'topic') list.sort((a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category) || (b.scale?.subject_size_m || 0) - (a.scale?.subject_size_m || 0));
  else {
    const dir = state.sort === 'size-asc' ? 1 : -1;
    list.sort((a, b) => dir * ((a.scale?.subject_size_m || 0) - (b.scale?.subject_size_m || 0)));
  }
  const grid = document.getElementById('grid');
  grid.innerHTML = list.length ? list.map(cardHTML).join('') : `<div class="empty" style="grid-column:1/-1">${icon('search')}<p>לא מצאנו תמונות שמתאימות לכל המסננים.</p><button class="btn btn-sm" type="button" data-clear>ניקוי המסננים</button></div>`;
  const active = state.cat.size + state.micro.size + state.tech.size + (state.q ? 1 : 0);
  document.getElementById('count').textContent = `${list.length} תמונות${active ? ` · ${active} מסננים פעילים` : ''}`;
  document.getElementById('open-filters').innerHTML = `${icon('filter')} סינון${active ? ` (${active})` : ''}`;
  renderChips();
  writeURL();
}

function setDrawer(open) {
  document.getElementById('filters').classList.toggle('open', open);
  document.getElementById('scrim').classList.toggle('open', open);
  document.getElementById('open-filters').setAttribute('aria-expanded', open);
  if (open) document.getElementById('close-filters').focus();
}

function clearAll() {
  state.cat.clear(); state.micro.clear(); state.tech.clear(); state.q = '';
  document.getElementById('q').value = '';
  render();
}

async function main() {
  readURL();
  [images, cats, techs] = await Promise.all([getImages(), getCategories(), getTechniques().catch(() => [])]);
  document.getElementById('search-ico').outerHTML = icon('search');
  document.getElementById('close-filters').innerHTML = icon('x');
  const q = document.getElementById('q');
  q.value = state.q;
  document.getElementById('sort').value = state.sort;
  let t;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = q.value.trim(); render(); }, 150); });
  document.getElementById('sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  document.getElementById('filters').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const set = state[b.dataset.g];
    set.has(b.dataset.v) ? set.delete(b.dataset.v) : set.add(b.dataset.v);
    render();
  });
  document.getElementById('clear').addEventListener('click', clearAll);
  document.getElementById('grid').addEventListener('click', (e) => { if (e.target.closest('[data-clear]')) clearAll(); });
  document.getElementById('open-filters').addEventListener('click', () => setDrawer(true));
  document.getElementById('close-filters').addEventListener('click', () => setDrawer(false));
  document.getElementById('apply-filters').addEventListener('click', () => setDrawer(false));
  document.getElementById('scrim').addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });
  render();
}
main().catch((e) => { console.error(e); document.getElementById('grid').innerHTML = '<div class="loading">לא הצלחנו לטעון את התמונות.</div>'; });
