// Envoie le mail du jour du cours « Apprendre l'IA en 3 étapes » (P10).
// Modes :
//   node scripts/cours/envoyer-cours.mjs --apercu <fichier.html>   → les 6 mails dans une page, rien n'est envoyé
//   node scripts/cours/envoyer-cours.mjs --test <email>            → envoie les 6 mails à cette seule adresse
//   node scripts/cours/envoyer-cours.mjs                           → envoi quotidien (GitHub Actions, si COURS_MAIL=on)
// Envoi quotidien : lit l'audience Resend, garde les contacts inscrits par le cours (last_name « src:cours-3-etapes »,
// posé par api/subscribe.js) et non désabonnés, et envoie le mail dont le jour correspond au nombre de jours
// écoulés depuis l'inscription. Sans état : le workflow tourne une fois par jour. DRY=1 pour simuler.
import fs from 'node:fs';
import { MAILS, SOURCE, FROM, rendre } from './mails.mjs';

const args = process.argv.slice(2);
const KEY = process.env.RESEND_API_KEY;
const DRY = process.env.DRY === '1';

async function resend(chemin, options = {}) {
  const r = await fetch(`https://api.resend.com${chemin}`, { ...options, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (!r.ok) throw new Error(`Resend ${r.status} sur ${chemin} : ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
async function envoyer(mail, email, numero) {
  if (DRY) { console.log(`[DRY] mail ${numero} « ${mail.sujet} » → ${email}`); return; }
  await resend('/emails', { method: 'POST', body: JSON.stringify({ from: FROM, to: [email], subject: mail.sujet, html: rendre(mail, email, numero) }) });
  console.log(`✓ mail ${numero} « ${mail.sujet} » → ${email.replace(/(.).*@/, '$1…@')}`);
}

if (args[0] === '--apercu') {
  const sortie = args[1] || 'cours-apercu.html';
  const pages = MAILS.map((m, i) => `<section style="margin:0 0 48px"><p style="font:700 13px monospace;margin:0 0 8px">Jour ${m.jour} · objet : ${m.sujet}</p><iframe style="width:100%;max-width:680px;height:900px;border:1px solid #ddd;border-radius:12px;background:#fff" srcdoc="${rendre(m, 'toi@exemple.fr', i + 1).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe></section>`);
  fs.writeFileSync(sortie, `<!doctype html><meta charset="utf-8"><title>Cours par mail · aperçu</title><body style="margin:0;padding:24px 16px;background:#F3EEE5;font-family:Arial,sans-serif"><h1 style="font-size:22px">Les 6 mails du cours, dans l'ordre</h1>${pages.join('')}</body>`);
  console.log(`✓ aperçu écrit : ${sortie}`);
  process.exit(0);
}

if (!KEY) { console.error('RESEND_API_KEY manquante'); process.exit(1); }

if (args[0] === '--test') {
  const email = args[1];
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { console.error('Donne une adresse de test.'); process.exit(2); }
  for (const [i, m] of MAILS.entries()) await envoyer(m, email, i + 1);
  process.exit(0);
}

if (process.env.COURS_MAIL !== 'on') { console.log('Cours par mail coupé (variable COURS_MAIL ≠ on), rien envoyé.'); process.exit(0); }

// Audience : celle du site (RESEND_AUDIENCE_ID si fournie, sinon la seule audience du compte)
let audience = process.env.RESEND_AUDIENCE_ID;
if (!audience) {
  const liste = (await resend('/audiences')).data || [];
  if (liste.length !== 1) { console.error(`✗ ${liste.length} audiences sur le compte : renseigne RESEND_AUDIENCE_ID.`); process.exit(1); }
  audience = liste[0].id;
}
const contacts = (await resend(`/audiences/${audience}/contacts`)).data || [];
const aujourdhui = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
let envoyes = 0;
for (const c of contacts) {
  if (c.unsubscribed || c.last_name !== `src:${SOURCE}` || !c.created_at) continue;
  const inscrit = new Date(c.created_at);
  const jour = Math.round((aujourdhui - Date.UTC(inscrit.getUTCFullYear(), inscrit.getUTCMonth(), inscrit.getUTCDate())) / 864e5);
  const i = MAILS.findIndex((m) => m.jour === jour && m.jour > 0);
  if (i < 0) continue;
  await envoyer(MAILS[i], c.email, i + 1);
  envoyes++;
}
console.log(`Cours par mail : ${envoyes} envoi(s) sur ${contacts.length} contact(s).`);
