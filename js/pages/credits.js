import { escAttr, loadJSON, getImages, esc, DEV } from '../common.js';

const dev = DEV ? '&dev=1' : '';
const licCell = (l) => (l.url ? `<a href="${escAttr(l.url)}" rel="license noopener">${esc(l.name)}</a>` : esc(l.name)) + (l.kind === 'by-sa' ? '<br><span class="muted" style="font-size:.85rem">שיתוף זהה</span>' : '');
const srcCell = (l) => `<a href="${escAttr(l.source_url)}" rel="noopener">Wikimedia Commons</a><br><span class="muted ltr" style="font-size:.85rem">${esc(l.modifications || '')}</span>`;

async function main() {
  const [images, timeline] = await Promise.all([getImages(), loadJSON('timeline').catch(() => [])]);
  document.getElementById('rows').innerHTML = images.map((im) => `<tr>
    <td><a href="image.html?id=${im.id}${dev}"><img src="img/micro/${im.id}-400.webp" alt="" loading="lazy"></a></td>
    <td><a href="image.html?id=${im.id}${dev}">${esc(im.title_he)}</a><br><span class="muted ltr" style="font-size:.85rem">${esc(im.title_en || '')}</span></td>
    <td><bdi>${esc(im.license.author || 'לא ידוע')}</bdi></td>
    <td>${licCell(im.license)}</td>
    <td>${srcCell(im.license)}</td></tr>`).join('');
  const tl = timeline.filter((e) => e.image);
  document.getElementById('rows-tl').innerHTML = tl.map((e) => `<tr>
    <td><img src="${e.image.src}-400.webp" alt="" loading="lazy"></td>
    <td><a href="history.html#${escAttr(e.key)}">${esc(e.year_label || e.year)} · ${esc(e.title_he)}</a></td>
    <td><bdi>${esc(e.image.license.author || 'לא ידוע')}</bdi></td>
    <td>${licCell(e.image.license)}</td>
    <td>${srcCell(e.image.license)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">אין</td></tr>';
  const kinds = images.reduce((a, x) => ((a[x.license.kind] = (a[x.license.kind] || 0) + 1), a), {});
  document.getElementById('summary').textContent = `${images.length} תמונות בגלריה: ${kinds.pd || 0} בנחלת הכלל או CC0, ${kinds.by || 0} ב-CC BY, ${kinds['by-sa'] || 0} ב-CC BY-SA. ועוד ${tl.length} תמונות בציר הזמן.`;
}
main().catch((e) => { console.error(e); document.getElementById('rows').innerHTML = '<tr><td colspan="5">לא הצלחנו לטעון את הנתונים.</td></tr>'; });
