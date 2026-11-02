#!/usr/bin/env node
/**
 * inject-home-alaune.mjs — ajoute un article à la section "À la une" de index.html.
 *
 * Insère un .rv-une-item en TÊTE de .rv-une (le plus récent d'abord) et garde au plus
 * MAX articles (retire les plus anciens en fin de liste). Idempotent. Le premier
 * s'affiche en vedette, les suivants en liste numérotée (assets/accueil.css).
 * Lit drafts/<slug>.md (titre, description, duree, categorie, published).
 *
 * Usage : node scripts/blog/inject-home-alaune.mjs <slug> [--date=YYYY-MM-DD] [--dry]
 *   --dry : affiche l'article tel qu'il serait inséré, sans écrire index.html.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAX = 5; // une vedette + quatre en liste
const MOIS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const dry = args.includes('--dry');
if (!slug) { console.error('Usage : inject-home-alaune.mjs <slug> [--date=…] [--dry]'); process.exit(2); }

const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
// Espaces insécables du français : jamais de « ? » ou de « : » seul en début de ligne.
const typo = s => String(s || '').replace(/\s+([?!:;»])/g, ' $1').replace(/«\s+/g, '« ');

const fm = matter(await readFile(path.join(ROOT, 'drafts', `${slug}.md`), 'utf8')).data || {};
const date = opt('date', fm.published || new Date().toISOString().slice(0, 10));
const [y, m, d] = date.split('-').map(Number);
const titre = typo(String(fm.titre || slug).trim().replace(/\.+$/, ''));
const resume = typo(String(fm.description || '').trim());
const duree = (String(fm.duree || '').match(/\d+/) || ['8'])[0] + ' min';
const cat = fm.categorie || 'Décryptage';

const item = `      <a class="rv-une-item" href="articles/${slug}" data-published="${date}">
        <span class="rv-une-meta">${esc(cat)} · ${d} ${MOIS[m - 1]} ${y} · ${duree}</span>
        <span class="rv-une-titre">${esc(titre)}</span>
        <span class="rv-une-resume">${esc(resume)}</span>
        <span class="rv-une-lire">Lire l'article <span class="rv-une-rond">→</span></span>
      </a>`;

const file = path.join(ROOT, 'index.html');
let h = await readFile(file, 'utf8');

if (new RegExp(`href="articles/${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*data-published`).test(h)) {
  console.error(`• déjà dans "À la une" : ${slug} (aucune insertion)`);
  process.exit(0);
}

const anchor = '<div class="rv-une">\n';
if (!h.includes(anchor)) { console.error('✗ ancre .rv-une introuvable dans index.html'); process.exit(1); }
h = h.replace(anchor, anchor + '\n' + item + '\n');

// trim : garde les MAX premiers (les plus récents, le neuf est en tête)
const itemRe = /\n? *<a class="rv-une-item[\s\S]*?<\/a>\n?/g;
const matches = [...h.matchAll(itemRe)];
if (matches.length > MAX) {
  // supprime au-delà de MAX (de la fin vers MAX+1, pour ne pas décaler les index)
  for (let i = matches.length - 1; i >= MAX; i--) {
    h = h.slice(0, matches[i].index) + h.slice(matches[i].index + matches[i][0].length);
  }
  console.error(`  trim : ${matches.length} → ${MAX} articles`);
}

if (dry) {
  console.log(item);
  console.error(`(--dry) "À la une" : ${slug} serait ajouté en tête, index.html non modifié`);
  process.exit(0);
}
await writeFile(file, h, 'utf8');
console.error(`✓ "À la une" : ${slug} ajouté en tête`);
