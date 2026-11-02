// Génère podcast.html (Layout A éditorial magazine) depuis data/episodes.json
// Usage : npm run podcast:page

import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml, formatDurationMMSS } from './test-helpers.js';

const ROOT = process.cwd();
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/episodes.json'), 'utf8'));
const OUT = path.join(ROOT, 'podcast.html');
const SITE = 'https://jerwis.fr';

function episodeCard(ep, idx) {
  const duration = formatDurationMMSS(ep.duration_seconds);
  return `
      <article class="pod-ep" id="${ep.slug}" data-accent="${ep.accent_color}">
        <a class="pod-ep-cover" href="#${ep.slug}">
          <img src="${ep.cover}" alt="Pochette ${escapeHtml(ep.title)}" width="120" height="120" loading="lazy" decoding="async">
        </a>
        <div class="pod-ep-body">
          <div class="pod-ep-num">Épisode ${ep.id} · ${duration}</div>
          <h3 class="pod-ep-title">${escapeHtml(ep.title)}</h3>
          <p class="pod-ep-desc">${escapeHtml(ep.description_short)}</p>
          <div class="pod-player" data-podcast-player data-src="${escapeHtml(ep.audio_url)}" data-ep="${ep.id}"></div>
          ${ep.guests_voices.length > 0 ? `<details class="pod-ep-cast"><summary>Casting voix</summary><ul>${ep.guests_voices.map((v) => `<li>${escapeHtml(v)}</li>`).join('')}</ul></details>` : ''}
        </div>
      </article>`;
}

const s = DATA.series;
const totalMinutes = Math.round(DATA.episodes.reduce((acc, e) => acc + e.duration_seconds, 0) / 60);
const firstEp = DATA.episodes[0];

const html = `<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(s.title)} · Podcast par Jerwis Productions — Jérémy Sagnier</title>
<meta name="description" content="${escapeHtml(s.description_short)} Série narrative FR produite par Jerwis Productions. ${DATA.episodes.length} épisodes, ${totalMinutes} minutes, mastering studio.">

<meta property="og:title" content="${escapeHtml(s.title)} · Podcast par Jerwis Productions">
<meta property="og:description" content="${escapeHtml(s.description_short)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${s.site_url}">
<meta property="og:image" content="${SITE}${s.cover_3000}">
<meta property="og:locale" content="fr_FR">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@JeremySagnier">
<meta name="twitter:creator" content="@JeremySagnier">
<meta name="twitter:title" content="${escapeHtml(s.title)} · Podcast par Jerwis Productions">
<meta name="twitter:description" content="${escapeHtml(s.description_short)}">
<meta name="twitter:image" content="${SITE}${s.cover_3000}">

<link rel="canonical" href="${s.site_url}">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(s.title)} RSS" href="${s.feed_url}">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "PodcastSeries",
  "name": "${s.title}",
  "description": ${JSON.stringify(s.description_long)},
  "inLanguage": "${s.language}",
  "url": "${s.site_url}",
  "image": "${SITE}${s.cover_3000}",
  "author": { "@type": "Person", "name": "${s.author}" },
  "publisher": { "@type": "Organization", "name": "${s.publisher}" },
  "webFeed": "${s.feed_url}"
}
</script>

<!-- Preload critical resources (perf · LCP/CWV) -->
<link rel="preload" as="font" type="font/woff2" href="assets/fonts/archivo-black.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="assets/fonts/archivo.woff2" crossorigin>
<link rel="preload" as="image" href="${s.cover}" type="image/webp">

<link rel="stylesheet" href="assets/fonts.css">
<link rel="stylesheet" href="assets/main.css">

<style>
  /* ===== Page podcast · Layout A éditorial magazine ===== */
  .pod-hero {
    padding: 64px 0 80px;
    background:
      radial-gradient(ellipse at 85% 15%, rgba(255,130,0,.15), transparent 50%),
      radial-gradient(ellipse at 10% 90%, rgba(0,178,169,.15), transparent 55%),
      radial-gradient(ellipse at 55% 55%, rgba(239,66,111,.12), transparent 60%),
      #0A0A0A;
    color: #F4EFE6;
    border-top: 1px solid rgba(255,255,255,.08);
  }
  .pod-hero-inner {
    display: grid;
    grid-template-columns: 400px 1fr;
    gap: 60px;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }
  .pod-hero-cover {
    width: 400px;
    aspect-ratio: 1/1;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(239,66,111,0.18), 0 10px 30px rgba(0,0,0,0.5);
  }
  .pod-hero-cover img { width: 100%; height: 100%; display: block; }
  .pod-hero-kicker {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: .25em;
    text-transform: uppercase;
    color: #00B2A9;
    margin-bottom: 16px;
  }
  .pod-hero h1 {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: clamp(48px, 7vw, 80px);
    line-height: 0.92;
    letter-spacing: -0.035em;
    color: #F4EFE6;
    text-transform: uppercase;
    margin-bottom: 20px;
  }
  .pod-hero h1 .slash { color: #00B2A9; font-weight: 400; }
  .pod-hero-lead {
    font-size: 17px;
    color: rgba(244,239,230,0.8);
    line-height: 1.55;
    margin-bottom: 26px;
    max-width: 560px;
  }
  .pod-cta-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 22px;
  }
  .pod-cta {
    padding: 12px 20px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: .15em;
    text-transform: uppercase;
    font-weight: 700;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .pod-cta.primary { background: #EF426F; color: #F4EFE6; }
  .pod-cta.primary:hover { background: #F4EFE6; color: #0A0A0A; }
  .pod-cta.ghost { background: transparent; color: #F4EFE6; border: 1px solid rgba(255,255,255,.3); }
  .pod-cta.ghost:hover { border-color: #F4EFE6; }
  .pod-hero-meta {
    display: flex;
    gap: 24px;
    padding-top: 24px;
    border-top: 1px solid rgba(255,255,255,0.12);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: rgba(244,239,230,0.55);
  }
  .pod-hero-meta strong { color: #F4EFE6; }

  /* ===== Plateformes ===== */
  .pod-platforms {
    background: var(--bg);
    padding: 36px 0;
    border-bottom: 1px solid var(--line);
  }
  .pod-platforms-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
  }
  .pod-platforms-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: .22em;
    text-transform: uppercase;
    color: var(--ink-soft);
    font-weight: 700;
    margin-right: 12px;
  }
  .pod-platform {
    padding: 10px 18px;
    border-radius: 999px;
    border: 1px solid var(--line-strong);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: .12em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--ink);
    text-decoration: none;
    transition: all .15s;
  }
  .pod-platform:hover { background: var(--ink); color: var(--bg); border-color: var(--ink); }

  /* ===== CTA newsletter (après hero) ===== */
  .pod-cta-nl {
    background: var(--bg-2);
    padding: 28px 0;
    border-bottom: 1px solid var(--line);
  }
  .pod-cta-nl-inner {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    gap: 24px;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  .pod-cta-nl-text strong {
    font-family: 'Archivo', sans-serif;
    font-weight: 900;
    display: block;
    font-size: 16px;
    margin-bottom: 4px;
  }
  .pod-cta-nl-text span { font-size: 13px; color: var(--ink-soft); }
  .pod-cta-nl a {
    padding: 11px 22px;
    border-radius: 6px;
    background: #EF426F;
    color: #F4EFE6;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: .15em;
    text-transform: uppercase;
    font-weight: 700;
    text-decoration: none;
  }

  /* ===== Liste épisodes ===== */
  .pod-episodes {
    padding: 60px 0;
    background: var(--bg);
  }
  .pod-episodes-inner {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 24px;
  }
  .pod-section-title {
    font-family: 'Archivo Black', sans-serif;
    font-size: 22px;
    text-transform: uppercase;
    letter-spacing: -.01em;
    margin-bottom: 28px;
    color: var(--ink);
  }
  .pod-ep {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 24px;
    padding: 28px 0;
    border-top: 1px solid var(--line);
    align-items: flex-start;
  }
  .pod-ep:first-of-type { border-top: none; padding-top: 0; }
  .pod-ep-cover img {
    width: 120px;
    height: 120px;
    border-radius: 6px;
    display: block;
  }
  .pod-ep-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: .2em;
    text-transform: uppercase;
    color: #EF426F;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .pod-ep-title {
    font-family: 'Archivo', sans-serif;
    font-weight: 900;
    font-size: 20px;
    line-height: 1.15;
    letter-spacing: -.015em;
    color: var(--ink);
    margin-bottom: 8px;
  }
  .pod-ep-desc {
    font-size: 14.5px;
    line-height: 1.55;
    color: var(--ink-soft);
    margin-bottom: 14px;
  }
  .pod-ep-cast {
    margin-top: 12px;
    font-size: 13px;
    color: var(--ink-soft);
  }
  .pod-ep-cast summary { cursor: pointer; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .15em; text-transform: uppercase; font-weight: 700; }
  .pod-ep-cast ul { margin: 10px 0 0 20px; }
  .pod-ep-cast li { line-height: 1.5; }

  /* ===== Player ===== */
  [data-podcast-player] {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 14px 8px 8px;
    background: #0A0A0A;
    border-radius: 999px;
    max-width: 440px;
  }
  .pp-play {
    width: 34px; height: 34px;
    border: none;
    border-radius: 50%;
    background: #EF426F;
    color: #F4EFE6;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background .15s;
    flex-shrink: 0;
  }
  .pp-play:hover { background: #FF8200; }
  .pp-play svg { width: 14px; height: 14px; }
  [data-podcast-player] .pp-icon-pause { display: none; }
  [data-podcast-player][data-state="playing"] .pp-icon-play { display: none; }
  [data-podcast-player][data-state="playing"] .pp-icon-pause { display: block; }
  .pp-timeline {
    flex: 1;
    height: 5px;
    background: rgba(255,255,255,0.12);
    border-radius: 3px;
    position: relative;
    cursor: pointer;
  }
  .pp-timeline:focus { outline: 2px solid #00B2A9; outline-offset: 4px; }
  .pp-timeline-fill {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    background: #00B2A9;
    border-radius: 3px;
    width: 0%;
  }
  .pp-time {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: rgba(244,239,230,0.75);
    letter-spacing: .05em;
    flex-shrink: 0;
  }
  .pp-speed {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: .1em;
    font-weight: 700;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.2);
    color: #F4EFE6;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .pp-speed:hover { background: rgba(255,255,255,0.08); }

  /* ===== Mini marquee ===== */
  .pod-marquee {
    overflow: hidden;
    padding: 14px 0;
    background: linear-gradient(90deg, #00B2A9 0%, #EF426F 50%, #FF8200 100%);
    color: #fff;
    position: relative;
    border-top: 1px solid rgba(255,255,255,.1);
    border-bottom: 1px solid rgba(0,0,0,.15);
  }
  .pod-marquee::before {
    content: ""; position: absolute; inset: 0;
    background: rgba(10,10,10,.18); mix-blend-mode: multiply; pointer-events: none;
  }
  .pod-marquee-track {
    display: flex; gap: 40px; white-space: nowrap;
    animation: pod-marquee-scroll 50s linear infinite;
    font-family: 'Archivo Black', sans-serif;
    font-size: 17px;
    text-transform: uppercase;
    letter-spacing: -.01em;
    position: relative; z-index: 1;
  }
  .pod-marquee-track span {
    display: inline-flex; align-items: center; gap: 40px;
  }
  .pod-marquee-track span::after {
    content: "◆"; color: rgba(10,10,10,.5); font-size: 11px;
  }
  @keyframes pod-marquee-scroll { to { transform: translateX(-50%) } }

  /* ===== Responsive ===== */
  @media (max-width: 760px) {
    .pod-hero { padding: 44px 0 56px; }
    .pod-hero-inner { grid-template-columns: 1fr; gap: 32px; padding: 0 20px; text-align: center; }
    .pod-hero-cover { width: min(280px, 80vw); margin: 0 auto; }
    .pod-hero h1 { font-size: clamp(38px, 9vw, 56px); }
    .pod-cta-row { justify-content: center; }
    .pod-ep { grid-template-columns: 80px 1fr; gap: 16px; }
    .pod-ep-cover img { width: 80px; height: 80px; }
    [data-podcast-player] { max-width: 100%; flex-wrap: wrap; }
  }
</style>
</head>
<body>
<div class="bk-barre-place" style="height:44px" aria-hidden="true"></div>

<!-- Triple-stripe signature Fiesta (top du site) -->
<div class="triple-stripe" aria-hidden="true">
  <span style="background:#00B2A9"></span>
  <span style="background:#EF426F"></span>
  <span style="background:#FF8200"></span>
</div>

<!-- Header (structure identique aux autres pages du site) -->
<header class="header">
  <div class="container">
    <div class="header-inner">
      <a href="index.html" class="logo">
        <span class="logo-dot"></span>
        Jérémy Sagnier
      </a>
      <nav class="nav">
        <a href="apprendre.html">Apprendre</a>
        <a href="index.html#projects">Projets</a>
        <a href="index.html#newsletters">Newsletters</a>
        <a href="podcast.html" style="color:var(--fuchsia)">Podcast</a>
        <a href="index.html#freebies">Télécharger</a>
        <a href="index.html#opinions">Opinions</a>
        <a href="lexique.html">Lexique</a>
      </nav>
      <button class="theme-toggle" id="themeToggle" aria-label="Changer de thème">
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79Z"/>
        </svg>
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </button>
    </div>
  </div>
</header>

<main>

  <section class="pod-hero">
    <div class="pod-hero-inner">
      <div class="pod-hero-cover">
        <img src="${s.cover}" alt="Pochette ${escapeHtml(s.title)}" width="400" height="400" loading="eager" fetchpriority="high" decoding="async">
      </div>
      <div class="pod-hero-text">
        <div class="pod-hero-kicker">${escapeHtml(s.publisher)} · ${escapeHtml(s.subtitle)}</div>
        <h1>${escapeHtml(s.title.split(' ')[0])}<br><span class="slash">//</span> ${escapeHtml(s.title.split(' ').slice(1).join(' '))}</h1>
        <p class="pod-hero-lead">${escapeHtml(s.description_long)}</p>
        <div class="pod-cta-row">
          <a class="pod-cta primary" href="#${firstEp.slug}">▶ Écouter l'épisode 01</a>
          <a class="pod-cta ghost" href="${s.feed_url}">Flux RSS</a>
        </div>
        <div class="pod-hero-meta">
          <span><strong>${DATA.episodes.length}</strong> épisodes</span>
          <span><strong>${totalMinutes}</strong> minutes</span>
          <span>FR · ${s.language}</span>
        </div>
      </div>
    </div>
  </section>

  <section class="pod-platforms">
    <div class="pod-platforms-inner">
      <span class="pod-platforms-label">Écouter sur</span>
      <a class="pod-platform" href="https://podcasts.apple.com/" rel="noopener">Apple Podcasts</a>
      <a class="pod-platform" href="https://open.spotify.com/" rel="noopener">Spotify</a>
      <a class="pod-platform" href="${s.feed_url}">RSS</a>
      <a class="pod-platform" href="https://www.youtube.com/" rel="noopener">YouTube</a>
    </div>
  </section>

  <section class="pod-cta-nl">
    <div class="pod-cta-nl-inner">
      <div class="pod-cta-nl-text">
        <strong>La newsletter AI Playbook complète le podcast</strong>
        <span>Chaque vendredi 9h. Veille IA, outils, insights. Pas de spam. Désinscription 1 clic.</span>
      </div>
      <a href="index.html#newsletters">S'inscrire →</a>
    </div>
  </section>

  <section class="pod-episodes">
    <div class="pod-episodes-inner">
      <h2 class="pod-section-title">Tous les épisodes · ${DATA.episodes.length}</h2>
      ${DATA.episodes.map(episodeCard).join('\n')}
    </div>
  </section>

  <div class="pod-marquee" aria-hidden="true">
    <div class="pod-marquee-track">
      <span>Narration FR</span><span>Stack ElevenLabs</span><span>Mastering studio -16 LUFS</span><span>Zéro IA générique</span><span>15 min par épisode</span>
      <span>Narration FR</span><span>Stack ElevenLabs</span><span>Mastering studio -16 LUFS</span><span>Zéro IA générique</span><span>15 min par épisode</span>
    </div>
  </div>

  <section class="pod-cta-nl" style="border-bottom: none">
    <div class="pod-cta-nl-inner">
      <div class="pod-cta-nl-text">
        <strong>Reçois la newsletter de Jérémy</strong>
        <span>AI Playbook · veille automatique que Jérémy se produit d'abord pour lui. 1 clic pour sortir.</span>
      </div>
      <a href="index.html#newsletters">S'inscrire →</a>
    </div>
  </section>

</main>

<!-- Footer (structure identique aux autres pages du site) -->
<footer class="footer" id="contact">
  <div class="container">
    <div class="footer-grid">

      <div class="footer-brand">
        <h3>Jérémy Sagnier</h3>
        <p>
          Salut — moi c'est Jérémy. Je teste l'IA tous les jours pour ne jamais être dépassé, et je partage ce que je trouve en chemin. Une question sur le podcast ? Écris-moi — je lis tout.
        </p>
      </div>

      <div class="footer-col">
        <h5>Suivre</h5>
        <ul>
          <li>
            <a href="https://www.youtube.com/@kevinetjeremysagnier" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.4.6a3 3 0 0 0-2.1 2.1A31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8a3 3 0 0 0 2.1 2.1c1.8.6 9.4.6 9.4.6s7.6 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6z"/></svg>
              YT · Frères Sagnier
            </a>
          </li>
          <li>
            <a href="https://www.youtube.com/@jeremy-sagnier" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.4.6a3 3 0 0 0-2.1 2.1A31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8a3 3 0 0 0 2.1 2.1c1.8.6 9.4.6 9.4.6s7.6 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6z"/></svg>
              YT · Jérémy solo
            </a>
          </li>
          <li>
            <a href="https://www.instagram.com/jeremy.sagnier/" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".5" fill="currentColor"/></svg>
              Instagram
            </a>
          </li>
          <li>
            <a href="https://www.linkedin.com/in/jeremy-sagnier/" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04c-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85c3.6 0 4.26 2.37 4.26 5.45v6.29zM5.34 7.43a2.06 2.06 0 0 1 0-4.12a2.06 2.06 0 0 1 0 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.23 0z"/></svg>
              LinkedIn
            </a>
          </li>
        </ul>
      </div>

      <div class="footer-col">
        <h5>Direct</h5>
        <ul>
          <li>
            <a href="mailto:sagnier.jeremy@gmail.com">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
              Email
            </a>
          </li>
          <li>
            <a href="index.html#newsletters">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Newsletters
            </a>
          </li>
          <li>
            <a href="${s.feed_url}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
              Flux RSS
            </a>
          </li>
        </ul>
      </div>

    </div>

    <div class="footer-bottom">
      <span>© 2026 · <strong>Jerwis Productions</strong> · Jérémy Sagnier · Fait avec du café</span>
      <span style="color:var(--ink); display:inline-flex; align-items:center; gap:8px">
        <span style="display:inline-flex; gap:3px">
          <span style="width:8px; height:8px; border-radius:50%; background:var(--teal)"></span>
          <span style="width:8px; height:8px; border-radius:50%; background:var(--fuchsia)"></span>
          <span style="width:8px; height:8px; border-radius:50%; background:var(--orange)"></span>
        </span>
      </span>
    </div>
  </div>
</footer>

<script src="assets/podcast-player.js" defer></script>
<script src="/assets/bandeau-kzumi.js" defer></script>

</body>
</html>
`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`[page] ✓ ${OUT} (${html.length} chars)`);
