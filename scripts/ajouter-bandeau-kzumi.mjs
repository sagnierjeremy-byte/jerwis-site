// Pose kzumi sur les pages FR (plans des 02-11-2026) : la réserve de la barre (.bk-barre-place,
// 44px juste après <body>, pour que rien ne saute au chargement) et le script assets/bandeau-kzumi.js.
// Articles : script juste après ai-summarize.js, en chemin relatif comme les autres scripts d'article.
// Pages racine et fiches du lexique : avant </body>, en chemin absolu comme lang-toggle.js
// (la 404 est servie à n'importe quelle adresse). Idempotent : relancer ne double rien.
// Usage : node scripts/ajouter-bandeau-kzumi.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESERVE = '<div class="bk-barre-place" style="height:44px" aria-hidden="true"></div>';
const ANCRE_ARTICLE = '<script src="../assets/ai-summarize.js" defer></script>';
const LIGNE_ARTICLE = '<script src="../assets/bandeau-kzumi.js" defer></script>';
const LIGNE_SITE = '<script src="/assets/bandeau-kzumi.js" defer></script>';
// Mêmes exclusions que bandeau-kzumi.js : pages légales et tunnel de précommande.
// Plus « liens » : page autonome de l'Instagram de Kévin et Jérémy, où kzumi a déjà sa carte.
const EXCLUES = ['cgv', 'mentions-legales', 'politique-confidentialite', 'suppression-donnees', 'preferences',
  'precommande-merci', 'precommande-photos-personal-branding', 'liens'];

const html = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.html')).map((f) => path.join(dir, f));
const pages = [
  ...html('.').filter((f) => !f.startsWith('_') && !EXCLUES.includes(f.replace(/\.html$/, ''))),
  ...html('lexique'),
  ...html('articles').filter((f) => !f.endsWith('_PROTO-design.html')),
];

let modifiees = 0;
const sansAncre = [];
for (const rel of pages) {
  const p = path.join(ROOT, rel);
  let h = fs.readFileSync(p, 'utf8');
  const avant = h;
  if (!h.includes('bk-barre-place')) h = h.replace(/<body([^>]*)>/, (m) => `${m}\n${RESERVE}`);
  if (!h.includes('bandeau-kzumi.js')) {
    if (rel.startsWith('articles' + path.sep)) {
      if (h.includes(ANCRE_ARTICLE)) h = h.replace(ANCRE_ARTICLE, ANCRE_ARTICLE + '\n' + LIGNE_ARTICLE);
      else sansAncre.push(rel);
    } else {
      const i = h.lastIndexOf('</body>');
      if (i >= 0) h = h.slice(0, i) + LIGNE_SITE + '\n' + h.slice(i);
      else sansAncre.push(rel);
    }
  }
  if (h !== avant) { fs.writeFileSync(p, h); modifiees++; }
}
console.log(`${modifiees} page(s) modifiée(s) sur ${pages.length}`);
if (sansAncre.length) console.log('Script non posé (ancre absente), à voir à la main :', sansAncre.join(', '));
