/**
 * config.mjs — Source de vérité unique du système de blog auto jerwis.fr
 *
 * Tout le système (génération, gate qualité, cron) lit ce fichier.
 * Modifier ICI : ton, mots bannis, seuils, checklist SEO, modèles.
 */

// ─────────────────────────────────────────────────────────────
// MODÈLES (résolus depuis l'env en prod, défauts raisonnables)
// ─────────────────────────────────────────────────────────────
export const MODELS = {
  // Générateur : Sonnet pour les articles SEO (Type A), Opus pour making-of/opinion (Type B)
  generator_seo: 'claude-sonnet-4-6',
  generator_makingof: 'claude-opus-4-8',
  // Juges : famille DIFFÉRENTE du générateur quand possible (anti self-preference).
  // Ici on garde Claude mais on impose une posture adversariale + rubrique ancrée.
  judge: 'claude-sonnet-4-6',
};

// File de sujets (plan du 02-11-2026) : à ce nombre de sujets 'pending' ou moins,
// refill-topics.mjs remplit la file et notify-queue.mjs prévient Jérémy.
export const SEUIL_FILE = 4;

// ─────────────────────────────────────────────────────────────
// TON LEO — règles non négociables (miroir du CLAUDE.md)
// ─────────────────────────────────────────────────────────────
export const TON_LEO = `
TON DE VOIX "LEO" (règle absolue du site jerwis.fr) :
- 1ère personne directe : "Je teste", "Je partage", "J'ai construit".
- TUTOIEMENT OBLIGATOIRE : l'article dit "tu" au lecteur, jamais "vous". Le tutoiement
  N'EST PAS de la familiarité et ne doit JAMAIS être compté comme un défaut de ton.
- Chaleureux mais PAS familier. "Familier" = argot et langage "de pote" ("ouais",
  "franchement", "mec"), pas le tutoiement ni les mises en garde pratiques.
- Les encarts conseil/piège/astuce (callouts) font partie du FORMAT du site : donner
  un conseil concret ou signaler un piège n'est pas du "ton consultant".
- Phrases courtes. Mots simples. Pas de jargon non expliqué (si un terme technique
  est nécessaire, l'expliquer en une phrase ou le lier au lexique).
- Jérémy Sagnier n'est PAS développeur, PAS codeur. Ne JAMAIS l'appeler ainsi.
  C'est un entrepreneur curieux qui refuse d'être dépassé par l'IA.
- Transparence : assumer l'usage de l'IA quand c'est pertinent.
- Pitch central, à n'utiliser qu'une fois max et seulement si pertinent :
  "Je fais tout ça d'abord pour moi."
- Montrer le travail : chiffres concrets, sources datées, processus.
- Pas de pose commerciale ("inscrivez-vous pour du contenu exclusif").
- Pas de disclaimer consultant ("il est important de noter que...").
`.trim();

// Mots/expressions BANNIS → toute occurrence dans le corps = BLOQUANT.
// (On exclut le <head>/frontmatter au moment du grep ; voir qa-gate.)
// NB : "développeur/codeur" NE sont PAS bannis en tant que mots — la règle CLAUDE.md
// interdit de QUALIFIER Jérémy de dev, pas le mot. "Je ne suis pas développeur",
// "pour les non-développeurs", "sans dépendre d'un développeur" sont ON-BRAND.
// Le cas interdit (Jérémy = dev) est traité par DEV_PERSONNE ci-dessous.
export const MOTS_BANNIS = [
  // familier
  '\\btruc\\b', '\\btrucs\\b', '\\bkif\\b', '\\bkiffe\\b', '\\bkiffer\\b',
  '\\btaf\\b', '\\bmec\\b', '\\bouais\\b', '\\bdaube\\b',
  // anglicismes paresseux
  '\\blow-cost\\b', '\\bkiller\\b', '\\bsweet-spot\\b', '\\bsub-seconde\\b', '\\bPAYG\\b',
  // anonymisation employeur Shirley
  '\\bGMF\\b',
];

// CLICHÉS SEO / consultant → PAS bloquant, mais pénalité douce (ton "fiche produit").
// Ce sont les tics d'écriture qui font "contenu généré pour Google" plutôt que "blog perso".
// Détectés mécaniquement (qa-gate C6) + bannis dans le prompt de génération.
export const CLICHES = [
  '\\bincontournables?\\b', '\\bpanorama\\b', "\\bà l'ère de\\b",
  '\\bdans un monde où\\b', '\\bforce est de constater\\b',
  '\\bil est important de (noter|souligner|rappeler|comprendre)\\b',
  '\\bbénéfices concrets\\b', '\\bcompétence (professionnelle )?(clé|à part entière)\\b',
  '\\bne sont pas abstraits?\\b', '\\bà ne pas (négliger|sous-estimer)\\b',
  '\\bplongeons\\b', '\\bdécortiquons ensemble\\b', '\\bsans plus attendre\\b',
];

// TICS D'ÉCRITURE IA → BLOQUANTS partout (articles via qa-gate, posts LinkedIn via
// linkedin-post.mjs). Demande Jérémy 2026-08-28 : le contenu ne doit pas « sentir l'IA ».
// Les tirets cadratins/demi-cadratins sont traités à part (regex directe [—–] dans les
// gates, jamais remplacés mécaniquement par « : », qui est le même tic). Ici : les
// tournures verbales détectables sans faux positif. Les règles plus fines (liste de
// trois, anaphores, rythme) vivent dans les prompts, une regex ne sait pas les juger.
export const TICS_IA = [
  "\\bà l['’]ère de\\b", '\\bdans un monde où\\b', '\\ben résumé\\b', '\\bau final\\b',
  '\\bune chose est sûre\\b', '\\bce qui est certain\\b', '\\bspoiler\\b',
  '\\bplonge[rz]? dans\\b', '\\brévolutionn\\w+\\b', '\\bgame.changer\\b',
  '\\bbooste[rz]?\\b', '\\bincontournable', '\\bsans précédent\\b',
];

// Jérémy qualifié de dev/codeur = BLOQUANT. On cible le sens "il EST dev",
// PAS les usages légitimes ("je ne suis pas développeur", "non-développeurs").
// Le "pas" est exclu via le fait que "je suis" n'est pas contigu dans "je ne suis pas".
export const DEV_PERSONNE = [
  "\\bje suis (un |une )?(développeur|développeuse|codeur|codeuse|dev)\\b",
  "\\bjérémy[^.]{0,20}\\b(est|,) (un |une )?(développeur|codeur|dev)\\b",
  "\\ben tant que (développeur|codeur|dev)\\b",
  "\\bdev fullstack\\b",
];

// ─────────────────────────────────────────────────────────────
// FRONTMATTER — contrat exact attendu par scripts/publish.js
// ─────────────────────────────────────────────────────────────
export const FRONTMATTER_REQUIRED = [
  'slug', 'titre', 'description', 'hero_ligne_1', 'lead', 'duree', 'niveau', 'published',
];
export const FRONTMATTER_OPTIONAL = [
  'titre_seo', 'numero', 'categorie', 'hero_ligne_2', 'hero_ligne_3',
  'outils', 'tldr', 'parcours_etape',
];

// ─────────────────────────────────────────────────────────────
// CHECKLIST SEO 2026 — vérifs mécaniques (issues de la recherche agent B)
// ─────────────────────────────────────────────────────────────
export const SEO_RULES = {
  titre_seo_min: 40, titre_seo_max: 65,        // <title>
  description_min: 140, description_max: 165,    // meta description
  lead_words_min: 60, lead_words_max: 140,       // TL;DR/réponse directe en haut
  body_words_min_A: 1200, body_words_max_A: 2600, // article SEO (Type A)
  body_words_min_B: 1500,                          // making-of (Type B), pas de max
  h2_min: 3,                                       // hiérarchie
  words_per_h2_max: 400,                           // un Hn tous les ~250-350 mots
  internal_links_min: 2,                           // maillage interne
  internal_links_max: 12,
  tldr_points_min: 3, tldr_points_max: 6,
  sentence_words_warn: 30,                          // lisibilité : phrase trop longue
  // GEO (citations IA) :
  require_stat_sourcee: true,    // ≥1 statistique sourcée + datée
  require_faq: true,             // bloc FAQ Q/R en bas
};

// ─────────────────────────────────────────────────────────────
// RUBRIQUE QUALITÉ /70 — 7 critères × /10 (issue de l'agent C)
// ─────────────────────────────────────────────────────────────
export const RUBRIC = {
  criteria: [
    { key: 'C1_factualite',  label: 'Factualité / sources',     max: 10, blocking_below: 6 },
    { key: 'C2_ton_leo',     label: 'Ton Leo',                  max: 10, blocking_below: 6 },
    { key: 'C3_mots_bannis', label: 'Mots bannis',              max: 10, blocking_below: 10 }, // toute occurrence = 0 = bloquant
    { key: 'C4_originalite', label: 'Originalité (vs 27 art.)', max: 10, blocking_below: null }, // bloquant via cosine>0.85
    { key: 'C5_coherence',   label: 'Cohérence interne',        max: 10, blocking_below: null }, // avertissement
    { key: 'C6_seo',         label: 'SEO on-page',              max: 10, blocking_below: null }, // avertissement
    { key: 'C7_lisibilite',  label: 'Lisibilité',               max: 10, blocking_below: null }, // avertissement
  ],
  total_max: 70,
  // Décision finale
  auto_publish_min: 56,   // ≥ 56/70 ET zéro bloquant → publiable (mode auto)
  review_queue_min: 42,   // 42-55 → file de relecture 1 clic
  // < 42 OU bloquant → rejet + régénération (max 2 boucles)
  max_regen: 2,
};

// ─────────────────────────────────────────────────────────────
// GARDE-FOUS
// ─────────────────────────────────────────────────────────────
export const GUARDRAILS = {
  max_articles_per_day: 1,    // 1 article par run, jamais de batch
  cadence: '2/semaine',        // lun + jeu (décision Jérémy)
  ratio_typeA_seo: 0.7,        // 70% acquisition / 30% making-of
};

export const SITE_URL = 'https://jerwis.fr';
