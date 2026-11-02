#!/usr/bin/env node
/**
 * autopilot.mjs — Orchestrateur du cron (Phase 3, MODE 1 : brouillon + validation humaine).
 *
 * 1. Sélectionne le prochain sujet (data/topic-queue.json)
 * 2. Lance le pipeline : recherche → génération → gate (+ régénération)
 * 3. Laisse le draft dans drafts/, passe le sujet à 'in_review' (PAS 'done' : done = publié)
 * 4. Écrit un résumé machine dans /tmp/autopilot-status.txt pour le workflow GitHub Actions
 *
 * NE PUBLIE JAMAIS (pas de npm run publish). La publication = action humaine 1-clic.
 *
 * Usage (cron) : node scripts/blog/autopilot.mjs
 * Sortie : STATUS=<publishable|review|reject> SLUG=<slug> SCORE=<n/70> sur stdout.
 */

import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const node = (args) => spawnSync('node', args, { cwd: ROOT, encoding: 'utf8' });

// 1) Sélection
const sel = node(['scripts/blog/select-topic.mjs']);
process.stderr.write(sel.stderr || '');
if (sel.status === 3) {  // file vide = rien à faire, pas une erreur (refill-topics.mjs et notify-queue.mjs prennent le relais)
  console.log('STATUS=empty');
  await writeFile('/tmp/autopilot-status.txt', 'empty\n\n\n\n\n', 'utf8').catch(() => {});
  process.exit(0);
}
if (sel.status !== 0) { console.error('select-topic a échoué'); process.exit(1); }
const chosen = JSON.parse(sel.stdout.trim().split('\n').pop());
const { id: slug, topic, type } = chosen;

// 2) Pipeline complet (recherche → génération → gate → régén) via run.mjs
const num = String(Date.now()).slice(-2); // numéro indicatif
const run = spawnSync('node', ['scripts/blog/run.mjs', topic, `--type=${type}`, `--slug=${slug}`, `--num=${num}`],
  { cwd: ROOT, stdio: 'inherit' });

const draftPath = path.join(ROOT, 'drafts', `${slug}.md`);
const draftExists = existsSync(draftPath);
const passed = run.status === 0;       // run.mjs sort 0 si la gate passe (≥56/70, 0 bloquant)
const today = new Date().toISOString().slice(0, 10);

// helper : met à jour le statut d'un sujet dans la file
async function markTopic(id, patch) {
  const QUEUE = path.join(ROOT, 'data', 'topic-queue.json');
  const data = JSON.parse(await readFile(QUEUE, 'utf8'));
  const t = data.topics.find(x => x.id === id);
  if (t) Object.assign(t, patch);
  await writeFile(QUEUE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// 3) MODE FULL-AUTO : publie tout seul si la gate passe ; sinon s'abstient en silence.
let status, url = '';
if (!draftExists) {
  status = 'error';                    // recherche/génération KO → sujet reste 'pending' (réessai)
} else if (passed) {
  const pub = spawnSync('node', ['scripts/blog/publish-auto.mjs', slug, `--type=${type}`, `--date=${today}`],
    { cwd: ROOT, stdio: 'inherit' });
  if (pub.status === 0) {
    status = 'published';
    url = `https://jerwis.fr/articles/${slug}`;
    await markTopic(slug, { status: 'done', published_at: today });
  } else {
    status = 'publish_failed';         // article OK mais publication cassée → à investiguer
    await markTopic(slug, { status: 'publish_failed', drafted_at: today });
  }
} else {
  status = 'skipped';                  // gate non franchie → article jeté, sujet sorti de la file
  await markTopic(slug, { status: 'skipped', drafted_at: today, gate_passed: false });
}

// 4) Statut machine pour le workflow
const summary = `STATUS=${status} SLUG=${slug} TYPE=${type}`;
console.log('\n' + summary);
await writeFile('/tmp/autopilot-status.txt', `${status}\n${slug}\n${type}\n${topic}\n${url}\n`, 'utf8').catch(() => {});

// exit non-zéro UNIQUEMENT si le système est en panne (rien produit / publication cassée)
// → déclenche l'alerte. 'published' et 'skipped' = fonctionnement normal → exit 0, aucune notif.
process.exit(status === 'error' || status === 'publish_failed' ? 1 : 0);
