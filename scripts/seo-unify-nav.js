#!/usr/bin/env node
// Unifie la nav sur toutes les pages du site.
// 1. Définit un menu unique enrichi (Conseil + Bio + Workflows + Image IA + Veille)
// 2. Remplace les <nav class="mini-nav">...</nav> existantes
// 3. Supprime les <header class="header">...</header> (doublons cachés en CSS)
// 4. Injecte le menu sur les pages qui n'en ont pas (404, légales, bio, consultant)
// 5. S'assure que assets/nav-v2.css est linké + assets/nav-dropdown.js
// Idempotent.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
// IMPORTANT : on exclut les dossiers d'outils internes (templates email, scripts OG,
// brainstorm artifacts) car ce sont pas des pages publiques déployées.
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.superpowers',
  'audits', 'drafts', '_internal',
  'photos', 'downloads', 'feed',
  'templates', 'scripts',
]);
const SKIP_FILES = new Set([
  'contact-sheet.html',
  'classify-channels.html',
  '_TEMPLATE.html',
]);

// Pour les pages dans /articles/, on doit utiliser des chemins relatifs ../ pour les ressources
// MAIS toutes les URLs internes du menu sont absolues (/apprendre, /articles, etc.) donc OK.
// On utilise toujours /assets/* pour les CSS (chemin absolu).
// Les pages racine utilisent assets/*, les articles utilisent ../assets/*.

// Menu « revue » (refonte de novembre 2026) : ligne d'édition, sceau + nom, bouton S'abonner.
// Version FR seulement : les pages anglaises sont habillées par scripts/revue-entete-pied.mjs,
// à relancer après ce script (il remet aussi en anglais un menu resté en français).
const NAV_BLOCK = (relCss) => `<!-- NAV-UNIFIED-START -->
<div class="rv-edition"><div class="rv-edition-in"><span data-rv-date>Édition de la semaine</span><span class="rv-edition-mid">IA · business · fait à Mougins</span><span>La lettre part vendredi à 9 h</span></div></div>
<script>(function(){var en=document.documentElement.lang==="en",d=new Date().toLocaleDateString(en?"en-US":"fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});document.querySelectorAll("[data-rv-date]").forEach(function(e){e.textContent=(en?"Edition of ":"Édition du ")+d;});})();</script>
<nav class="mini-nav rv-nav" aria-label="Navigation principale">
  <a class="brand rv-marque" href="/" aria-label="Accueil, Jérémy Sagnier"><svg class="rv-sceau-mini" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="49" fill="#141414"/><g transform="translate(50 50) scale(.72) translate(-50 -50)" fill="#EF426F"><circle cx="50" cy="50" r="14"/><polygon points="50,0 55,40 45,40"/><polygon points="100,50 60,55 60,45"/><polygon points="50,100 45,60 55,60"/><polygon points="0,50 40,45 40,55"/><polygon points="85,15 62,42 58,38"/><polygon points="85,85 58,62 62,58"/><polygon points="15,85 38,58 42,62"/><polygon points="15,15 42,38 38,42"/></g><circle cx="50" cy="50" r="4.5" fill="#141414"/></svg><span class="rv-nom">Jérémy Sagnier</span></a>
  <button class="burger" type="button" aria-expanded="false" aria-controls="mini-nav-links" aria-label="Ouvrir le menu">
    <span class="burger-icon" aria-hidden="true"></span>
  </button>
  <div class="links" id="mini-nav-links">
    <a href="/apprendre">Apprendre</a>
    <a href="/articles">Articles</a>
    <a href="/podcast">Podcast</a>
    <a href="/#newsletters" class="rv-sabonner">S'abonner →</a>
    <div class="more-wrap">
      <button type="button" class="more-trigger" aria-haspopup="true" aria-expanded="false" aria-label="Plus de pages">
        Plus
        <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
          <path d="M1 1l4 4 4-4"/>
        </svg>
      </button>
      <div class="more-menu" role="menu">
        <a href="/modeles-ia" role="menuitem">
          <span class="more-icon">🧠</span>
          <span class="more-text"><strong>Modèles IA</strong><span>Comparatif Claude, GPT, Gemini…</span></span>
        </a>
        <a href="/modeles-image-ia" role="menuitem">
          <span class="more-icon">🎨</span>
          <span class="more-text"><strong>Modèles image IA</strong><span>Génération d'images, audio, vidéo</span></span>
        </a>
        <a href="/lexique" role="menuitem">
          <span class="more-icon">📚</span>
          <span class="more-text"><strong>Lexique IA</strong><span>Plus de 270 termes expliqués</span></span>
        </a>
        <a href="/workflows" role="menuitem">
          <span class="more-icon">🔁</span>
          <span class="more-text"><strong>Workflows</strong><span>L'IA par métier</span></span>
        </a>
        <a href="/outils" role="menuitem">
          <span class="more-icon">🛠</span>
          <span class="more-text"><strong>Mes outils</strong><span>Ma stack IA et web</span></span>
        </a>
        <a href="/github" role="menuitem">
          <span class="more-icon">⚡</span>
          <span class="more-text"><strong>GitHub</strong><span>Pour non-devs · guide complet</span></span>
        </a>
        <a href="/news" role="menuitem">
          <span class="more-icon">📡</span>
          <span class="more-text"><strong>Veille IA</strong><span>Auto-mise à jour toutes les 6h</span></span>
        </a>
        <div class="more-separator"></div>
        <a href="/jeremy-sagnier" role="menuitem">
          <span class="more-icon">👤</span>
          <span class="more-text"><strong>Qui je suis</strong><span>Bio + parcours + contact</span></span>
        </a>
        <div class="more-separator"></div>
        <a href="/precommande-photos-personal-branding" class="more-cta" role="menuitem">
          <span class="more-icon">💳</span>
          <span class="more-text"><strong>Photos perso · 39 €</strong><span>Générateur de photos IA</span></span>
        </a>
      </div>
    </div>
  </div>
  <button class="theme-toggle-v2" id="themeToggle" aria-label="Changer de thème">
    <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79Z"/>
    </svg>
    <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  </button>
</nav>
<!-- NAV-UNIFIED-END -->`;

const NAV_ASSETS = (isArticle) => {
  const prefix = isArticle ? '../assets' : 'assets';
  return `<link rel="stylesheet" href="${prefix}/nav-v2.css?v=20260520-unified">
<script src="${prefix}/nav-dropdown.js?v=20260520-unified" defer></script>`;
};

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.html') && !SKIP_FILES.has(entry)) out.push(full);
  }
  return out;
}

// Patterns
const RE_OLD_MINI_NAV = /<nav\s+class="mini-nav"[\s\S]*?<\/nav>/;
const RE_UNIFIED_BLOCK = /<!--\s*NAV-UNIFIED-START\s*-->[\s\S]*?<!--\s*NAV-UNIFIED-END\s*-->/;
const RE_HEADER_DUPLICATE = /<header\s+class="header"[\s\S]*?<\/header>\s*/g;
const RE_NAV_CSS_LINK = /<link\s+rel="stylesheet"\s+href="(?:\.\.\/)?assets\/nav-v2\.css/;
const RE_NAV_JS = /<script\s+src="(?:\.\.\/)?assets\/nav-dropdown\.js/;

const files = walk(ROOT);
let replaced = 0, injected = 0, duplicatesRemoved = 0, cssAdded = 0, skipped = 0;
const report = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  const isArticle = rel.startsWith('articles/');
  const original = readFileSync(file, 'utf8');
  let content = original;
  const ops = [];

  // 1. Supprimer les <header class="header"> doublons (CSS les cache déjà mais on nettoie)
  const headerMatches = (content.match(RE_HEADER_DUPLICATE) || []).length;
  if (headerMatches > 0) {
    content = content.replace(RE_HEADER_DUPLICATE, '');
    duplicatesRemoved += headerMatches;
    ops.push(`-${headerMatches} header.header`);
  }

  // 2. Remplacer / injecter le menu unifié
  const newBlock = NAV_BLOCK(isArticle ? '../assets' : 'assets');
  if (RE_UNIFIED_BLOCK.test(content)) {
    // Déjà unifié → on remplace pour être idempotent (mise à jour)
    content = content.replace(RE_UNIFIED_BLOCK, newBlock);
    replaced++;
    ops.push('update');
  } else if (RE_OLD_MINI_NAV.test(content)) {
    // Ancienne mini-nav → remplace
    content = content.replace(RE_OLD_MINI_NAV, newBlock);
    replaced++;
    ops.push('replace');
  } else {
    // Pas de nav → injecte juste après <body> (en respectant éventuels attributs)
    const bodyMatch = content.match(/<body[^>]*>/);
    if (!bodyMatch) { skipped++; report.push({ rel, op: 'skip (no <body>)' }); continue; }
    const insertPos = bodyMatch.index + bodyMatch[0].length;
    content = content.slice(0, insertPos) + '\n\n' + newBlock + '\n' + content.slice(insertPos);
    injected++;
    ops.push('inject');
  }

  // 3. S'assurer que assets/nav-v2.css et nav-dropdown.js sont linkés
  const assets = NAV_ASSETS(isArticle);
  const needsCss = !RE_NAV_CSS_LINK.test(content);
  const needsJs = !RE_NAV_JS.test(content);
  if (needsCss || needsJs) {
    // Inject le bloc assets juste avant </head>
    const headIdx = content.search(/<\/head>/);
    if (headIdx !== -1) {
      // Reconstruire un bloc minimal qui n'inclut que ce qui manque
      let toInject = '';
      if (needsCss) toInject += `<link rel="stylesheet" href="${isArticle ? '../assets' : 'assets'}/nav-v2.css?v=20260520-unified">\n`;
      if (needsJs)  toInject += `<script src="${isArticle ? '../assets' : 'assets'}/nav-dropdown.js?v=20260520-unified" defer></script>\n`;
      content = content.slice(0, headIdx) + toInject + content.slice(headIdx);
      cssAdded++;
      ops.push(`+${needsCss ? 'css' : ''}${needsJs ? 'js' : ''}`);
    }
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    report.push({ rel, op: ops.join(', ') });
  }
}

console.log(`\n=== Unification nav · résumé ===\n`);
console.log(`  ${replaced} mini-nav remplacées`);
console.log(`  ${injected} navs injectées (pages sans nav)`);
console.log(`  ${duplicatesRemoved} <header.header> doublons supprimés`);
console.log(`  ${cssAdded} pages avec CSS/JS nav ajoutés`);
console.log(`  ${skipped} skip\n`);
console.log(`Détail :\n`);
for (const { rel, op } of report) console.log(`  · ${rel}  [${op}]`);
