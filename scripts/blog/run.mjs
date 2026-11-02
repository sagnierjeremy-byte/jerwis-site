#!/usr/bin/env node
/**
 * run.mjs — Orchestrateur 1 commande du pipeline blog auto (Phases 1-2).
 *
 * Enchaîne : recherche → génération → gate qualité → (régénération si rejet, max N).
 * NE PUBLIE PAS (Phase 3). Produit un draft + un verdict. Décision finale à l'humain.
 *
 * Usage :
 *   node scripts/blog/run.mjs "<sujet>" [--type=A|B] [--slug=mon-slug] [--num=NN]
 *
 * Sortie : drafts/<slug>.md + research/<slug>.json + verdict console.
 * Exit 0 si publiable/file de relecture, 1 si rejet après régénérations.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUBRIC } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const topic = process.argv[2];
const type = (process.argv.find(a => a.startsWith('--type=')) || '--type=A').split('=')[1].toUpperCase();
const num = (process.argv.find(a => a.startsWith('--num=')) || '--num=00').split('=')[1];
let slug = (process.argv.find(a => a.startsWith('--slug=')) || '').split('=')[1];
if (!topic) { console.error('Usage : node scripts/blog/run.mjs "<sujet>" [--type=A|B] [--slug=...] [--num=NN]'); process.exit(2); }

slug = slug || topic.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const run = (args, label) => {
  console.log(`\n\x1b[1m▶ ${label}\x1b[0m`);
  const r = spawnSync('node', args, { cwd: ROOT, stdio: 'inherit' });
  return r.status === 0;
};

// 1) Recherche (idempotent : réutilise research/<slug>.json si déjà là on régénère quand même au 1er run)
if (!run(['scripts/blog/research.mjs', topic, `--type=${type}`, `--out=research/${slug}.json`], `1/3 Recherche : ${topic}`)) {
  console.error('✗ Recherche échouée.'); process.exit(3);  // 3 = panne technique (≠ 1 = rejet gate) : autopilot garde le sujet
}

// 2-3) Génération + gate, avec boucle de régénération
let attempt = 0, passed = false;
while (attempt <= RUBRIC.max_regen) {
  attempt++;
  if (!run(['scripts/blog/generate-draft.mjs', slug, `--num=${num}`], `2/3 Génération (essai ${attempt}/${RUBRIC.max_regen + 1})`)) {
    console.error('✗ Génération échouée.'); process.exit(3);
  }
  const gate = spawnSync('node', ['scripts/blog/qa-gate.mjs', slug, `--type=${type}`], { cwd: ROOT, stdio: 'inherit' });
  console.log(`\n\x1b[1m▶ 3/3 Gate qualité (essai ${attempt})\x1b[0m`);
  if (gate.status === 0) { passed = true; break; }
  if (attempt <= RUBRIC.max_regen) console.log(`\x1b[33m↻ Rejet → régénération (${attempt}/${RUBRIC.max_regen})…\x1b[0m`);
}

console.log('\n' + '─'.repeat(56));
if (passed) {
  console.log(`\x1b[32m✓ Draft prêt : drafts/${slug}.md\x1b[0m`);
  console.log(`  Prochaine étape (humain, Phase 3) : relecture 1-clic → npm run publish ${slug}`);
  process.exit(0);
} else {
  console.log(`\x1b[31m✗ Rejeté après ${RUBRIC.max_regen + 1} essais → drafts/${slug}.md mis en file de relecture humaine.\x1b[0m`);
  process.exit(1);
}
