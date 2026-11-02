#!/usr/bin/env node
/**
 * translate-missing-en.mjs — rattrapage bilingue : traduit en EN tous les articles FR
 * qui n'ont pas encore de version en/articles/, puis fait toute la plomberie de parité :
 *   - carte dans en/articles.html (tableau ALL_ARTICLES, format EN)
 *   - article en tête de .rv-une ("Latest") d'en/index.html (max 5, trim auto)
 *   - hreflang sur la page FR (inject-hreflang-fr.mjs, no-op tant que l'EN n'existe pas)
 *   - sitemap-en.xml + sitemap-index.xml (build-sitemaps.mjs)
 *
 * Sémantique catch-up : appelé après chaque publication par l'autopilot, il rattrape
 * aussi les échecs des runs précédents. Idempotent. Un échec de traduction n'arrête
 * pas les autres slugs ; exit 1 si au moins un slug a échoué (l'autopilot est en
 * continue-on-error : la publication FR n'est jamais bloquée).
 *
 * Usage : node scripts/i18n/translate-missing-en.mjs [--dry-run]
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DRY = process.argv.includes('--dry-run');
const run = (script, ...args) => spawnSync('node', [path.join(ROOT, script), ...args], { cwd: ROOT, stdio: 'inherit' }).status === 0;

// ── 1. Inventaire des articles FR sans EN ──
const frSlugs = (await readdir(path.join(ROOT, 'articles')))
  .filter(f => f.endsWith('.html') && !f.startsWith('_')).map(f => f.replace('.html', ''));
const missing = frSlugs.filter(s => !existsSync(path.join(ROOT, 'en', 'articles', `${s}.html`)));

if (!missing.length) { console.error('✓ Parité FR/EN complète, rien à traduire.'); process.exit(0); }
console.error(`• ${missing.length} article(s) sans version EN : ${missing.join(', ')}`);
if (DRY) process.exit(0);

// ── helpers cartes EN ──
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STUB_BY_TYPE = { vulgarisation: 'Breakdown', tuto: 'Tutorial', makingof: 'Making-of', opinion: 'Opinion', podcast: 'Podcast' };
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const escJs = s => String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\s+/g, ' ').trim();

/** Extrait la carte FR de articles.html pour un slug (date/read/type/scene). */
function frCard(frListing, slug) {
  const re = new RegExp(`\\{\\s*slug:'${slug}'[^}]*\\}`);
  const m = frListing.match(re);
  if (!m) return null;
  const get = (k) => (m[0].match(new RegExp(`${k}:'([^']*)'`)) || [])[1];
  return { type: get('type') || 'vulgarisation', date: get('date'), read: get('read') || '8 MIN', scene: get('scene') || 'minimal' };
}

/** Titre + description depuis la page EN traduite. */
async function enMeta(slug) {
  const h = await readFile(path.join(ROOT, 'en', 'articles', `${slug}.html`), 'utf8');
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1]?.replace(/\s*[—|·-]\s*Jerwis.*$/i, '').trim() || slug;
  const desc = (h.match(/name="description" content="([^"]*)"/) || [])[1] || '';
  return { title, desc };
}

/** Carte listing en/articles.html (même format que le FR, texte EN, slug identique). */
async function injectEnCard(slug, fr) {
  const file = path.join(ROOT, 'en', 'articles.html');
  let h = await readFile(file, 'utf8');
  if (new RegExp(`slug:'${slug}'`).test(h)) { console.error(`  • carte EN déjà présente : ${slug}`); return; }
  const { title, desc } = await enMeta(slug);
  let t = title.toUpperCase(); if (!/[.!?]$/.test(t)) t += '.';
  const card = `    { slug:'${slug}', type:'${fr.type}', title:"${escJs(t)}", excerpt:"${escJs(desc)}", date:'${fr.date}', read:'${fr.read}', scene:'${fr.scene}', size:'m' },`;
  const anchor = 'const ALL_ARTICLES = [';
  const idx = h.indexOf(anchor);
  if (idx === -1) { console.error('  ✗ ancre ALL_ARTICLES introuvable dans en/articles.html'); return; }
  await writeFile(file, h.slice(0, idx + anchor.length) + '\n' + card + h.slice(idx + anchor.length), 'utf8');
  console.error(`  ✓ carte EN insérée dans en/articles.html : ${slug}`);
}

/** Article en tête de "Latest" d'en/index.html (liens absolus /en/, 5 au plus : une vedette + quatre en liste). */
async function injectEnAlaune(slug, fr) {
  const MAX = 5;
  const file = path.join(ROOT, 'en', 'index.html');
  let h = await readFile(file, 'utf8');
  if (new RegExp(`href="/en/articles/${slug}"[^>]*data-published`).test(h)) { console.error(`  • déjà en Latest EN : ${slug}`); return; }
  const { title, desc } = await enMeta(slug);
  const t = title.trim().replace(/\.+$/, '');
  const [y, m, d] = (fr.date || '').split('-').map(Number);
  const read = (fr.read.match(/\d+/) || ['8'])[0] + ' min';
  const item = `      <a class="rv-une-item" href="/en/articles/${slug}" data-published="${fr.date}">
        <span class="rv-une-meta">${STUB_BY_TYPE[fr.type] || 'Breakdown'} · ${MONTHS_EN[m - 1].slice(0, 3)} ${d}, ${y} · ${read}</span>
        <span class="rv-une-titre">${esc(t)}</span>
        <span class="rv-une-resume">${esc(desc)}</span>
        <span class="rv-une-lire">Read the article <span class="rv-une-rond">→</span></span>
      </a>`;
  const anchor = '<div class="rv-une">\n';
  if (!h.includes(anchor)) { console.error('  ✗ ancre .rv-une introuvable dans en/index.html'); return; }
  h = h.replace(anchor, anchor + '\n' + item + '\n');
  const matches = [...h.matchAll(/\n? *<a class="rv-une-item[\s\S]*?<\/a>\n?/g)];
  if (matches.length > MAX) {
    for (let i = matches.length - 1; i >= MAX; i--) h = h.slice(0, matches[i].index) + h.slice(matches[i].index + matches[i][0].length);
    console.error(`  trim Latest EN : ${matches.length} → ${MAX} articles`);
  }
  await writeFile(file, h, 'utf8');
  console.error(`  ✓ Latest EN : ${slug} ajouté en tête`);
}

// ── 2. Traduction + plomberie, slug par slug (du plus ancien au plus récent) ──
const frListing = await readFile(path.join(ROOT, 'articles.html'), 'utf8');
const failed = [];
// tri par date de carte FR croissante → l'ordre "Featured" finit du plus récent en tête
missing.sort((a, b) => ((frCard(frListing, a)?.date) || '').localeCompare((frCard(frListing, b)?.date) || ''));

for (const slug of missing) {
  console.error(`\n━━━ ${slug} ━━━`);
  if (!run('scripts/i18n/translate-article-en.mjs', slug)) { failed.push(slug); continue; }
  const fr = frCard(frListing, slug) || { type: 'vulgarisation', date: new Date().toISOString().slice(0, 10), read: '8 MIN', scene: 'minimal' };
  await injectEnCard(slug, fr);
  await injectEnAlaune(slug, fr);
  run('scripts/i18n/inject-hreflang-fr.mjs', `articles/${slug}.html`);
}

// ── 3. Sitemaps (une fois pour tout le lot) ──
if (missing.length > failed.length) run('scripts/i18n/build-sitemaps.mjs');

if (failed.length) { console.error(`\n✗ ${failed.length} échec(s) : ${failed.join(', ')} (repassera au prochain run)`); process.exit(1); }
console.error(`\n✓ Parité FR/EN rétablie : ${missing.length} article(s) traduit(s).`);
