#!/usr/bin/env node
/**
 * notify-queue.mjs — prévient Jérémy quand la file de sujets baisse (plan du 02-11-2026, P2).
 * Appelé par le workflow après chaque passage réussi, publication ou non.
 *
 * Un e-mail part :
 *   1. quand refill-topics.mjs vient d'ajouter des sujets (liste dans /tmp/refill.json) ;
 *   2. sinon, quand il reste exactement SEUIL sujets : chaque passage n'en retire qu'un,
 *      donc ce cas ne se produit qu'une fois par descente ;
 *   3. sinon, file vide, chaque lundi (UTC), tant qu'elle le reste.
 * Aucun état stocké entre deux passages.
 *
 * Usage : node scripts/blog/notify-queue.mjs
 * Env   : RESEND_API_KEY · NOTIFY_EMAIL · DRY=1 (affiche sans envoyer) · AUJOURDHUI=YYYY-MM-DD (tests)
 * Best-effort comme notify-publish.mjs : clé absente = exit 0, envoi raté = exit 1 (étape en
 * continue-on-error, l'échec reste visible sans rien bloquer).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEUIL_FILE as SEUIL } from './config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FROM = 'Jerwis (blog auto) <jeremy@jerwis.fr>';
const TO = process.env.NOTIFY_EMAIL || 'jeremy.sagnier@jerwis.fr';
const DRY = process.env.DRY === '1';
const jour = process.env.AUJOURDHUI || new Date().toISOString().slice(0, 10);
const lundi = new Date(jour + 'T12:00:00Z').getUTCDay() === 1;

const file = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'topic-queue.json'), 'utf8'));
const enAttente = file.topics.filter((t) => t.status === 'pending')
  .sort((a, b) => (a.priority - b.priority) || String(a.added).localeCompare(String(b.added)));
let ajoutes = [];
try { ajoutes = JSON.parse(fs.readFileSync('/tmp/refill.json', 'utf8')); } catch { /* pas de remplissage ce passage */ }

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const liste = (sujets) => `<ol style="padding-left:20px;margin:12px 0">${sujets.map((t) =>
  `<li style="margin:0 0 8px">${esc(t.topic)}${t.source ? `<br><span style="color:#888;font-size:12px">${esc(t.source)}</span>` : ''}</li>`).join('')}</ol>`;
const texte = (sujets) => sujets.map((t, i) => `${i + 1}. ${t.topic}`).join('\n');

let objet, intro, sujets;
if (ajoutes.length) {
  objet = `Blog jerwis.fr, ${ajoutes.length} nouveaux sujets ajoutés à la file`;
  intro = `La file baissait, j'ai ajouté ${ajoutes.length} sujets tirés de ta veille des 30 derniers jours. Il y a maintenant ${enAttente.length} sujets en attente. Si l'un d'eux ne te plaît pas, demande à Claude Code de le retirer avant sa publication.`;
  sujets = ajoutes;
} else if (enAttente.length === SEUIL) {
  objet = `Blog jerwis.fr, plus que ${SEUIL} sujets en attente`;
  intro = `Il reste ${SEUIL} sujets dans la file de l'autopilote. Au rythme de quatre articles par semaine, elle sera vide dans une semaine. Pour en ajouter, demande-le à Claude Code.`;
  sujets = enAttente;
} else if (enAttente.length === 0 && lundi) {
  objet = 'Blog jerwis.fr, la file de sujets est vide';
  intro = "L'autopilote n'a plus de sujet, aucun article ne sortira tant que la file reste vide. Pour en ajouter, demande-le à Claude Code. Ce rappel revient chaque lundi.";
  sujets = [];
} else {
  console.error(`[file] ${enAttente.length} sujet(s) en attente, rien à signaler.`);
  process.exit(0);
}

const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#0A0A0A">
    <p style="font:700 11px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#FF8200;margin:0 0 8px">Blog auto · ${jour}</p>
    <h1 style="font-size:20px;line-height:1.25;margin:0 0 12px">${esc(objet.replace('Blog jerwis.fr, ', ''))}</h1>
    <p style="font-size:15px;line-height:1.55;margin:0">${esc(intro)}</p>
    ${sujets.length ? liste(sujets) : ''}
    <p style="color:#888;font-size:12px;margin-top:24px">Envoyé par l'autopilote du blog jerwis.fr (data/topic-queue.json).</p>
  </div>`;
const text = `${intro}${sujets.length ? '\n\n' + texte(sujets) : ''}\n\n(Autopilote du blog jerwis.fr, ${jour}.)`;

if (DRY) {
  console.log(`[file] DRY · à ${TO} · ${objet}\n\n${text}`);
  process.exit(0);
}
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('[file] RESEND_API_KEY absente → e-mail non envoyé.');
  process.exit(0);
}
try {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [TO], subject: objet, html, text }),
  });
  if (!res.ok) {
    console.error(`[file] ✗ échec Resend ${res.status} : ${await res.text()}`);
    process.exit(1);
  }
  console.error(`[file] ✓ e-mail envoyé à ${TO} : ${objet}`);
} catch (e) {
  console.error('[file] ✗ erreur:', String(e));
  process.exit(1);
}
