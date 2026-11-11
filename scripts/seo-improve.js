#!/usr/bin/env node
/**
 * seo-improve.js — Enrichit les articles en JSON-LD + byline + date MAJ + politique correction.
 * Idempotent : détecte les blocs déjà injectés (via marqueurs HTML) et les remplace.
 *
 * Usage :
 *   npm run seo:improve            → tous les articles de articles/
 *   npm run seo:improve <slug>     → un article spécifique
 *
 * Ce qu'il ajoute :
 *   1. Schema.org JSON-LD (Article ou TechArticle) dans le <head> — marqueur : <!-- seo:jsonld-article -->
 *   2. Schema.org JSON-LD FAQPage si l'article a une section FAQ — marqueur : <!-- seo:jsonld-faq -->
 *   3. Byline auteur + dates publication/modification sous le hero-meta — marqueur : <!-- seo:byline -->
 *   4. Politique de corrections en fin (juste avant final-cta) — marqueur : <!-- seo:corrections -->
 *
 * Ce qu'il NE fait PAS :
 *   - Ajouter un cas vécu perso (nécessite input Jérémy article par article)
 *   - Modifier le corps éditorial (trop risqué automatiquement)
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ARTICLES = path.join(ROOT, 'articles');

const SITE_URL = 'https://jeremysagnier.com';
const AUTHOR = {
  name: 'Jérémy Sagnier',
  url: SITE_URL + '/',
  sameAs: [
    'https://www.linkedin.com/in/j%C3%A9r%C3%A9my-sagnier/',
    'https://x.com/JeremySagnier',
    'https://www.youtube.com/@jeremy-sagnier',
  ],
};
const PUBLISHER = {
  '@type': 'Person',
  name: 'Jérémy Sagnier',
  url: SITE_URL + '/',
};

const log = {
  info: (m) => console.log(`\x1b[36m•\x1b[0m ${m}`),
  ok:   (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`),
  warn: (m) => console.log(`\x1b[33m!\x1b[0m ${m}`),
  err:  (m) => console.error(`\x1b[31m×\x1b[0m ${m}`),
  section: (m) => console.log(`\n\x1b[1m${m}\x1b[0m`),
};

// Dates publication hardcodées — sources : mtime git + connaissance projet
// Format : slug → { published, modified }
const PUBLISH_DATES = {
  'agents-ia-guide':                  { published: '2026-04-15', modified: '2026-04-21' },
  'autoresearch-karpathy':            { published: '2026-04-12', modified: '2026-04-20' },
  'better-call-vs-associe':           { published: '2026-04-20', modified: '2026-04-20' },
  'outil-vente-claude-code':   { published: '2026-04-15', modified: '2026-04-20' },
  'hermes-agent':                     { published: '2026-04-10', modified: '2026-04-20' },
  'karpathy':                         { published: '2026-04-08', modified: '2026-04-20' },
  'limova-vs-claude-code':            { published: '2026-04-20', modified: '2026-04-20' },
  'llm-wiki-karpathy':                { published: '2026-04-11', modified: '2026-04-20' },
  'loops-claude':                     { published: '2026-04-05', modified: '2026-04-20' },
  'tuto-agent-contrats':              { published: '2026-04-17', modified: '2026-04-20' },
  'tuto-agent-gmail':                 { published: '2026-04-16', modified: '2026-04-20' },
  'veille-pour-demain':               { published: '2026-04-14', modified: '2026-04-20' },
};

function extractMeta(html) {
  const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1]?.replace(' — par Jérémy Sagnier', '').trim() || '';
  const description = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '';
  // Trouve le H1 (premier) dans <section class="hero">
  const h1Match = html.match(/<section class="hero">[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/);
  const h1Text = h1Match ? h1Match[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : title;
  return { title, description, h1Text };
}

function extractFAQ(html) {
  // Cherche une section avec id="faq" ou avec les H3 qui ressemblent à des questions
  const faqSectionMatch = html.match(/<section[^>]*id="faq"[^>]*>([\s\S]*?)<\/section>/);
  if (!faqSectionMatch) return [];
  const section = faqSectionMatch[1];

  // Extrait les paires <h3>Question</h3> <p>Réponse</p>
  const pairs = [];
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(section)) !== null) {
    const question = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
      // Enlève le préfixe numérique "1. " ou "1) "
      .replace(/^\d+[\.\)]\s*/, '');
    const answer = m[2].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    if (question && answer && question.length < 200) {
      pairs.push({ question, answer });
    }
  }
  return pairs;
}

function buildArticleJSONLD(slug, meta, dates) {
  const isTutorial = slug.startsWith('tuto-') || slug.includes('guide');
  const type = isTutorial ? 'TechArticle' : 'Article';
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': type,
    'headline': meta.title,
    'description': meta.description,
    'author': {
      '@type': 'Person',
      'name': AUTHOR.name,
      'url': AUTHOR.url,
      'sameAs': AUTHOR.sameAs,
    },
    'publisher': PUBLISHER,
    'datePublished': dates.published,
    'dateModified': dates.modified,
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/articles/${slug}.html`,
    },
    'inLanguage': 'fr-FR',
  };
  return `<!-- seo:jsonld-article -->
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>
<!-- /seo:jsonld-article -->`;
}

function buildFAQJSONLD(faqPairs) {
  if (!faqPairs || faqPairs.length === 0) return '';
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqPairs.map(p => ({
      '@type': 'Question',
      'name': p.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': p.answer,
      },
    })),
  };
  return `<!-- seo:jsonld-faq -->
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>
<!-- /seo:jsonld-faq -->`;
}

function buildBylineHTML(dates) {
  const fmtFR = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  return `<!-- seo:byline -->
<div class="seo-byline" style="max-width:880px; margin:24px auto 0; padding:14px 20px; background:var(--surface); border:1px solid var(--line-strong); border-radius:14px; display:flex; flex-wrap:wrap; align-items:center; gap:14px; font-size:13.5px; color:var(--ink-soft)">
  <a href="../index.html#story" style="display:inline-flex; align-items:center; gap:10px; text-decoration:none; color:var(--ink); font-weight:700">
    <span style="width:8px; height:8px; border-radius:50%; background:var(--fuchsia)"></span>
    Jérémy Sagnier
  </a>
  <span style="color:var(--ink-muted)">·</span>
  <span>Entrepreneur · pas dev · teste l'IA tous les jours</span>
  <span style="margin-left:auto; font-family:'JetBrains Mono', monospace; font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-muted)">
    Publié ${fmtFR(dates.published)} · MAJ ${fmtFR(dates.modified)}
  </span>
</div>
<!-- /seo:byline -->`;
}

function buildCorrectionsHTML() {
  return `<!-- seo:corrections -->
<section class="seo-corrections" style="padding:36px 0; border-top:1px solid var(--line); background:var(--bg-2)">
  <div class="container" style="max-width:880px; margin:0 auto; padding:0 28px">
    <div style="display:flex; align-items:flex-start; gap:14px; padding:20px 24px; background:var(--surface); border:1px solid var(--line-strong); border-left:4px solid var(--teal); border-radius:14px">
      <span style="font-size:22px; flex-shrink:0">✉</span>
      <div>
        <h4 style="font-family:'Archivo Black', sans-serif; font-size:14px; letter-spacing:-.01em; text-transform:uppercase; margin-bottom:6px; color:var(--ink)">Tu repères une erreur ?</h4>
        <p style="font-size:14px; line-height:1.55; color:var(--ink-soft); margin:0">
          Une info obsolète, un chiffre qui a bougé, une source périmée ? <strong style="color:var(--ink)">Écris-moi à <a href="mailto:sagnier.jeremy@gmail.com" style="color:var(--fuchsia); text-decoration:none; font-weight:600">sagnier.jeremy@gmail.com</a></strong> · je corrige en 48h max et je note la date de MAJ en haut de l'article. Les retours terrain valent mille fois les articles — je lis tout, je réponds.
        </p>
      </div>
    </div>
  </div>
</section>
<!-- /seo:corrections -->`;
}

function injectOrReplace(html, newBlock, markerOpen, markerClose) {
  const re = new RegExp(`${markerOpen}[\\s\\S]*?${markerClose}`, 'g');
  if (re.test(html)) {
    return html.replace(re, newBlock);
  }
  return null; // appelant insère manuellement
}

async function improveArticle(slug) {
  const filePath = path.join(ARTICLES, `${slug}.html`);
  if (!existsSync(filePath)) throw new Error(`article introuvable : ${slug}`);

  let html = await readFile(filePath, 'utf8');
  const meta = extractMeta(html);
  const dates = PUBLISH_DATES[slug] || { published: '2026-04-20', modified: '2026-04-21' };
  const faq = extractFAQ(html);

  const actions = [];

  // === 1. JSON-LD Article ===
  const articleJsonld = buildArticleJSONLD(slug, meta, dates);
  const articleReplaced = injectOrReplace(html, articleJsonld, '<!-- seo:jsonld-article -->', '<!-- /seo:jsonld-article -->');
  if (articleReplaced) {
    html = articleReplaced;
    actions.push('JSON-LD Article · remplacé');
  } else {
    // Insertion après <meta name="description"...>
    html = html.replace(
      /(<meta name="description"[^>]*>)/,
      `$1\n\n${articleJsonld}`
    );
    actions.push('JSON-LD Article · ajouté');
  }

  // === 2. JSON-LD FAQPage (si FAQ détectée) ===
  if (faq.length > 0) {
    const faqJsonld = buildFAQJSONLD(faq);
    const faqReplaced = injectOrReplace(html, faqJsonld, '<!-- seo:jsonld-faq -->', '<!-- /seo:jsonld-faq -->');
    if (faqReplaced) {
      html = faqReplaced;
      actions.push(`JSON-LD FAQPage · remplacé (${faq.length} questions)`);
    } else {
      // Insertion juste après le JSON-LD Article
      html = html.replace(
        '<!-- /seo:jsonld-article -->',
        `<!-- /seo:jsonld-article -->\n\n${faqJsonld}`
      );
      actions.push(`JSON-LD FAQPage · ajouté (${faq.length} questions)`);
    }
  }

  // === 3. Byline sous le hero ===
  const bylineHTML = buildBylineHTML(dates);
  const bylineReplaced = injectOrReplace(html, bylineHTML, '<!-- seo:byline -->', '<!-- /seo:byline -->');
  if (bylineReplaced) {
    html = bylineReplaced;
    actions.push('Byline auteur · remplacé');
  } else {
    // Insertion juste après la fermeture de <section class="hero">
    const heroClose = html.match(/<\/section>\s*(<!-- TL;DR -->|<!-- tldr |<div class="tldr"|<div class="container">\s*<div class="tldr")/);
    if (heroClose) {
      const pos = html.indexOf(heroClose[0]);
      const insertAt = pos + heroClose[0].indexOf(heroClose[1]);
      html = html.slice(0, insertAt) + `${bylineHTML}\n\n` + html.slice(insertAt);
      actions.push('Byline auteur · ajouté après hero');
    } else {
      // Fallback : après la première </section>
      html = html.replace(/(<\/section>)/, `$1\n\n${bylineHTML}`);
      actions.push('Byline auteur · ajouté (fallback)');
    }
  }

  // === 4. Politique de corrections avant final-cta ===
  const correctionsHTML = buildCorrectionsHTML();
  const correctionsReplaced = injectOrReplace(html, correctionsHTML, '<!-- seo:corrections -->', '<!-- /seo:corrections -->');
  if (correctionsReplaced) {
    html = correctionsReplaced;
    actions.push('Politique corrections · remplacé');
  } else {
    // Insertion juste avant <section class="final-cta"> OU avant <footer>
    if (html.includes('<section class="final-cta"')) {
      html = html.replace(
        /(<section class="final-cta")/,
        `${correctionsHTML}\n\n$1`
      );
      actions.push('Politique corrections · ajouté avant final-cta');
    } else {
      html = html.replace(
        /(<footer)/,
        `${correctionsHTML}\n\n$1`
      );
      actions.push('Politique corrections · ajouté avant footer');
    }
  }

  await writeFile(filePath, html, 'utf8');
  return actions;
}

async function main() {
  const args = process.argv.slice(2);
  let slugs;
  if (args.length > 0) {
    slugs = args;
  } else {
    const files = await readdir(ARTICLES);
    slugs = files
      .filter(f => f.endsWith('.html') && !f.startsWith('_'))
      .map(f => f.replace(/\.html$/, ''));
  }

  log.section(`🎯 Enrichissement SEO · ${slugs.length} article(s)`);

  let success = 0, fail = 0;
  for (const slug of slugs) {
    try {
      const actions = await improveArticle(slug);
      log.ok(`${slug}`);
      for (const a of actions) console.log(`    · ${a}`);
      success++;
    } catch (e) {
      log.err(`${slug} · ${e.message}`);
      fail++;
    }
  }

  log.section(`✨ Terminé · ${success} OK · ${fail} erreur(s)`);
  if (success > 0) {
    log.info(`Git status : git diff --stat articles/ pour voir les modifs`);
    log.info(`Test visuel : ouvre chaque article, vérifie la byline sous le hero`);
    log.info(`Validate JSON-LD : https://validator.schema.org/ (copie l'URL de l'article prod)`);
  }
}

main().catch(e => { log.err(e.message); if (process.env.DEBUG) console.error(e.stack); process.exit(1); });
