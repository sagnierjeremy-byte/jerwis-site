# Site perso Jérémy Sagnier

> Site HTML statique (+ fonctions serverless Vercel). Vitrine perso, deux veilles IA/Business auto-générées, bibliothèque de tutos Claude Code, podcast, téléchargements gratuits. **Toujours lire ce fichier en début de session.**

## Contexte
- **Propriétaire** : Jérémy Sagnier (`sagnier.jeremy@gmail.com`) — entrepreneur curieux de l'IA, frère jumeau de Kevin (fondateur Eurofiscalis 2017). **PAS dev, PAS codeur.**
- **Objectif** : vitrine + acquisition newsletter + bibliothèque tutos · créé 2026-04-20, prod 2026-04-22.
- **Prod** : `https://jerwis.fr` (canonique **sans www** ; `www` 308 → apex, vérifié 2026-06-09) · DNS Hostinger → Vercel (A `76.76.21.21` + CNAME www).
- **Repo** : `git@github.com:sagnierjeremy-byte/Site-perso.git` · branche `main` · Vercel Hobby, projet `site-perso`, auto-deploy sur push main.

## Stack
- HTML/CSS/JS vanilla, **ZÉRO framework** · CSS partagé `assets/main.css` (~3 900 lignes, importé par ~21 pages) · analytics Plausible.
- Serverless `api/*.js` : Resend (subscribe/unsubscribe/preferences) · Stripe (checkout/webhook/download-zip/github-invite) · news (agrégateur RSS) · youtube · episode-feedback.
- Polices Google Fonts : Archivo Black · Archivo · Bebas Neue · JetBrains Mono.

## Charte FIESTA / 89 + ton « Leo » — référence intégrale : `docs/charte-fiesta-et-ton.md` (À LIRE avant tout contenu/UI)
- Palette `--fuchsia #EF426F` · `--teal #00B2A9` · `--orange #FF8200` · noir/cream dominant (50/30/20) · triple-stripe immuable `teal → fuchsia → orange` · 2-3 mini-marquees par page (CSS déjà dans `main.css`, ne pas recopier).
- **Piège dark mode** : `--ink`/`--bg` sont sémantiques et **s'inversent** en dark → bloc toujours sombre = couleurs fixes `#0A0A0A`/`#FBF7F0`, jamais `var(--ink)`.
- **Ton Leo (RÈGLE ABSOLUE)** : 1ʳᵉ personne, chaleureux mais JAMAIS familier/argot, pitch central « je fais tout ça d'abord pour moi » (veilles que Jérémy se produit à lui-même, jamais « contenu créé pour toi »).
- Interdits : « dev/développeur/codeur » pour Jérémy · **« GMF »** (anonymisé → « en assurance ») · pose commerciale · disclaimers consultant.

## Home (`index.html`)
- Fil rouge centré lecteur : haut bienveillant, bas « d'abord pour moi » en garantie. H1 : « L'IA, c'est aussi pour nous. » (3 lignes animées, `#heroTitle`).
- Ordre des sections (ne pas changer sans raison), entrecoupées de mini-marquees : Hero (dark) → Pour qui (`#whoisitfor`) → Apprendre (`#learn`) → Newsletters (`#newsletters`) → Freebies (`#freebies`) → Projets (`#projects`) → Opinions (`#opinions`) → Sources (`#content`) → Mini-bio → Story (`#story`) → CTA Drop → Marquee + Footer.
- Nav v2 sitewide (`.mini-nav`) : `Apprendre · Articles · Podcast · Newsletter · Plus (dropdown)`.
- Ton à 3 niveaux : haut 100 % centré lecteur · milieu « je partage ce qui m'a servi » · bas pitch « d'abord pour moi » reformulé en « Ta garantie », dit UNE seule fois, jamais redit ailleurs.

## PWA « Jerwis News » (`/app`) — outil perso
`app/index.html` + `app/app.{css,js}` + `app/manifest.webmanifest` + **`app-sw.js` (à la RACINE, pas dans app/)**. Consomme `/api/news` et `data/news-summary.json`. `noindex`, aucun lien public depuis le site. Icônes : `node scripts/make-app-icons.mjs` → `photos/app-icons/`.
⚠️ **Ne pas déplacer `app-sw.js` dans `app/`** : Vercel redirige `/app/` → `/app` (308, cleanUrls), donc un SW dans `app/` (scope `/app/`) ne contrôlerait jamais la page. Et comme le scope est un préfixe de chaîne, `/app` attrape aussi **`/apprendre`** → le handler `fetch` filtre explicitement sur `^\/app(\/|$)` + data + polices, et laisse passer tout le reste sans interception. Toucher à ce filtre = risquer de servir du cache périmé sur tout le site.

## Parcours (`apprendre.html`)
Hero dark + progress rail sticky 01→05 (IntersectionObserver) · 5 étapes : 01 Poser les bases (teal) · 02 Mettre l'IA au travail (fuchsia) · 03 Passer à Claude Code (orange) · 04 Construire tes agents (teal) · 05 Aller plus loin (ink) — cards ajoutées au fil des publications (`parcours_etape` dans les drafts) · parcours-end gradient → `index.html#newsletters`. Progression localStorage `jerwis_parcours_done` (JS `n/5`).

## Articles (`articles/`)
26 articles + `_TEMPLATE.html` (placeholders `{{TITRE}}` etc., déjà câblé TOC + barre IA). Liste à jour : `articles.html` + `feed/articles.xml` (régénérés par `publish.js`).
- Structure type : header sticky · hero dark (kicker + H1 3 lignes + lead + meta) · TL;DR (card -40px sur le hero) · sections `.section-kicker` + step cards (k-teal/k-fuchsia/k-orange rotent) · callouts ok/warn/tip · CTA final newsletter · footer home.
- **Design v2 (depuis 2026-07-06)** : CSS partagé `assets/article.css?v=20260706` (remplace le `<style>` inline dupliqué par article — mesure de lecture 700px, prompt-cards, tableaux, hr signature) + `assets/article-reading.js` (progress bar + bouton Copier). Corps encadré par `publish.js` avec les ancres `<!-- ARTICLE_BODY:START/END -->` + 2 mini-marquees FR générées à chaque publication (EN : chemins d'assets absolus `/assets/...`, contrairement aux FR en relatif `../assets/...`). Migration : `scripts/migrate-article-design.mjs` (44 articles conformes au template). **18 articles hand-made** (CSS custom trop divergent pour un remplacement sûr — `.step`/`.mini-marquee`/`table` redéfinis différemment) traités en complément (2026-07-20) via `scripts/migrate-handmade-extras.mjs` + `assets/article-extras.css` (additif : prompt-cards, hr, mesure de lecture, progress bar — sans toucher aux composants custom existants).
- **TOC + back-to-top OBLIGATOIRES** (depuis 2026-05-13) : `../assets/article-toc.css` dans le `<head>` + `../assets/article-toc.js` defer avant `</body>`. Zéro markup : auto-actif si ≥3 `<h2>` (sinon pas de TOC, volontaire) → sidebar desktop ≥1280px avec scroll spy + drawer mobile FAB « SOMMAIRE » + back-to-top. Touch targets ≥44px, safe-area iPhone, fermeture Escape/backdrop/swipe-down.
- **Barre « Résumer avec une IA » OBLIGATOIRE** : `../assets/ai-summarize.css` + `.js` defer (juste après les fichiers TOC). S'auto-insère après le `.tldr` : Perplexity (auto-submit `?q=`) + ChatGPT (pré-rempli, `hints=search`) + dropdown « Autres IA » (Claude/Gemini/Le Chat/Copilot → **copy + open**, seul pattern fiable cross-IA, audit 2026-05-13). Prompt généré depuis `<link rel="canonical">`.
- Après ajout : card dans `#learn` (`index.html`) et/ou l'étape d'`apprendre.html` · test local : TOC mobile OK, barre `.ai-summarize` après le TL;DR, Perplexity ouvre un résumé.

## Publication (drafts → articles)
- Drafts `drafts/*.md` (templates `_TEMPLATE.md`/`_TEMPLATE_VS.md` ignorés par le batch). Frontmatter requis : `slug`, `titre`, `description`, `hero_ligne_1`, `lead`, `duree`, `niveau`, `published` · optionnels : `titre_seo`, `hero_ligne_2/3`, `tldr[]`, `categorie`, `numero`, `outils`, `parcours_etape`.
- `npm run publish <slug>` (ou `publish:all`) → écrit `articles/<slug>.html`, met à jour `sitemap.xml`, régénère `feed/articles.xml` + les cartes statiques d'`articles.html` (`build-articles-page.mjs`, marqueurs `ARTICLES:START/END` — **jamais éditer les cartes à la main**), affiche la card `apprendre.html` si `parcours_etape`.
- Puis commit + push (Vercel redéploie) + `npm run indexnow <url>`.
- **Slug publié = nom de fichier du draft** (écrase un frontmatter divergent, avec warning) → renommer le draft en slug court et propre (ex : `skills-claude-code-non-dev`) avant de publier.
- **Autopilot** (`.github/workflows/blog-autopilot.yml`) : cron lun/mar/jeu/ven 5h UTC (4 articles/sem depuis 2026-07-20) — pioche dans `data/topic-queue.json` (priorité 1→3 puis ancienneté), recherche Gemini (grounding, retry ×3) + rédaction Claude (fallback Kimi K2.6) + gate qualité ≥56/70 jugée par **Kimi K2.6 via OpenRouter** (`OPENROUTER_API_KEY`, ~0,10 $/article, fallback Gemini), publie/commit/push seul. Après publication : **traduction EN automatique** (`scripts/i18n/translate-missing-en.mjs`, sémantique catch-up = rattrape aussi les trous passés, non bloquant) → en/articles/ + carte en/articles.html + Featured en/index.html + hreflang FR + sitemap-en. Puis **post LinkedIn auto** (`scripts/blog/linkedin-post.mjs` → `linkedin/<slug>.md`, non déployé) programmé à J+1 8h30 via Zernio (`zernio-schedule.mjs`, secret `ZERNIO_API_KEY`) + **carrousel PDF sélectif** (`linkedin-carousel.mjs` : seulement si chiffre fort ou méthode ; rendu `carousel-render.mjs` satori/resvg sans navigateur, polices dans `scripts/blog/fonts/`, sortie `linkedin/carousels/` gitignorée, livré en pièce jointe email). Recette des posts validée par Jérémy le 21-07 (hook simple + avis tranché ligne 2, lien en 1er commentaire seulement) — si la qualité dévie, ajuster l'exemple few-shot du script, pas les règles. **Règles anti-IA ajoutées le 28-08** (demande Jérémy) : zéro tiret cadratin/demi-cadratin dans TOUT le contenu généré (posts, carrousels, articles, traduction EN), jamais de « : » en substitution (même tic). Mécanique : liste partagée `TICS_IA` dans `config.mjs` (bloquante) + bloc « RÈGLES ANTI-IA » dans chaque prompt (pas de liste de trois, renversement « ce n'est pas X, c'est Y » limité, tournures IA bannies) + `purgerTirets()` dans `generate-draft.mjs` (filet : incise → virgule, code et URLs exemptés) + bloc ANTI-IA bloquant dans `qa-gate.mjs` (corps + frontmatter, hors code/URLs) + règle n°5 du prompt de `translate-article-en.mjs`. Posts : 3 essais avec feedback du motif de rejet. Ces règles-là sont intouchables sans accord de Jérémy. ⚠️ File vide = arrêt **silencieux** (pas d'alerte) → garder des sujets `pending`. Kill switch : variable repo `BLOG_AUTOPILOT=off`.

## Assets
- `photos/` : 55 optimisées (1600px, qual 82), 7 utilisées · `photos/channels/` : avatars YouTube 176×176 (`scripts/fetch-youtube-avatars.mjs`).
- `downloads/` : `CLAUDE.md` (version **anonymisée** du global de Jérémy) · `README.md` (guide install) · `skills/` (26 skills custom, officiels Anthropic exclus) · `jeremy-claude-pack.zip` (~700 Ko) · cheatsheet · prompts pack · OPML · `cours-email/` (cours 5 jours + `sequence-resend.md`).
- Outils internes (ne pas déployer) : `_internal/contact-sheet.html` (galerie photos) · `_internal/classify-channels.html` (classement chaînes YT).

## Data stores (`data/`)
| Fichier | Rôle | Alimenté par |
|---|---|---|
| `lexique.json` (~195 Ko) | source de vérité du lexique IA (pages `lexique*.html` générées) | `npm run lexique:build` · maillage auto `lexique:link` |
| ⚠️ Lexique hybride | 32 fiches `lexique/*.html` autonomes ABSENTES de `lexique.json` — garde-fou build : skip du hub si entrées inconnues (`--force-hub` pour outrepasser). À terme : intégrer au JSON | manuel (2026-05-26) |
| `episodes.json` | source de vérité podcast (titres, casting, `audio_url`) | à la main — lu par les 3 scripts `podcast:*` |
| `models-ai.json` (~60 Ko) | comparatif modèles IA, fetché client-side (`modeles-ia.html`, `modeles-image-ia.html`) | à la main |
| `youtube-channels.json` | chaînes YouTube suivies (tabs Sources + `api/youtube.js`) | `scripts/build-youtube-channels.mjs` |
| `news-summary.json` | synthèse quotidienne news IA (`#newsSummary` de `news.html`) | `npm run news:build` (Claude API) via cron GitHub Actions `daily-news-summary.yml` |
| `calendar.json` | vestige vide, plus référencé | — |

## API & env vars
- **`/api/subscribe.js`** : POST `{email, source}` · 409 (déjà inscrit) traité comme success `alreadySubscribed: true` · forms frontaux : `.newsletter-form`, `.newsletter-unified-form`, `.freebie-download-form`, `.cta-form`, `.download-form` (claude-code.html).
- **Audience** : dédiée AI Playbook (compte Resend perso de Jérémy, pas Eurofiscalis) · aucun fallback d'audience hardcodé (retiré 2026-04-22, commit `1a36574`) → env vars manquantes = 500 explicite.
- **Clé Resend** : **Full access** requis (ou Sending + Audiences) pour `/audiences/{id}/contacts` ; clé « Sending only » → `restricted_api_key` (401).
- Env vars (NOMS uniquement — valeurs sur Vercel + `.env.local`, jamais en dur) :
  - Resend : `RESEND_API_KEY` · `RESEND_AUDIENCE_ID` · `RESEND_AUDIENCE_COURS_ID` · `RESEND_REPLYTO` · `ADMIN_NOTIFY_EMAIL` · `ALERT_EMAIL`
  - Stripe (précommande photos) : `STRIPE_SECRET_KEY` · `STRIPE_PUBLISHABLE_KEY` · `STRIPE_WEBHOOK_SECRET`
  - GitHub invite : `GITHUB_TOKEN` · `GITHUB_REPO_OWNER` · `GITHUB_REPO_NAME` · Vercel Blob : `BLOB_READ_WRITE_TOKEN`
  - Meta : `META_PIXEL_ID` · `META_CAPI_TOKEN` · `META_ADS_ACCESS_TOKEN` · R2 (`podcast:upload`) : `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_PUBLIC_URL_BASE`
  - News build : `ANTHROPIC_API_KEY` (aussi secret GitHub Actions) · `NEWS_API_URL` · `CLAUDE_MODEL` · divers : `SITE_ORIGIN` · `OG_HOST` · `DEBUG`

## Podcast · Jerwis Productions
- **Source de vérité** : `data/episodes.json` uniquement, jamais hardcoder ailleurs. Host audio : Cloudflare R2 bucket `jerwis-podcast-audio` (free tier 10 Go + 0 egress). RSS : `https://jerwis.fr/feed/podcast.xml` (Apple + Spotify).
- Workflow nouvel épisode : 1) entrée dans `episodes[]` 2) `npm run podcast:upload <mp3>` 3) coller l'URL R2 dans `audio_url` 4) `npm run podcast:build` (covers + RSS + page) 5) commit + push.
- Scripts npm : `podcast:build` · `podcast:upload` · `podcast:rss` · `podcast:covers` · `podcast:page`.
- Pochettes Direction 4 (duotone glitch, JetBrains Mono) générées par `build-podcast-covers.js` — jamais retoucher les PNG ; changer le style = `templates/podcast-cover.html` + regénérer.
- Label partout « Jerwis Productions » (pluriel), jamais « par Jérémy Sagnier » seul · titres JetBrains Mono 700 uppercase, `//` teal en séparateur.
- Player : 1 seul joue à la fois, position en localStorage, ←/→ ±5s, vitesses 1/1.25/1.5/2×.

## Newsletters & Sources
- **AI Playbook** (1×/sem vendredi 9h, IA) · **Business Radar** (2×/mois 1er & 3e mardi, business/éco). Présentées comme veilles automatiques (sous-agents, 100+ sources) que Jérémy se partage — JAMAIS « newsletter pour toi ».
- Sources (`#content`) : chaînes YouTube dans `data/youtube-channels.json` (source de vérité, ne pas hardcoder) · X : `@JeremySagnier` · newsletter suivie : Alex Hormozi.

## Back-office
Admin séparé : **jerwis-admin** (`~/Projets/jerwis-admin/`, `https://admin.jerwis.fr`) — voir son propre `CLAUDE.md`. Côté site public, l'inscription passe par `/api/subscribe.js` ; le site reste vanilla.

## Discipline de dev
- Pas de comments inutiles · pas de refactoring non demandé · pas de README auto · chemins **relatifs** partout (fonctionne en `file://` ET prod Vercel) · dev-browser dispo globalement pour scraper.
- Avant toute modif : lire ce CLAUDE.md · changement > 3 fichiers ou données/API → plan + attendre « go » · vérifier le ton Leo.
- Après chaque session non-triviale : mettre à jour ce fichier + entrée en haut de `CHANGELOG.md` (Date + titre · Pourquoi · Livré · Fichiers touchés · À venir). Si > ~200 lignes sur 6 mois, archiver dans `CHANGELOG-2025.md`.

## Vercel · `vercel.json`
- Syntaxe **moderne** uniquement (`cleanUrls`, `trailingSlash`, `headers`) — **JAMAIS** `builds`/`routes` legacy (ça ne buildait pas `api/*.js` → `/api/subscribe` 404). Détection auto via `package.json "type": "module"` + fichiers dans `api/`.
- `cleanUrls: true` : `/claude-code` résout `/claude-code.html` → liens internes sans extension.
- Headers spéciaux : `.zip` → `Content-Disposition: attachment` · `.opml` → `Content-Type: text/xml; charset=utf-8`. Extensions statiques : détection auto.
- **Aucun `Cache-Control` long ni `immutable`**, retirés le 2026-09-28 de `/assets`, `/photos` et `/downloads`. Aucun nom de fichier n'est haché, donc un fichier modifié sous le même nom n'atteignait pas les visiteurs qui reviennent. Et Vercel pose aussi cet en-tête sur les 404 : un fichier absent au moment de la visite restait en erreur un an dans le navigateur. Le défaut de Vercel (`public, max-age=0, must-revalidate`, puis 304) suffit.

## TODOs
- [ ] Configurer la séquence cours 5 jours côté Resend (guide : `downloads/cours-email/sequence-resend.md`)


## Secrets — coffre central
Toute clé de cette machine (API, token, MCP, mot de passe technique) vit dans **`~/.secrets/secrets.env`** (chmod 600, hors de tout git) — `source ~/.secrets/secrets.env` pour charger. Convention : `PREFIXE_NOM=…` + commentaire (usage, date). La **source de vérité reste le gestionnaire de mots de passe** : tout secret y est enregistré AVANT d'entrer au coffre (un coffre local ne survit pas à un formatage — vécu le 2026-08-04). Jamais de secret en dur dans un fichier commité, un `.mcp.json` ou un chat : les configs sourcent le coffre (`sh -c "source ~/.secrets/secrets.env && exec …"`).
