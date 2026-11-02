// Ajoute le bandeau kzumi (assets/bandeau-kzumi.js) aux articles FR et au template,
// juste après la ligne ai-summarize.js. Idempotent : relancer ne double rien.
// Usage : node scripts/ajouter-bandeau-kzumi.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'articles');
const ANCRE = '<script src="../assets/ai-summarize.js" defer></script>';
const LIGNE = '<script src="../assets/bandeau-kzumi.js" defer></script>';

let ajoutes = 0, deja = 0;
const sans = [];
for (const f of fs.readdirSync(DIR).filter((n) => n.endsWith('.html') && n !== '_PROTO-design.html')) {
  const p = path.join(DIR, f);
  const html = fs.readFileSync(p, 'utf8');
  if (html.includes('bandeau-kzumi.js')) { deja++; continue; }
  if (!html.includes(ANCRE)) { sans.push(f); continue; }
  fs.writeFileSync(p, html.replace(ANCRE, ANCRE + '\n' + LIGNE));
  ajoutes++;
}
console.log(`${ajoutes} ajoutés, ${deja} déjà équipés`);
if (sans.length) console.log('Sans ancre ai-summarize.js, à voir à la main :', sans.join(', '));
