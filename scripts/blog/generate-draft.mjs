#!/usr/bin/env node
/**
 * generate-draft.mjs — Étape 2 : un brief de recherche → un draft markdown complet.
 *
 * Lit research/<slug>.json, génère drafts/<slug>.md (frontmatter + corps), GROUNDED
 * sur les faits du brief (anti-hallucination : interdiction d'affirmer hors brief).
 *
 * Générateur = Claude si ANTHROPIC_API_KEY présente (voix calibrée), sinon Gemini (gratuit).
 *
 * Usage : node scripts/blog/generate-draft.mjs <slug> [--num=NN]
 * Sortie : drafts/<slug>.md
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { generate } from './llm.mjs';
import { TON_LEO, SEO_RULES } from './config.mjs';

/**
 * Garantit un frontmatter YAML TOUJOURS valide, peu importe comment le LLM a cité.
 * Les LLM mettent souvent des " non échappés dans lead:/description: → YAML cassé →
 * crash de gray-matter en aval (gate, publish, inject-card). On parse en tolérant
 * puis on re-sérialise proprement (js-yaml échappe ce qu'il faut).
 */
function normalizeDraft(md) {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return null;
  const [, fmText, body] = m;

  // chemin strict d'abord (frontmatter déjà valide → meilleure fidélité).
  // On se base sur le RÉSULTAT, pas sur le throw : gray-matter peut renvoyer {} sans throw.
  let data = null;
  try { const d = matter(md).data; if (d && Object.keys(d).length) data = d; } catch { /* tolérant ci-dessous */ }
  if (!data) {
    // chemin tolérant : 1 paire clé/valeur par ligne, listes via "  - "
    data = {};
    let curKey = null;
    const strip = (s) => {
      s = s.trim();
      const q = s.match(/^"([\s\S]*)"$/) || s.match(/^'([\s\S]*)'$/);
      return q ? q[1] : s;
    };
    for (const raw of fmText.split('\n')) {
      const li = raw.match(/^\s*-\s+(.*)$/);
      if (li && curKey) { (data[curKey] ||= []).push(strip(li[1])); continue; }
      const kv = raw.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (!kv) continue;
      const [, k, rest] = kv;
      if (rest.trim() === '') { curKey = k; data[k] = []; }
      else { data[k] = strip(rest); curKey = null; }
    }
    for (const k of Object.keys(data)) if (Array.isArray(data[k]) && !data[k].length) delete data[k];
  }

  // re-sérialise via gray-matter (moteur js-yaml interne) → YAML toujours valide,
  // sans dépendre directement de js-yaml (dépendance non déclarée).
  return matter.stringify('\n' + body.trim() + '\n', data, { lineWidth: -1, noRefs: true });
}

/**
 * Filet anti-tirets (règles anti-IA 2026-08-28) : corrige mécaniquement les seuls cas
 * grammaticalement sûrs AVANT la gate, qui bloque le reste (rejet → régénération).
 * - Demi/cadratin collé entre deux chiffres = plage → trait d'union (2020–2024 → 2020-2024).
 * - Cadratin/demi-cadratin en incise (entouré de texte) → virgule. JAMAIS « : » : c'est
 *   le même tic IA (règle Jérémy). Un tiret en début de ligne (dialogue) n'est PAS corrigé,
 *   la gate le bloquera : le réécrire mécaniquement changerait le sens.
 * - Les blocs de code ``` ``` et les URLs sont laissés intacts (un exemple de prompt peut
 *   contenir un tiret, et réécrire une URL la casserait).
 */
function purgerTirets(md) {
  let fixes = 0;
  const out = md.split(/(```[\s\S]*?```|\]\([^)\s]+\)|https?:\/\/\S+)/).map((seg, i) => {
    if (i % 2 === 1 || !/[—–]/.test(seg)) return seg;
    const avant = (seg.match(/[—–]/g) || []).length;
    const s = seg
      .replace(/(\d)[—–](\d)/g, '$1-$2')
      .replace(/(?<=\S)[   ]*[—–][   ]*(?=\S)/g, ', ');
    fixes += avant - ((s.match(/[—–]/g) || []).length);
    return s;
  }).join('');
  return { md: out, fixes };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const slug = process.argv[2];
const num = (process.argv.find(a => a.startsWith('--num=')) || '--num=').split('=')[1] || '';
if (!slug) { console.error('Usage : node scripts/blog/generate-draft.mjs <slug>'); process.exit(2); }

const briefPath = path.join(ROOT, 'research', `${slug}.json`);
if (!existsSync(briefPath)) { console.error(`Brief introuvable : ${briefPath} (lance research.mjs d'abord)`); process.exit(2); }
const brief = JSON.parse(await readFile(briefPath, 'utf8'));
const type = brief.type || 'A';

const factsBlock = (brief.facts || []).map((f, i) => `[F${i + 1}] ${f.claim} (${f.date || 'n.d.'}) · source: ${f.source_url}`).join('\n');
const statsBlock = (brief.stats || []).map((s, i) => `[S${i + 1}] ${s.stat} (${s.date || 'n.d.'}) · source: ${s.source_url}`).join('\n');
const linksBlock = (brief.internal_links || []).map(l => `${l.url} · ${l.why}`).join('\n');
const faqBlock = (brief.faq || []).map(q => `- ${q}`).join('\n');

const minW = type === 'B' ? SEO_RULES.body_words_min_B : SEO_RULES.body_words_min_A;
const maxW = type === 'B' ? '' : ` et ${SEO_RULES.body_words_max_A} mots maximum`;

const prompt = `Tu écris un article de blog pour jerwis.fr, le blog de Jérémy Sagnier.

${TON_LEO}

SUJET : ${brief.topic}
ANGLE : ${brief.angle}
INTENTION DU LECTEUR : ${brief.intent}
TYPE : ${type === 'B' ? 'Making-of (récit vécu)' : 'Article SEO informatif'}

=== MATIÈRE FACTUELLE (tu n'as le droit d'affirmer QUE ce qui est ici) ===
FAITS :
${factsBlock}

STATISTIQUES :
${statsBlock}

RÈGLE ANTI-INVENTION ABSOLUE :
- N'affirme AUCUN fait, chiffre, nom propre ou date qui ne soit pas dans la matière ci-dessus.
- INTERDICTION FORMELLE d'inventer un chiffre précis pour faire "concret" : pas de "20 agents économisés", "10 000 tâches/mois", "30 % du temps", "70 % des clients" si ce chiffre exact n'est pas dans la matière. Un chiffre rond et impressionnant non sourcé = signal d'invention = REJET. Dans le doute, reste QUALITATIF ("une grande partie", "une bonne partie", "beaucoup de temps").
- Ne colle JAMAIS un nom de source (Gartner, McKinsey, IBM…) à un chiffre si ce nom n'est pas dans la matière, même si tu "crois" le connaître.
- Si un chiffre te semble douteux ou invraisemblable, NE L'UTILISE PAS (mieux vaut l'omettre qu'inventer).
- STATISTIQUES — SOURCE OBLIGATOIRE DANS LA PHRASE : quand tu cites un chiffre, nomme la source dans la phrase ("selon Grand View Research", "d'après l'étude X") SI elle figure dans la matière, et mentionne l'année. Un chiffre orphelin (sans source nommée ni année) = à NE PAS utiliser : si la matière ne fournit pas de source, reste qualitatif.
- FRAÎCHEUR / ANTI-SUPERLATIF (l'IA évolue très vite) : ne qualifie JAMAIS une version d'outil ou de modèle de "la dernière", "la référence", "la plus récente", "difficile à battre" ou "incontesté" SAUF si un FAIT daté ci-dessus le confirme à ~30 jours près de la date de publication de l'article. Sinon écris "à la date de cet article" et évite le superlatif. Un superlatif périmé (recommander une vieille version) décrédibilise tout l'article. Un outil ne peut être "n°1" que sur UNE dimension précise et seulement si la matière le dit ; en cas de doute, formule en relatif ("réputé fort sur X") plutôt qu'en absolu ("leader incontesté").
- Tu n'es pas obligé d'utiliser tous les faits — choisis les plus solides.

=== LIENS INTERNES À PLACER (2 à 6, en markdown [texte](url), ancres variées) ===
${linksBlock}

=== STRUCTURE ATTENDUE ===
- Sujets des sections, à traiter dans l'article : ${(brief.outline || []).join(' / ')}
  ⚠️ Cet outline est une matière de TRAVAIL bourrée de mots-clés : NE RECOPIE JAMAIS ces formulations en titres H2. Reformule chaque section en titre court et humain (voir la RÈGLE DES TITRES ci-dessous).
- Un H2 tous les 250-350 mots. Corps : ${minW} mots minimum${maxW}.
- Inclure 1-2 encarts \`<div class="callout tip"><h4>Titre</h4><p>...</p></div>\` (ton avis perso). Titre d'encart court et chaleureux SANS être familier ni péremptoire (ex: "Mon conseil", "Le piège à éviter", "Ce que je retiens" ; PAS "Mon avis tranché" ni "à mes dépens").
- IMPÉRATIF : termine l'article complètement, ne le coupe jamais en milieu de phrase ou de mot.
- Terminer par un H2 "## Questions fréquentes" avec ces questions (### par question) :
${faqBlock}
- Finir par un court H2 de conclusion personnelle ("## Ce que je retiens" ou similaire).
- Insérer 2 séparateurs de section style \`<!-- section k-fuchsia -->\` / \`<!-- section k-teal -->\` / \`<!-- section k-orange -->\` avant certains H2 (rotation des couleurs).

=== FORMAT DE SORTIE (markdown avec frontmatter YAML, RIEN d'autre autour) ===
---
slug: ${slug}
titre: "titre interne 50-60 caractères"
titre_seo: "titre SEO 40-65 caractères (le suffixe « par Jérémy Sagnier » est ajouté automatiquement, ne l'inclus pas)"
description: "meta description 140-160 caractères, bénéfice lecteur en tête"
numero: "${num || '00'}"
categorie: "${type === 'B' ? 'Making-of' : 'Décryptage'}"
hero_ligne_1: "ligne 1 du H1 (2-3 mots)"
hero_ligne_2: "ligne 2"
hero_ligne_3: "ligne 3 (sera en italique)"
lead: "paragraphe hero ${SEO_RULES.lead_words_min}-${SEO_RULES.lead_words_max} mots, 1ère personne, commence par la question du lecteur"
duree: "X min"
niveau: "Débutant"
outils: "outil principal"
published: "${new Date().toISOString().slice(0, 10)}"
tldr:
  - "point 1 avec <strong>mot clé</strong>"
  - "point 2"
  - "point 3"
  - "point 4"
---

[CORPS MARKDOWN ICI. Pas de # H1 (déjà géré par le hero). Commence directement par un <!-- section --> puis ## ]

RÈGLE DE TUTOIEMENT (ton Leo de jerwis.fr) :
- TUTOIE le lecteur partout : "tu", "ton", "tes", "tu veux", "tu écris". JAMAIS de "vous"/"votre"/"vos".
- Vaut aussi pour les titres et les questions de la FAQ.

RÈGLE TYPOGRAPHIQUE FRANÇAISE STRICTE (très important) :
- TOUS les titres (##, ###, h4 d'encadré) en CASSE DE PHRASE française : SEULE la première lettre du titre est en majuscule, plus les noms propres. JAMAIS de Title Case anglo (Majuscule À Chaque Mot).
- Exemples corrects : "Les 4 piliers d'un bon prompt", "Comment itérer sur tes prompts", "Les erreurs qui plombent tes réponses".
- Exemples INTERDITS : "Les 4 Piliers d'un Bon Prompt", "Comment Itérer Sur Tes Prompts".
- Les noms propres gardent leur casse : Chain-of-Thought, Context Engineering, Claude, RCTF.

RÈGLE DES TITRES H2/H3 (ton Leo, TRÈS IMPORTANT : c'est ce qui sonne "humain" vs "fiche SEO") :
- Les H2 doivent être COURTS (7 mots maximum) et chaleureux, comme une question ou une phrase qu'on lâcherait à un ami. C'est un blog perso, pas une fiche produit.
- INTERDIT dans un titre : empilement de mots-clés, deux-points suivi d'une énumération, années ou plages d'années (2025-2026), et les mots "incontournable", "essentiel", "concret", "panorama", "guide complet".
- Bons titres (à imiter) : « C'est quoi, concrètement ? » · « Pourquoi tout le monde en parle » · « Par où je commencerais » · « Les pièges que j'ai rencontrés » · « Mon outil préféré » · « Ça vaut le coup pour qui ? ».
- Mauvais titres (STRICTEMENT INTERDITS) : « Panorama des outils IA no-code incontournables en 2025-2026 pour automatiser tes tâches » · « Les bénéfices concrets de l'IA no-code pour ton entreprise : gains de temps, réduction des coûts et innovation » · « Comment identifier et automatiser tes tâches répétitives avec l'IA — méthode simple pour non-codeurs ».
- Place les mots-clés SEO dans le CORPS du paragraphe, jamais en les empilant dans le titre.

TOURNURES "CONSULTANT/SEO" À BANNIR (elles font "contenu généré pour Google", pas "blog perso") :
- N'écris JAMAIS : "panorama", "incontournable", "à l'ère de", "dans un monde où", "force est de constater", "il est important de noter/souligner", "les bénéfices concrets de", "une compétence clé/à part entière", "à ne pas négliger", "plongeons", "décortiquons ensemble", "sans plus attendre", "ne sont pas abstraits".
- N'écris JAMAIS non plus : "en résumé", "au final", "une chose est sûre", "ce qui est certain", "spoiler", "game-changer", "révolutionne", "booster", "sans précédent", "un véritable + nom" ("un véritable assistant"), "n'est pas près de s'arrêter".
- Pas d'intro creuse type "Dans cet article, nous allons voir…". Entre directement dans le vif, au vécu.
- Préfère le verbe simple et l'exemple concret à l'adjectif marketing.

RÈGLES ANTI-IA (un texte qui "sent l'IA" est un texte raté ; ces règles sont BLOQUANTES à la gate qualité) :
- JAMAIS de tiret cadratin (—) ni demi-cadratin (–), nulle part : ni dans le corps, ni dans les titres, ni dans le frontmatter (titre, lead, description, tldr). Et ne le remplace pas par un " : " planté au milieu de la phrase, c'est le même tic. Réécris vraiment : deux phrases, une virgule, ou une parenthèse. Les traits d'union des mots composés (c'est-à-dire, peut-être) et des plages (2020-2024) restent normaux.
- JAMAIS d'énumération de trois dans une phrase ("simple, rapide, efficace") : c'est LA signature IA. Un élément, deux, ou quatre. Les vraies listes à puces, elles, restent bienvenues.
- Le renversement "Ce n'est pas X. C'est Y." : deux fois maximum dans tout l'article.
- Pas d'anaphore mécanique (trois phrases ou trois paragraphes qui démarrent pareil), pas de symétrie parfaite entre sections, pas de question rhétorique auto-répondue ("Le résultat ? ...", "La bonne nouvelle ? ...").
- Casse le rythme : alterne phrases courtes et longues, paragraphes d'une ligne et paragraphes pleins. Deux phrases voisines ne doivent pas avoir la même construction.
- Autorisé et bienvenu (ça fait humain) : commencer une phrase par "Et", "Mais", "Sauf que". Une phrase sans verbe. Un aparté entre parenthèses.

LECTEUR DÉBUTANT (règle de Jérémy du 2026-11-02, bloquante comme les autres) :
- JAMAIS de terminal, de ligne de commande, de commande à taper ni d'outil de développeur (Claude Code en ligne de commande, Ghostty, Homebrew, npm, git, scripts) dans un article pour le grand public.
- Pour faire agir l'IA sur des fichiers, propose l'app Claude de bureau (on lui ouvre un dossier) ou l'app ChatGPT en mode Work. Pour tout le reste, le navigateur et les versions gratuites suffisent.

LONGUEUR : respecte la cible (corps ${minW} mots minimum${maxW}). Ne gonfle pas l'article pour "faire long" : si tu as fait le tour, conclus.

Écris maintenant l'article complet, en respectant le ton Leo À LA LETTRE. Pas de "dans cet article nous allons voir". Va au vécu, sois utile, sois chaleureux sans être familier. Termine l'article entièrement.`;

console.error(`• Génération du draft "${slug}" (Type ${type})…`);
const { provider, text } = await generate(prompt, {
  tier: type === 'B' ? 'makingof' : 'seo',
  temperature: 0.7,
  max_tokens: 32000,   // marge confortable : un article de 2500 mots ne doit jamais être tronqué ; Kimi K2.6 (relais de Claude) réfléchit avant d'écrire, 16 000 l'ont laissé vide le 02-11
});
console.error(`  généré par : ${provider}`);

// nettoie : retire tout fence (```yaml / ```markdown / ```), puis démarre au 1er '---'
let md = text.trim()
  .replace(/^```[a-z]*\s*/i, '')   // fence d'ouverture avec n'importe quel tag
  .replace(/```\s*$/, '')           // fence de fermeture
  .trim();
const fmStart = md.indexOf('---');
if (fmStart === -1) {
  console.error('⚠️ Aucun frontmatter (---) trouvé. Dump :');
  console.error(md.slice(0, 400));
  process.exit(1);
}
md = md.slice(fmStart);  // tout préambule éventuel ("Voici l'article :", "yaml", etc.) supprimé

// frontmatter YAML toujours valide en aval (échappe les " que le LLM laisse traîner)
const normalized = normalizeDraft(md);
if (!normalized) {
  console.error('⚠️ Frontmatter non délimité (--- … ---) introuvable. Dump :');
  console.error(md.slice(0, 400));
  process.exit(1);
}
md = normalized;

// Anti-IA : purge des tirets typographiques (le prompt les interdit, ceci rattrape les fuites)
const { md: purge, fixes } = purgerTirets(md);
if (fixes) console.error(`  ⚠ ${fixes} tiret(s) cadratin/demi-cadratin corrigé(s) mécaniquement (incise → virgule)`);
const restants = (purge.match(/[—–]/g) || []).length;
if (restants) console.error(`  ⚠ ${restants} tiret(s) non corrigeable(s) mécaniquement (la gate les bloquera)`);
md = purge;

const outPath = path.join(ROOT, 'drafts', `${slug}.md`);
await writeFile(outPath, md, 'utf8');
console.error(`✓ Draft écrit : drafts/${slug}.md (${Buffer.byteLength(md, 'utf8')} octets)`);
console.log(outPath);
