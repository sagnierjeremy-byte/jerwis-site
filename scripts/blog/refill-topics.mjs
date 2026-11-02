#!/usr/bin/env node
/**
 * refill-topics.mjs — remplit la file de sujets quand elle baisse (plan du 02-11-2026, P3).
 *
 * Si la file a SEUIL sujets 'pending' ou moins : lit les titres de la veille quotidienne
 * des 30 derniers jours (historique git de data/news-summary.json, le checkout CI est en
 * fetch-depth 0), demande AJOUT sujets « IA au quotidien » qui n'existent pas encore,
 * les contrôle et les ajoute en 'pending' (priorité 2, added_by 'auto').
 * La liste ajoutée part dans /tmp/refill.json, que notify-queue.mjs met dans l'e-mail.
 *
 * Usage : node scripts/blog/refill-topics.mjs
 * Env   : DRY=1 (affiche sans écrire la file) · FORCE=1 (ignore le seuil)
 * Sortie 0 quand il n'y a rien à faire ou que des sujets sont ajoutés ; 1 si le modèle
 * ne répond pas ou ne rend aucun sujet valable (étape en continue-on-error : on réessaie
 * au passage suivant, la file étant toujours sous le seuil).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generate } from './llm.mjs';
import { SEUIL_FILE as SEUIL } from './config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const QUEUE = path.join(ROOT, 'data', 'topic-queue.json');
const AJOUT = 8;
const DRY = process.env.DRY === '1';
const jour = new Date().toISOString().slice(0, 10);

fs.writeFileSync('/tmp/refill.json', '[]');
const file = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
const enAttente = file.topics.filter((t) => t.status === 'pending').length;
if (enAttente > SEUIL && process.env.FORCE !== '1') {
  console.error(`[remplissage] ${enAttente} sujets en attente, au-dessus du seuil (${SEUIL}) : rien à faire.`);
  process.exit(0);
}

// ── La veille des 30 derniers jours, un titre par ligne ──
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const SUJET_IA = /\b(IA|AI|GPT|ChatGPT|Claude|Gemini|Mistral|OpenAI|Anthropic|Copilot|Perplexity|Grok|Meta|Google|Apple|agents?|chatbots?|deepfakes?|robots?|algorithmes?|arnaques?|pirat\w*|cyber\w*|données|smartphones?|WhatsApp)\b/i;
const vus = new Set();
const veille = [];
let commits = [];
try { commits = git('log', '--since=30 days ago', '--format=%H', '--', 'data/news-summary.json').split('\n').filter(Boolean); } catch { /* pas d'historique */ }
for (const h of commits.length ? commits : [null]) {
  try {
    const d = JSON.parse(h ? git('show', `${h}:data/news-summary.json`) : fs.readFileSync(path.join(ROOT, 'data', 'news-summary.json'), 'utf8'));
    for (const it of d.items || []) {
      // La veille mêle IA et économie : seuls les titres IA ou sécurité numérique servent le blog,
      // et une consigne plus courte laisse à Kimi (relais de Claude) de quoi répondre.
      if (!it.title || vus.has(it.title) || !SUJET_IA.test(it.title)) continue;
      vus.add(it.title);
      veille.push(`${String(d.generated_at || '').slice(0, 10)} · ${it.title}`);
    }
  } catch { /* jour illisible : ignoré */ }
}

// ── Ce qui existe déjà ──
const slugs = fs.readdirSync(path.join(ROOT, 'articles')).filter((f) => f.endsWith('.html') && !f.startsWith('_')).map((f) => f.replace(/\.html$/, ''));
const pris = new Set([...slugs, ...file.topics.map((t) => t.id)]);

const system = `Tu choisis les sujets du blog jerwis.fr de Jérémy Sagnier : des articles pratiques sur l'IA au quotidien pour des gens qui ne codent pas (particuliers, salariés, indépendants, parents). Chaque sujet est une requête qu'une personne taperait dans Google, en minuscules, au tutoiement quand il y a un « tu », suivie après un deux-points de ce que l'article couvrira. Tu écris en français correct, avec tous les accents, et « IA » en majuscules.`;
const prompt = `Sujets déjà publiés ou en attente (n'en refais aucun, ni rien de trop proche) :
${file.topics.map((t) => `- ${t.topic}`).join('\n')}

Articles déjà en ligne (adresses) : ${slugs.join(', ')}

Titres de la veille quotidienne de Jérémy, 30 derniers jours :
${veille.join('\n') || '(aucun titre disponible)'}

Propose ${AJOUT} nouveaux sujets.
Règles :
1. Au moins ${AJOUT - 3} partent d'un titre de la veille, en ramenant l'actualité à ce qu'elle change pour une personne ordinaire. Les autres peuvent être intemporels.
2. Écarte tout ce qui n'est pas de l'IA au quotidien : budget de l'État, taux d'intérêt, faillites, géopolitique, levées de fonds, résultats d'entreprises, politique.
3. Aucun conseil d'investissement, aucun diagnostic médical.
4. Aucun tiret cadratin ni demi-cadratin.
5. "id" : adresse courte en minuscules, mots séparés par des tirets, sans accents, 60 caractères au plus. Le "topic", lui, garde tous ses accents.
6. "source" : le titre de la veille et sa date (« Veille du 2026-10-16 : … »), ou « Intemporel ».
7. Pas deux sujets proches entre eux. Chaque sujet répond à une vraie question pratique que des gens se posent ; n'invente aucun fait que le titre de la veille ne dit pas.
Réponds uniquement par un tableau JSON : [{"id":"…","topic":"…","source":"…"}]`;

let rendu;
try {
  // 32 000 : si Claude tombe, Kimi K2.6 (modèle « thinking ») prend le relais et un budget
  // court part entièrement en réflexion (réponse vide, finish: length), vécu deux fois le 02-11.
  rendu = await generate(prompt, { system, temperature: 0.6, max_tokens: 32000 });
} catch (e) {
  console.error(`[remplissage] ✗ le modèle ne répond pas : ${e.message}`);
  process.exit(1);
}
// Le tableau JSON, même entouré de texte, d'un bloc ```json ou de crochets parasites.
function lireTableau(texte) {
  const essais = [(texte.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1], texte.slice(texte.indexOf('[{'), texte.lastIndexOf('}]') + 2), texte];
  for (const e of essais) {
    if (!e) continue;
    try { const v = JSON.parse(e.trim()); if (Array.isArray(v)) return v; } catch { /* essai suivant */ }
  }
  return [];
}
const proposes = lireTableau(rendu.text || '');
if (!proposes.length) console.error(`[remplissage] réponse illisible (${rendu.provider}), début : ${(rendu.text || '(vide)').slice(0, 400)}`);

const ajoutes = [];
for (const p of Array.isArray(proposes) ? proposes : []) {
  const id = String(p?.id || '').trim();
  const topic = String(p?.topic || '').trim();
  const source = String(p?.source || '').trim().slice(0, 200);
  const refus =
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 60 ? 'adresse invalide'
    : pris.has(id) ? 'existe déjà'
    : topic.length < 40 || topic.length > 260 ? 'longueur'
    : /[—–]/.test(topic) ? 'tiret cadratin'
    : !/[àâäçéèêëîïôöûùüÿœ]/i.test(topic) ? 'sans accents'
    : null;
  if (refus) { console.error(`  · écarté (${refus}) : ${id || '?'}`); continue; }
  pris.add(id);
  ajoutes.push({ id, topic, type: 'A', priority: 2, status: 'pending', added: jour, added_by: 'auto', source });
  if (ajoutes.length === AJOUT) break;
}

if (!ajoutes.length) {
  console.error(`[remplissage] ✗ aucun sujet valable dans la réponse (${rendu.provider}).`);
  process.exit(1);
}
console.error(`[remplissage] ${ajoutes.length} sujet(s) proposés par ${rendu.provider}, ${veille.length} titres de veille lus :`);
for (const t of ajoutes) console.error(`  + ${t.id}\n    ${t.topic}\n    ${t.source}`);
if (DRY) process.exit(0);

file.topics.push(...ajoutes);
fs.writeFileSync(QUEUE, JSON.stringify(file, null, 2) + '\n');
fs.writeFileSync('/tmp/refill.json', JSON.stringify(ajoutes));
console.error(`[remplissage] ✓ file : ${enAttente + ajoutes.length} sujets en attente.`);
