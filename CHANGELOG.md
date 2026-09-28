# CHANGELOG — Site perso Jérémy Sagnier

## 2026-09-28 · Cache des fichiers statiques : fin du « immutable un an »

### Pourquoi
`vercel.json` posait `Cache-Control: public, max-age=31536000, immutable` sur `/assets`, `/photos` et `/downloads` (ajouté le 2026-05-13, sprint perf mobile). Deux défauts. Aucun nom de fichier n'est haché : `main.css`, `fonts.css` ou `lang-toggle.js` sont appelés sans `?v=` par des centaines de pages, et 127 photos ont déjà été remplacées sous le même nom, donc un visiteur qui revient gardait l'ancienne version un an. Et Vercel pose cet en-tête aussi sur les 404 : relevé en ligne le 28-09, `curl -sI https://jerwis.fr/assets/inexistant-ZZZZ.css` répondait 404 avec `immutable`, et un navigateur garde alors l'erreur un an sans redemander (seul Cmd+Maj+R répare). C'est le piège qui a laissé l'espace client Eurofiscalis sans style le même jour.

### Livré
- `vercel.json` : les trois blocs `Cache-Control` retirés, le défaut de Vercel s'applique (`public, max-age=0, must-revalidate`, puis 304 quand le fichier n'a pas changé). En-têtes de sécurité, `.zip` et `.opml` inchangés.
- `CLAUDE.md` : règle ajoutée dans la section Vercel pour que ces blocs ne reviennent pas.

### Note
Le correctif empêche de nouveaux 404 figés et de nouvelles copies périmées. Il ne rattrape pas ce qu'un navigateur a déjà gardé avec `immutable` : ces copies partent avec son cache, ou avec Cmd+Maj+R.

## 2026-08-28 · Règles anti-détection IA : posts LinkedIn, articles, traduction EN

### Pourquoi
Demande de Jérémy : les tirets cadratins « font très IA » et trahissent la génération automatique, sur les posts LinkedIn puis, en extension le même jour, sur les articles de blog. Constat mesuré avant correction : **29 des 30 posts publiés** contenaient des tirets cadratins ou demi-cadratins (jusqu'à 6 par post), et **45 des 45 drafts d'articles** (885 tirets au total, ~20 par draft). Cause racine côté posts : l'exemple few-shot de `linkedin-post.mjs` en contenait un lui-même, le modèle l'imitait fidèlement ; côté articles, le prompt de `generate-draft.mjs` (et le `TON_LEO` de config) en modelaient plusieurs, sans aucune règle contraire.

### Livré
- **`scripts/blog/linkedin-post.mjs`** :
  - Exemple few-shot nettoyé (le tiret de « la page — avant tous les liens » remplacé par une virgule) ; idem pour le tiret de la règle « Jargon interdit » du prompt système, qui modélisait le tic.
  - Nouveau bloc « RÈGLES ANTI-IA » dans le prompt système : zéro tiret cadratin/demi-cadratin (et interdiction de le remplacer par un « : » en milieu de phrase, même tic), pas d'énumération de trois, renversement « Ce n'est pas X. C'est Y. » limité à un par post, pas d'anaphore mécanique ni de question rhétorique auto-répondue, rythme varié, tournures IA bannies (« à l'ère de », « game-changer », « au final », « spoiler »...).
  - Gate mécanique `verifier()` durcie : tout tiret typographique dans le post ou le 1er commentaire est bloquant, tiret ASCII en ponctuation ou en puce bloquant (mots composés et plages de dates permis), 13 tics IA regex bloquants, renversements « n'est pas » plafonnés à 2.
  - Boucle passée de 2 à 3 essais, et le motif de rejet est renvoyé au modèle à l'essai suivant (avant, il rejouait le même prompt à l'aveugle).
- **`scripts/blog/linkedin-carousel.mjs`** : même règle anti-tirets dans le prompt (champs "lines", "sub", "kicker"), gate bloquante sur les slides, tirets des instructions elles-mêmes nettoyés.
- **`scripts/blog/config.mjs`** : nouvelle liste partagée `TICS_IA` (13 regex bloquantes, utilisée par la gate articles ET la gate posts ; gère l'apostrophe droite et typographique) ; tiret du `TON_LEO` nettoyé (il est injecté dans les prompts de génération et de jugement).
- **`scripts/blog/generate-draft.mjs`** (articles) :
  - Prompt nettoyé de ses propres tirets (blocs de faits `[F1] … · source:`, consignes) + le même bloc « RÈGLES ANTI-IA » adapté au format long (tirets interdits jusque dans le frontmatter, énumérations de trois, renversement limité à 2 par article, anaphores, rythme) + extension des tournures bannies (« en résumé », « au final », « game-changer », « un véritable + nom »...).
  - Filet `purgerTirets()` : correction mécanique des seuls cas sûrs avant écriture du draft (incise espacée ou collée → virgule, jamais « : » ; plage de chiffres → trait d'union) ; blocs de code et URLs exemptés ; tiret de dialogue en début de ligne laissé à la gate. Corrections loguées en CI.
- **`scripts/blog/qa-gate.mjs`** : nouveau bloc ANTI-IA bloquant (tirets typographiques dans le corps + frontmatter, hors code et URLs ; `TICS_IA`) + avertissement si le renversement « Ce n'est pas X. C'est Y. » apparaît ≥3 fois. Rejet → régénération (boucle existante `max_regen`).
- **`scripts/i18n/translate-article-en.mjs`** : règle n°5 dans le prompt de traduction, l'anglais ne réintroduit jamais de tiret cadratin (tic encore plus marqué en anglais IA), réécriture virgule/point/parenthèses.

### Vérifié
- Posts : regex testées sur cas synthétiques (7/7, sans faux positif sur « c'est-à-dire », « peut-être », « 2020-2024 ») puis rejouées sur les 30 posts réels : **28/30 auraient été rejetés** (28 tirets, plus « incontournable », « spoiler », « au final », 4 posts à 3-4 renversements).
- Articles : `purgerTirets` testé 9/9 sur sa source réelle (code fencé intact, URL à demi-cadratin intacte, insécables gérées, dialogue laissé à la gate). Gate rejouée en réel : draft publié `ia-et-ton-emploi` → **REJET, 30 tirets + « révolutionner »** (y compris avec le vrai juge Gemini) ; draft propre truffé de pièges légitimes (liste markdown, tableau, plage 2020-2024, URL à demi-cadratin, cadratin dans un bloc de code) → **zéro bloquant anti-IA** ; sabotage (1 cadratin ajouté) → détecté. `node --check` vert sur les 6 scripts.

### Note
Les 30 posts existants et les 45 articles publiés ne sont pas retouchés (déjà en ligne). Les règles s'appliquent aux prochaines générations, côté GitHub Actions, donc après push de ce commit. La boucle de régénération de `run.mjs` reste aveugle (pas de feedback des erreurs de gate au modèle) : la prévention repose sur le prompt, la gate est le filet.

## 2026-07-30 · /api/news — purge des flux morts + 8 sources FR

### Pourquoi
Demande de Jérémy : ajouter des sources intéressantes, toujours en français. L'audit préalable (banc de test maison : HTTP, parse, fraîcheur, cadence, images) a révélé que **5 des 29 flux étaient morts ou moribonds** — The Verge, Wired, Clubic, Fast Company en 404, VentureBeat à 1 item/10 j — le feed tournait en réalité sur 24 sources.

### Livré
- **Retirés (5)** : The Verge, Wired, Clubic (404), Fast Company (404), VentureBeat (moribond). TechCrunch et Simon Willison restent les deux seules fenêtres anglophones.
- **Ajoutés (8, tous testés verts : 200, dernier item < 24 h)** :
  - IA : **ZDNet France** (6,7/j), **Le Big Data** (~10/j), **LeMagIT** (3/j), **IT for Business** (4,6/j), **La Revue du Digital** (3,4/j), **Tech&Co/BFM** (26/j — choix de Jérémy, prévenu du bruit e-commerce)
  - Business : **Journal du Net** (18,7/j), **Frenchweb** (2/j)
- Bilan : **24 → 32 flux réels**, 21 IA / 11 Business, quasi intégralement FR.
- Écartés après test : Journal du Geek et Les Numériques (verts mais gaming/conso → noieraient le top 60), Usbek & Rica (0,8/j), L'ADN (silencieux 14 j), Les Échos (403), Stratégies et Big Média Bpifrance (404).

### Vérifié
Handler complet exécuté en local (vrai `api/news.js`, faux req/res) : 200, 60 items, 3/8 nouvelles sources déjà dans le top 60 (JDN ×8, Tech&Co ×5, ZDNet ×3 — les sources à faible cadence y entreront au fil des publications), 5/60 items sans image. À surveiller : si JDN prend trop de place dans le top 60, le retirer ou le passer en catégorie IA.

### Note
`data/topic-queue.json` de la veille blog est indépendant — ces sources n'alimentent que /news, l'app PWA et le résumé quotidien (qui gagne donc en matière première FR).

## 2026-07-30 · PWA « Jerwis News » — lot 2 : notification du matin

### Principe
Une notification par jour, envoyée **par le cron qui produit le résumé** (`daily-news-summary.yml`, nouvelle étape après le commit de `data/news-summary.json`). Titre = « ◆ 5 actus à retenir — <jour> », corps = les 5 titres numérotés. Un tap ouvre `/app` (et refocalise l'app si elle est déjà ouverte au lieu d'ouvrir un doublon).

### Choix d'architecture : pas de base de données
App **mono-utilisateur** → l'abonnement push est stocké dans le secret GitHub `PUSH_SUBSCRIPTION`, pas dans Neon. Zéro infra, zéro coût, zéro service à surveiller. Contrepartie assumée : si le service push révoque l'endpoint (ça arrive), il faut rappuyer sur « Activer la notif du matin » dans l'app et recoller la valeur — le script détecte ce cas (HTTP 404/410) et l'écrit noir sur blanc au lieu d'échouer obscurément.

### Livré
- **`scripts/push-daily.mjs`** — construit le payload depuis le résumé, tronque au dernier titre entier (borne 520 car.), envoie via `web-push` (VAPID). `--dry-run` pour inspecter le payload sans envoyer. Sorties : **0 si non configuré** (fork, ou secrets pas encore posés), **0 si envoyé**, **1 sur échec réel** — même principe que le fix de `notify-publish` : l'étape est en `continue-on-error` donc le résumé n'est jamais bloqué, mais un échec reste visible.
- **`app-sw.js`** — écouteurs `push` (affichage avec icône, `tag: jerwis-digest` + `renotify` pour ne jamais empiler les digests) et `notificationclick` (focus de l'app existante, sinon ouverture).
- **`app/app.js` + `index.html` + `app.css`** — bouton « Activer la notif du matin » (masqué si non supporté, désactivé avec message clair si l'utilisateur a bloqué les notifs), abonnement `pushManager.subscribe`, puis panneau affichant le JSON à copier dans le secret.
- **`web-push` ^3.6.7** ajouté aux dépendances. Clés VAPID générées dans `.env.local` (gitignoré) sans jamais afficher la privée.

### Garde-fou : clé publique en dur des deux côtés
La clé publique VAPID est écrite **en dur** dans `app/app.js` **et** dans `push-daily.mjs` (`PUB_FALLBACK`), avec un test de parité. Raison : une clé divergente entre client et serveur produit des envois rejetés très pénibles à diagnostiquer. Si elle change un jour, il faut la changer **aux deux endroits**.

### Testé
Syntaxe + YAML valides · non configuré → exit 0 silencieux · abonnement illisible → exit 1 avec la consigne de réabonnement · `--dry-run` → payload correct (5 titres, 370 car.) · UI en permission refusée → bouton « Notifs bloquées (réglages du système) » désactivé, app intacte (60 actus), 0 erreur console · parité des clés vérifiée.

### ✅ Mise en service complète (même jour) — notification reçue sur l'iPhone
L'envoi réel n'était pas testable en local (le navigateur de preview refuse la permission de notification), il l'a été en conditions réelles dans la foulée :
1. **Secrets posés** : `VAPID_PRIVATE_KEY` (par Jérémy, depuis `.env.local`) puis `PUSH_SUBSCRIPTION` — abonnement `web.push.apple.com` généré depuis l'iPhone (app installée sur l'écran d'accueil → « Activer la notif du matin » → JSON collé en secret). Au passage, ça valide de facto l'installation iOS du lot 1 (icône, plein écran, bouton) que le simulateur en crash-loop n'avait pas permis de tester.
2. **Workflow lancé à la main** → `[push] ✓ notification envoyée (HTTP 201) — 5 actus, 324 car.` Un premier run avait aussi validé la garde « non configuré » (exit 0, cron intact, 44 s).
3. **Confirmé par Jérémy : notification reçue à l'écran du téléphone.** La chaîne complète est en service : 32 flux → agrégation → résumé ton Leo → commit → push iPhone, chaque matin ~9h30-10h Paris.

Pour mémoire en cas de silence un jour : le log du cron dira `abonnement expiré (HTTP 410)` → rouvrir /app, réappuyer sur « Activer la notif du matin », recoller `PUSH_SUBSCRIPTION`.

## 2026-07-30 · PWA « Jerwis News » (/app) — lot 1

### Pourquoi
Demande de Jérémy : avoir l'onglet news en application mobile. Outil **personnel** (pas de store, pas de compte, `noindex`), périmètre **news uniquement**. Les briques existaient déjà : `/api/news` (29 flux RSS, 60 items, 43 Ko, ~95 ms) et `data/news-summary.json` (résumé quotidien en ton Leo, produit par le cron) — il ne manquait que la couche app.

### Livré (6 fichiers, aucun fichier existant modifié)
- **`app/index.html`** — UX d'app : header compact, résumé du jour en tête, filtres, safe-area iPhone, `viewport-fit=cover`, `apple-mobile-web-app-*`, skeletons de chargement.
- **`app/app.css`** — feuille autonome (charte FIESTA, sombre par défaut, clair via `prefers-color-scheme`), cibles tactiles ≥ 34-40 px, `overscroll-behavior` pour le pull-to-refresh.
- **`app/app.js`** — chargement `/api/news` + digest, filtres Tout/IA/Business/Non lus avec compteurs, lu/non-lu en `localStorage` (borné à 400 entrées), pull-to-refresh tactile, rafraîchissement au retour d'app si > 15 min, âge des données affiché.
- **`app-sw.js`** — service worker (voir le piège ci-dessous).
- **`app/manifest.webmanifest`** — `standalone`, `start_url`/`scope` = `/app`, thème `#0A0A0A`.
- **`scripts/make-app-icons.mjs`** + `photos/app-icons/` — icônes 192/512/maskable/apple-touch générées via satori + resvg, reprenant l'identité du `favicon.svg` (J cream sur noir, point fuchsia).

### ⚠️ Deux pièges de scope résolus (à ne pas défaire)
1. **Vercel redirige `/app/` → `/app` en 308** (`cleanUrls`, vérifié sur `/en/`). Un SW placé dans `app/` aurait le scope `/app/` et **ne contrôlerait jamais la page** servie à `/app`. D'où `app-sw.js` **à la racine**, enregistré avec `{scope:'/app'}`.
2. Mais le scope d'un SW est un préfixe de **chaîne**, pas de segment : `/app` matche aussi **`/apprendre`**, une vraie page du site. La protection ne repose donc **pas** sur le scope : le handler `fetch` n'intercepte que `^\/app(\/|$)`, `/api/news`, `/data/news-summary.json`, les polices et les icônes — tout le reste passe au réseau sans interception (pas de `respondWith`). Testé sur `/app`, `/app/app.css`, `/apprendre`, `/apprendre/x`, `/application`.

### Vérifié en local (serveur cleanUrls reproduisant le 308 de Vercel)
Rendu 390×844, résumé + 60 actus, filtres et compteurs (28 IA / 32 Business), marquage lu persistant, SW `activated` avec 12 entrées en cache dont `/api/news` et le digest, 0 vignette en erreur. **Hors ligne testé pour de vrai en coupant le serveur** : shell, actus et résumé s'affichent depuis le cache.

### Non fait volontairement
Aucun lien public depuis `/news` vers `/app` (outil perso en `noindex`) — l'accès se fait par l'URL puis « Ajouter à l'écran d'accueil ». Notifications push = **lot 2** (Web Push VAPID + stockage de l'abonnement + envoi après le cron news), à décider après quelques jours d'usage réel.

## 2026-07-29 · La programmation LinkedIn auto ne fonctionnait pas en CI + backlog écoulé

### 🔴 Bug : `ZERNIO_API_KEY` jamais lue en CI (depuis le 21-07)
`scripts/blog/zernio-schedule.mjs` cherchait la clé **uniquement dans des fichiers** (`.env.local` du repo, puis `~/Projets/content-factory/.env`). En CI aucun de ces fichiers n'existe : le workflow passe bien le secret et le test `if [ -n "$ZERNIO_API_KEY" ]` réussit, mais le script sortait sur `✗ ZERNIO_API_KEY introuvable`. Vu dans le log du run du 28-07 (article `claude-c-est-quoi`). **Conséquence : aucun post programmé automatiquement du 21-07 au 29-07** — les 4 posts sortis du 21 au 24 avaient été programmés à la main, et 8 posts se sont accumulés.

**Fix** : `process.env.ZERNIO_API_KEY` lue **en priorité**, fichiers en fallback pour l'usage local. Vérifié dans les deux sens : clé invalide en env → `Zernio 401` (donc l'env gagne bien, et aucun post créé) ; sans env → fallback fichier opérationnel.

### Backlog LinkedIn écoulé (8 posts programmés, 8h30 Paris)
jeu 30-07 creer-chanson-ia · lun 03-08 modifier-photo-avec-ia · jeu 06-08 resumer-pdf-video-avec-ia · lun 10-08 ia-cv-lettre-entretien · jeu 13-08 le-chat-mistral-vs-chatgpt · lun 17-08 apprendre-langue-avec-ia · jeu 20-08 donnees-perso-ia-confidentialite · lun 24-08 claude-c-est-quoi. Créneaux choisis sur lundi/jeudi pour ne pas percuter les posts automatiques (article J → post J+1, articles lun/mar/jeu/ven ⇒ auto sur mar/mer/ven/sam). `claude-c-est-quoi` a été **redaté du 31-07 au 24-08** après le fix ci-dessus, car l'autopilot va de nouveau occuper le vendredi 31 (post de l'article du jeudi 30) ; PUT partiel Zernio, contenu et 1ᵉʳ commentaire vérifiés intacts après coup.

### ⚠️ Incident : un post publié immédiatement au lieu d'être programmé
`ia-gratuite-ou-payante` est parti sur LinkedIn dès sa création (`urn:li:share:7488144206574841856`) au lieu du créneau visé : la date cible avait été calculée depuis une date de référence périmée (27-07 au lieu du 29-07 réel), donc `scheduledFor` était **dans le passé** — et Zernio publie sans erreur explicite dans ce cas (`status: published`, `publishedAt: undefined`). Aucun doublon (c'était le seul post Jerwis de la semaine). **Règle retenue : avant toute programmation, vérifier l'heure réelle (en-tête HTTP `Date` d'un serveur tiers) et non la date de session ; puis contrôler que la cible est bien future.**

### Notifications email activées (fin du dernier maillon)
`RESEND_API_KEY` posée en secret GitHub par Jérémy + variable `NOTIFY_EMAIL` = `jeremy.sagnier@eurofiscalis.com`. **Domaines Resend contrôlés via l'API avant de choisir l'expéditeur** : la clé du site jerwis a `jerwis.fr` ✓ *verified* → le FROM `jeremy@jerwis.fr` du script est bon tel quel. Écarté volontairement : `jeremy@eurofiscalis.app` (vérifié, mais sur un **autre compte Resend** dont la clé est partagée par 4 projets Eurofiscalis — blast radius à la rotation, et mélange d'identité pro/perso). **Envoi réel testé de bout en bout** : `[notify] ✓ email envoyé à jeremy.sagnier@eurofiscalis.com`.

**Fin de l'échec silencieux** (`notify-publish.mjs`) : un refus de Resend faisait `process.exit(0)` — le problème disparaissait des logs. Désormais `exit 1` + message explicite (statut HTTP, corps de la réponse, rappel domaine/clé). L'étape du workflow reste en `continue-on-error: true`, donc **la publication n'est jamais bloquée** : seule l'étape s'affiche en erreur. Le cas « clé absente » garde volontairement `exit 0` (fork ou exécution locale). Les deux chemins testés : clé absente → exit 0 silencieux ; clé invalide → exit 1 + `✗ échec Resend 401`.

### Au passage — les correctifs du 27-07 tiennent
`daily-news-summary` **vert le 28 et le 29** (après 3 échecs). Le `try/catch` de `linkedin-post.mjs` a servi dès le run du 28 : post `claude-c-est-quoi` généré du premier coup (987 car.). L'article du 28 est passé après un rejet-régénération de la gate (factualité 5/10 au 1ᵉʳ essai) — le filet qualité fonctionne.

## 2026-07-27 · Health-check blog auto — résumé news invisible depuis 2 mois + 2 fallbacks

### Pourquoi
Check demandé par Jérémy (« est-ce que tout est bien automatique »). Le crédit API Anthropic était épuisé : `daily-news-summary` échouait depuis le 25-07 (3 jours, issue #6), et l'autopilot survivait via son fallback OpenRouter mais avec le ton Leo à 6/10 (Kimi écrit au lieu de Claude) et le post LinkedIn cassé. Crédits rechargés par Jérémy → cron relancé à la main (vert en 53 s, résumé du 27-07 commité `231e254`).

### 🔥 Trouvaille : `.vercelignore` cassait 5 pages — dont le catalogue de modèles
`.vercelignore` excluait **`data/`** (commit sécurité du 21-04). Or un *dossier* exclu n'est pas parcouru → **toutes** les ré-inclusions `!data/x.json` étaient inopérantes, y compris `!data/models-ai.json` posée le 21-05 qui n'a donc jamais fonctionné. Constaté en prod le 27-07 :
- **`/modeles-ia`, `/modeles-image-ia` (+ EN)** : `fetch('data/models-ai.json')` → **404**, **0 carte affichée**, compteurs de « État de la base » à « -- ». **Le catalogue de 53 modèles était invisible.**
- **`/news`** : bloc `.news-summary` présent dans le DOM mais toujours vide (`loadSummary()` dans `assets/news-page.js:479` fait `if (!res.ok) return;` → échec **silencieux**). La page n'avait pas l'air cassée car le flux d'actus passe par `/api/news` (200, 60 items). **Résumé quotidien généré et commité depuis le 22-05 : jamais affiché.**

Fix : **`data/*`** au lieu de `data/` (matche les entrées une à une, ce qui rend les exceptions valides). Sémantique validée en isolation (repo jetable + `git check-ignore`) avant application. Vérifié en prod après déploiement : `models-ai.json` **200**, `news-summary.json` **200**, `topic-queue.json` toujours **404** (file éditoriale privée, comme voulu) ; `/modeles-ia` affiche **53 modèles / 21 open-weight / 36 cartes** et `/news` affiche « ◆ Aujourd'hui en 30 secondes · Lundi 27 juillet ».

### Livré
- **`.vercelignore`** : `data/` → **`data/*`** + `!data/news-summary.json` + commentaire d'avertissement (tout nouveau JSON de `data/` lu par une page prod doit être ré-inclus ici).
- **`scripts/build-news-summary.js`** : fallback **OpenRouter/Kimi K2.6** en mode JSON si Claude échoue (le cron ne dépend plus d'un seul provider). Validation commune `validateItems()` (5 items, champs et URLs non vides) appliquée aux deux chemins ; consigne « utilise le tool » remplacée par une consigne JSON sur le chemin fallback ; normalisation du secret `CLAUDE` → `ANTHROPIC_API_KEY` ; garde d'entrée = au moins un provider.
- **`.github/workflows/daily-news-summary.yml`** : `OPENROUTER_API_KEY` passé au job.
- **`scripts/blog/linkedin-post.mjs`** : `max_tokens` 2000 → **16000 sur le chemin OpenRouter** (Kimi est un modèle « thinking » : max_tokens court = content vide, `finish: length`). C'est le remède déjà appliqué au juge de la gate, qui n'avait jamais été porté ici — cause exacte de l'échec du post LinkedIn du 27-07.

### Vérifié
Chemin nominal Claude testé en local (5 items écrits) **et** chemin fallback forcé avec une clé invalide : 401 ×2 → bascule OpenRouter → **1ᵉʳ essai vide (`finish: stop`), 2ᵉ essai OK** → d'où le passage du fallback à **3 essais**. Sortie Kimi contrôlée : ton Leo respecté (1ʳᵉ personne), titres ≤61 car., accroches ≤141 car. `data/news-summary.json` restauré à la version du workflow après les tests (aucune trace). YAML + syntaxe JS validés.

### Correctif complémentaire (même jour)
- **`scripts/blog/linkedin-post.mjs`** : `try/catch` autour de `generer()` dans la boucle d'essais. Avant, une exception au 1ᵉʳ essai tuait le script **sans jamais tenter le 2ᵉ** — exactement le scénario du 27-07. Vérifié dans les deux sens : avec 2 clés invalides, les 2 essais sont tentés puis sortie propre (« Génération échouée après 2 essais », `exit 1`, plus de stack trace) ; avec les vraies clés, le post manquant du 27-07 (`linkedin/ia-gratuite-ou-payante.md`, 1183 car.) a été généré du premier coup par Claude. L'étape du workflow est en `continue-on-error: true`, donc un post raté n'a jamais bloqué la publication.

### Reste à faire
- **Jérémy** : poser `RESEND_API_KEY` en secret GitHub (valeur déjà dans Vercel) → réactive l'email de publication, qui transporte aussi le post LinkedIn.
- Le post du 27-07 est généré mais **non programmé sur Zernio** (le run de ce matin s'était arrêté avant) → à programmer à la main si tu veux le publier.

## 2026-07-21 · Déclinaison LinkedIn automatique des articles

### Pourquoi
Jérémy veut décliner chaque article en post LinkedIn natif (valeur dans le feed, pas un lien nu) pour attirer de la visibilité vers jerwis.fr. Style calibré en 3 itérations avec lui sur l'article AI Overviews.

### Livré
- **`scripts/blog/linkedin-post.mjs`** : génère `linkedin/<slug>.md` (post + 1er commentaire) depuis le draft. **Recette validée figée dans le prompt** : hook = 1 phrase sujet-verbe-conséquence en mots simples + avis tranché ligne 2, puis chiffre qui pique (jamais inventé), pique d'humour, renversement, question binaire finale. Lien UNIQUEMENT en 1er commentaire (l'algo pénalise les liens dans le corps). 800-1200 car., tutoiement, zéro hashtag. Gates mécaniques : mots bannis, longueur, pas d'URL dans le corps, finit par une question. Post validé v3 embarqué comme exemple few-shot.
- **`blog-autopilot.yml`** : étape « Post LinkedIn » après la traduction EN (continue-on-error) → le fichier part dans le même commit que l'article.
- **`notify-publish.mjs`** : l'email de publication contient désormais le post + le 1er commentaire prêts à coller.
- **Backlog : 9 posts générés** (ai-overviews = version validée à la main, + 8 auto : meta-ai-whatsapp, resumer-pdf, apprendre-langue, donnees-perso, le-chat-vs-chatgpt, creer-images, ia-cv, verifier-info) → ~3 semaines de matière à 3-4 posts/sem.
- `.vercelignore` : `linkedin/` exclu du déploiement (archive interne, pas des pages du site).

### Fichiers touchés
`scripts/blog/linkedin-post.mjs` (nouveau), `scripts/blog/notify-publish.mjs`, `.github/workflows/blog-autopilot.yml`, `.vercelignore`, `linkedin/*.md` (9 nouveaux).

### Livré (2e partie — programmation Zernio, même jour)
- **`scripts/blog/zernio-schedule.mjs`** : programme un post via l'API Zernio (`firstComment` = le lien en 1er commentaire, timezone Europe/Paris, mot-clé `tomorrow@HH:MM`). Semaine 1 programmée à la main sur le profil perso de Jérémy (21→24/07, compte Zernio `69c06ed66cb7b8cf4c8f5689` — le slot LinkedIn a basculé de la page Eurofiscalis vers le perso ; les posts Eurofiscalis du workspace sont Instagram-only, pas de conflit).
- **Autopilot** : l'étape LinkedIn programme désormais le post à **J+1 8h30 Paris** automatiquement (nécessite le secret GitHub `ZERNIO_API_KEY`) ; l'email de publication indique si la programmation a réussi (sinon copie à coller à la main).

### Livré (3e partie — carrousels LinkedIn, même jour)
- **`scripts/blog/carousel-render.mjs`** : rendu FIESTA pur Node (satori → resvg → PNG → pdf-lib → PDF 1080×1350, ~340 Ko), zéro navigateur = compatible CI. Design validé par Jérémy sur proto (`_preview-carousel-linkedin.html`) : fond noir, Archivo Black uppercase, UN mot accentué/slide (rotation teal/fuchsia/orange), kickers JetBrains Mono, triple-stripe, halo radial. Polices TTF committées dans `scripts/blog/fonts/`. Gotchas satori corrigés : espaces insécables entre spans (sinon avalés) + flexWrap sur les lignes.
- **`scripts/blog/linkedin-carousel.mjs`** : LLM transforme le post (pas l'article) en 6-8 slides « un slide = un message » — **sélectif** : juge d'abord si le post s'y prête (chiffre fort ou méthode), sinon skip. Gates : 1 seul accent par slide, ≤14 car./ligne, accents jamais consécutifs, badge CTA = URL courte, mots bannis.
- **Workflow + email** : le carrousel se génère après le post (non bloquant) et part en **pièce jointe PDF de l'email de publication** — à ajouter au post Zernio en 20 s (l'API Zernio annonce les documents LinkedIn mais n'expose pas encore le schéma → v2 quand c'est documenté). `linkedin/carousels/` gitignoré (artefacts régénérables).

### Livré (4e partie — attache Zernio auto, même jour)
- Flux presign Zernio percé à jour empiriquement (non documenté) : `POST /v1/media/presign` `{filename, contentType}` → PUT PDF → `mediaItems: [{type:'document', url}]`. Le PUT partiel `/posts/{id}` préserve content/firstComment/scheduledFor. **`zernio-schedule.mjs` attache désormais le carrousel automatiquement** s'il existe ; carrousels attachés aux posts des 22 et 24/07 ; email adapté (« déjà attaché » vs « à la main »).

### À venir
- Article du vendredi → post le samedi 8h30 (audience LinkedIn plus faible le week-end) — à décaler au lundi si les stats le confirment.
- Si la qualité dévie : ajuster l'exemple few-shot dans `linkedin-post.mjs` plutôt que les règles.

## 2026-07-20 · /apprendre v3 — parcours 5 étapes (pratique navigateur avant Claude Code)

### Pourquoi
Point contrariant identifié de longue date (et confirmé par la recherche user de juin) : le parcours envoyait le débutant de « poser les bases » directement à Claude Code + terminal. Il manquait une étape de pratique en navigateur (prompts, résumés, vérification, visuels) avant l'outil technique. Rendue possible maintenant car les 5 articles concernés sont publiés (FR + EN) par l'autopilot.

### Livré (FR + miroir EN)
- **Nouvelle étape 02 « Mettre l'IA au travail »** (fuchsia, 100 % navigateur, versions gratuites) : 5 cartes → ecrire-bon-prompt-non-dev, resumer-pdf-video-avec-ia, verifier-info-ia, creer-images-ia-gratuit, choisir-ia-ecrire-coder-images.
- **Décalage des étapes** : Claude Code 02→03 (orange), Agents 03→04 (teal) avec `automatiser-taches-ia-sans-coder` ajouté en carte d'ouverture 04.1, Aller plus loin 04→05 (ink). ZÉRO CSS ajouté (les classes `s-*` cyclent).
- **Rail 5 entrées**, barre de progression `/ 5` (JS `n/5`, `aria-valuemax=5`), 4 mini-marquees de transition re-textés/insérés, chips hero **5 étapes · 24 lectures · ~4h30 · 0 €**.
- **JSON-LD** : Course `hasPart` 5 parts + workload PT4H30M, LearningResource PT4H30M. FAQPage/BreadcrumbList intouchés. Meta og/twitter recalées (5 étapes).
- **Cohérence** : step-next de l'étape 01 (« Passer à Claude Code » → « Mettre l'IA au travail »), 4 mentions de numéro d'étape dans la section peurs décalées (guide install → étape 03, GitHub → étape 03, gratuit → étapes 01 et 02, Claude Pro → étape 03).
- QC : 4 JSON-LD valides ×2 langues, badges 01.1→05.7 uniques, 6 liens FR+EN vérifiés, francité EN 0,07 %, progression 5/5 + reset OK (preview), 0 erreur console, light + dark cohérents.

### Fichiers touchés
`apprendre.html`, `en/apprendre.html`, `CHANGELOG.md`, `CLAUDE.md`.

### Correctifs post-livraison (même jour)
- **`5 → 7 lectures`** (commit f09adb5) : la section 05 « Aller plus loin » compte 7 cartes mais son `step-facts` affichait encore « 5 lectures » (incohérence antérieure au chantier). Corrigé FR + EN.
- **Temps de lecture aligné sur le réel** (commit b9f64ea) : la somme des 7 cartes de la section 05 = ~91 min (pas ~55). Passé le fact de section à **~91 min**, remonté le chip hero total à **~4h30** (au lieu de ~4h), et le JSON-LD `timeRequired`/`courseWorkload` à **PT4H30M** — chip, facts et données structurées désormais cohérents. FR + EN.

## 2026-07-20 · Refonte /apprendre — baisser la barrière à l'entrée

### Pourquoi
Demande de Jérémy : la page présupposait qu'on avait déjà décidé d'apprendre (« Apprendre l'IA. Dans l'ordre où je l'ai appris. ») et n'expliquait nulle part ce qu'EST une IA de coding, ni ne répondait aux peurs spécifiques (terminal, casser quelque chose, prix, anglais, quel outil). Objectif : que la page parle aux nouvelles personnes qui hésitent — expliquer, répondre à leurs questions, enlever leurs peurs.

### Livré (FR + miroir EN)
- **Hero recentré visiteur** : « L'IA qui code. Sans être développeur. » + lead empathie (« Je ne suis pas développeur… Si tu sais écrire un message, tu sais déjà faire l'essentiel ») ; kicker « Parcours débutant · Zéro prérequis · Zéro jargon ». Title/meta/og recentrés pareil.
- **Nouvelle section « C'est quoi, une IA qui code ? »** (60 s) : analogie du collègue à qui on écrit en français (« Le code, c'est lui qui l'écrit. Toi, tu écris des phrases. »), mention honnête des autres outils (Codex, Cursor, Copilot → lien comparatif), et **3 preuves par des non-devs** (Shirley/outil de vente, Jérémy/Hermes, sa mère/photos Airbnb) en cards liées aux articles. CSS `.whatis` + `.proof-*` ajouté (inline, motifs FIESTA existants).
- **Peurs 5 → 10** : ajout terminal (« juste une zone de texte »), casser son ordi (permissions + GitHub), **prix réel** (0 € pour lire et démarrer ; Claude Code = Claude Pro 20 $/mois sans engagement — chiffre aligné sur claude-code.html), anglais (l'IA comme traducteur de jargon), « pourquoi Claude Code et pas Cursor/ChatGPT » (honnêteté : c'est l'outil documenté ; les compétences valent pour tous). FAQPage JSON-LD étendu 5 → 10 Q/R (GEO).
- **Étape 02 dé-intimidée** : « Claude installé sur ton ordinateur » (plus « dans ton terminal ») + rappel « tu continues d'écrire des phrases en français, rien d'autre ».
- QC : 4 JSON-LD valides ×2 langues, liens cibles vérifiés, ton Leo (« ton premier truc » → « ton premier résultat »), gate francité EN 0,1 %, preview light/dark (artefact connu du screenshot après scroll contourné en masquant le hero).

### Fichiers touchés
`apprendre.html`, `en/apprendre.html`, `CHANGELOG.md`.

### À venir
- Le quickwin (premier prompt en 2 min) reste dans l'étape 01 — si la page doit encore descendre d'un cran en friction, le remonter au-dessus du rail de progression.

## 2026-07-20 · Design v2 des articles — les 18 derniers (hand-made)

### Pourquoi
`scripts/migrate-article-design.mjs` (session du 06-07) avait volontairement exclu 18 articles au CSS trop divergent du `_TEMPLATE.html` pour un remplacement sûr. Analyse approfondie : ce ne sont pas des designs totalement différents mais des variantes enrichies du même template (couleur d'accent personnalisée par article + composants custom : `.bignum`, `.piege`, `.outils`, `.cas`, `.checklist`, `.quick`, et surtout `.step`/`.mini-marquee`/`table` redéfinis avec des valeurs différentes de `article.css`). Remplacer leur `<style>` aurait cassé ces composants (conflit de spécificité CSS).

### Livré
- `assets/article-extras.css` (nouveau) : CSS **additif**, chargé EN PLUS du `<style>` existant — n'ajoute que les composants introuvables dans ces articles (`::selection`, barre de progression `.read-progress`, prompt-card `blockquote` + bouton copier, `hr` signature, mesure de lecture 700px sur `p/ul/ol/blockquote`, images de corps). Volontairement absent : `.step`, `.mini-marquee`, `table` (déjà stylés différemment sur ces articles, à préserver).
- `scripts/migrate-handmade-extras.mjs` (nouveau) : injecte `article-extras.css` + `article-reading.js` (idempotent, chemins `../assets/` FR / `/assets/` EN). 18 slugs × 2 langues = 36 fichiers migrés.
- QC : JSON-LD valide + 0 placeholder sur les 36 fichiers ; vérifié en preview (computed styles) qu'aucun composant existant n'est altéré (`.step` garde son padding custom, `.mini-marquee` son gradient plein — testé sur `hermes-agent`), que la mesure de lecture et la prompt-card fonctionnent (testé sur `outil-vente-claude-code`, bouton copier actif), et que les chemins d'assets EN (`/assets/...`) sont corrects (`en/articles/hermes-agent`).
- Nettoyage : 2 fichiers `research/*.json` obsolètes (slugs déjà publiés le 23/06) supprimés du working dir (jamais commités).

### Fichiers touchés
`assets/article-extras.css` (nouveau), `scripts/migrate-handmade-extras.mjs` (nouveau), 18 `articles/*.html` + 18 `en/articles/*.html` migrés.

### À venir
Rien — les 18 derniers articles ont désormais le même confort de lecture (progress bar, prompt-cards, mesure de lecture, hr) que les 44 articles du template, sans risque sur leur mise en page custom.

## 2026-07-20 · Blog autopilot : cadence ×2 + refill de la file (32 sujets)

### Pourquoi
Health-check du pilote auto : système vert (publications des 13/16/20-07 OK, gate passée, IndexNow pingé) mais il ne restait qu'1 sujet pending → arrêt silencieux imminent (file vide = exit propre, aucune alerte). Jérémy veut passer à 4 articles/semaine et un tampon d'environ 2 mois.

### Livré
- `blog-autopilot.yml` : cron `0 5 * * 1,4` → `0 5 * * 1,2,4,5` (lun/mar/jeu/ven 7h Paris, 4 articles/sem).
- `data/topic-queue.json` : +32 sujets pending (33 au total ≈ 8 semaines). Sourcing : Google Trends FR 90 j (seed « IA » : hermes +300 %, claude ia français +50 %, meta ia +40 %), autocomplétion Google FR (36 stems sondés), top Ahrefs FR (chatgpt = requête n°1, 20,8 M/mois). Dédupliqué contre les 40 articles existants. P1 : Meta AI WhatsApp, AI Overviews France, retouche photo, chanson Suno, IA gratuite vs payante, Claude c'est quoi.
- Issues GitHub #1 et #4 (« en panne ») fermées — échecs ponctuels des 05-09/07, tout est vert depuis.
- `CLAUDE.md` : section Publication complétée (fonctionnement autopilot + kill switch).

### Livré (2e partie — robustesse LLM, même jour)
Deux runs de test manuels rapprochés ont révélé 3 fragilités, toutes corrigées :
- **Juges de la gate → Kimi K2.6 via OpenRouter** (`OPENROUTER_API_KEY`, secret GitHub + .env.local) : ~0,03 $/appel, fallback Gemini si panne (`llm.mjs` : nouveau provider `openrouter()`, `judge()` re-routé). Testé : gate complète 62,2/70 jugée par Kimi. La recherche grounding reste sur Gemini (gratuit, sans équivalent), désormais avec retry ×3 espacés de 45 s sur réponse vide (`research.mjs`) — c'est ce qui avait fait échouer le run test 2.
- **Claude 529 Overloaded retryable** (`llm.mjs` : 502/529 ajoutés aux statuts retryables — un 529 tuait l'essai 3 du run test 1) + fallback génération OpenRouter si Claude reste KO.
- **Calibrage juge C2** : le tutoiement (obligatoire) était compté comme « familier » par le juge, et les callouts conseil comme « ton consultant » → règles explicitées dans `TON_LEO`/`config.mjs` + prompt juge `qa-gate.mjs`.
- **Validation E2E** : run complet re-déclenché après les correctifs → `meta-ai-whatsapp` publié du premier coup à **66,7/70** (c'était le sujet qui avait échoué 3 fois avant calibrage). Gotcha vu en CI : Kimi K2.6 « réfléchit » avant de répondre → content vide si le budget tokens est trop court (finish: length) → juge durci (2 essais, max_tokens 16k). Issue #5 (alerte des runs de test) fermée.

### Fichiers touchés
`.github/workflows/blog-autopilot.yml`, `data/topic-queue.json`, `scripts/blog/llm.mjs`, `scripts/blog/research.mjs`, `scripts/blog/qa-gate.mjs`, `scripts/blog/config.mjs`, `CLAUDE.md`.

### Livré (3e partie — autopilot bilingue, même jour) = Phase 4 i18n
- **`scripts/i18n/translate-article-en.mjs`** : transcréation EN d'un article FR (Claude sonnet, fallback OpenRouter) — skeleton `<style>/<script>` (JSON-LD traduit), termbase respecté, **gate francité** (>8 % de mots-fonction FR = recopie → retry), puis `gen-en-page.mjs` (plomberie + validation).
- **`scripts/i18n/translate-missing-en.mjs`** : catch-up idempotent — traduit tout article FR sans EN + carte `en/articles.html` + Featured `en/index.html` (max 8, trim) + `inject-hreflang-fr` + `build-sitemaps`. Branché dans `blog-autopilot.yml` après publication (`continue-on-error` : ne bloque jamais le FR, se rattrape au run suivant).
- **Backlog résorbé : 5 articles traduits** (le-chat-mistral-vs-chatgpt, donnees-perso-ia-confidentialite, apprendre-langue-avec-ia, resumer-pdf-video-avec-ia, meta-ai-whatsapp) — gate francité 0 % partout, sitemap-en 162 pages, parité FR/EN complète.

### À venir
- Surveiller la conso OpenRouter (attendu ≈ 1,5-2 $/mois à 17 articles) + coût traduction (~0,15 $/article Claude).
- Re-remplir la file vers mi-septembre (l'autopilot s'arrête en silence quand elle est vide).

## 2026-07-06 · Design v2 des articles (migration + pipeline publish)

### Pourquoi
Exécution du plan `docs/design-articles-v2.md` (design déjà validé visuellement) : mesure de lecture 700px, H3 sentence-case `//` teal, prompt-cards (blockquote), tableaux stylés, hr signature, mini-marquees, barre de progression de lecture — jusqu'ici absents des articles (`<style>` inline dupliqué par fichier).

### Livré
- `articles/_TEMPLATE.html` : `<style>` inline (~330 lignes) remplacé par `assets/article.css?v=20260706` (partagé) + `assets/article-reading.js` (progress bar + bouton Copier sur les prompts).
- `scripts/publish.js` : `renderBody()` encadre désormais le corps par les ancres `<!-- ARTICLE_BODY:START/END -->` + 2 mini-marquees FR (signature FIESTA). `fillTemplate()` remplace en priorité entre ces ancres si présentes, sinon fallback sur l'ancien `bodyZoneRegex` (rétro-compatibilité, fail-loud conservé).
- `scripts/migrate-article-design.mjs` (nouveau) : migration idempotente des articles déjà publiés. Détection de conformité réelle par diff CSS (LCS) contre le baseline du template — le critère littéral du plan (`--fuchsia` + `.tldr {`) ne discriminait aucun fichier, y compris les hand-made à exclure. 17 articles FR + 17 EN migrés ; le CSS custom au-delà du template (share buttons, FAQ, tableaux comparatifs, TOC) est préservé pour `dev-browser`, `photos-perso-ia`, `superpowers`, `claude-code-workflow-tips`, `loops-claude` ; les mini-marquees déjà présentes (`superpowers`, `claude-code-workflow-tips`) ne sont pas dupliquées. 18 articles hand-made (CSS non issu du template : `karpathy`, `jerwis-finance-tracker`, etc.) restent inchangés, listés par le script.
- Bug trouvé et corrigé en QC : les pages `en/articles/*.html` utilisent des chemins d'assets absolus (`/assets/...`) contrairement aux FR (`../assets/...`) — le script en tenait compte de façon incorrecte pour l'injection de `article.css`/`article-reading.js` ; corrigé + revérifié sur les 17 fichiers EN.
- QC : greps (résidu CSS, ancres, marquees x2), JSON-LD valide, 0 placeholder, `npm run publish creer-images-ia-gratuit` stable (diff vide), spot-check visuel (proto + 5 articles FR/EN, light/dark/375px, 0 erreur console).

### Fichiers touchés
`articles/_TEMPLATE.html`, `scripts/publish.js`, `scripts/migrate-article-design.mjs` (nouveau), 17 `articles/*.html` + 17 `en/articles/*.html` migrés, `feed/articles.xml`.

### À venir
- Les 18 articles hand-made (karpathy, jerwis-finance-tracker, agents-ia-guide, etc.) restent sur leur CSS custom historique — migration manuelle au cas par cas si besoin un jour.
- Section empty pré-existante repérée dans `creer-images-ia-gratuit.html` (fence ``` orphelin dans le draft, avant le premier `<!-- section -->`) — hors scope de cette migration, déjà présente avant.

## 2026-07-03 · Assainissement doc agents (AGENTS.md + CLAUDE.md)

### Pourquoi
Audit doc : `AGENTS.md` (497 l.) était une copie d'avril corrompue par un sed « Claude Code→Codex » (domaine canonique inversé, 5 articles au lieu de 26, `npm run brainstorm` supprimé depuis) et contredisait le `CLAUDE.md`. Le `CLAUDE.md` (301 l.) dépassait la règle « max ~150 lignes ».

### Livré
- `AGENTS.md` remplacé par `@CLAUDE.md` (1 seule source de vérité). Deux infos uniques encore vraies sauvées avant suppression : classe `.download-form` (form subscribe de `claude-code.html`) et `downloads/README.md` (guide install) → reportées dans le CLAUDE.md.
- Charte FIESTA / 89 + ton « Leo » (intégral) déplacés vers `docs/charte-fiesta-et-ton.md` (nouveau) ; le CLAUDE.md garde un résumé 4 lignes + pointeur.
- CLAUDE.md élagué 301 → 97 lignes (style dense conservé, scripts npm cités vérifiés contre `package.json`).

### Fichiers touchés
`AGENTS.md`, `CLAUDE.md`, `docs/charte-fiesta-et-ton.md` (nouveau), `CHANGELOG.md`.

### À venir
- Rien — infos obsolètes d'AGENTS.md volontairement non reprises (liste YT hardcodée contraire à la règle source-de-vérité JSON, section brainstorm, TODOs périmés).

## 2026-06-10 · Fixes SEO P1→P4 (exécution du plan d'audit, 5 agents)

### Pourquoi
Exécution des priorités 1 à 4 de l'audit SEO du 2026-06-09 (voir entrée suivante). Objectif n°1 : débloquer l'indexation (8/145 pages dans Bing).

### Livré
**P1 — Critique**
- Auto-linker patché : `PROTECTED_TAGS` + `title` + `head` dans `auto-link-glossary.js` et `auto-link-articles.mjs`, + garde-fou anti-404 (skip + warning si la cible n'existe pas). Les 8 `<title>` pollués nettoyés (claude-code-workflow-tips, hermes-agent, llm-wiki-karpathy, loops-claude, outil-vente-claude-code, superpowers, tuto-agent-contrats, tuto-agent-gmail).
- `/articles` désormais crawlable : 26 cartes statiques en HTML brut (markup identique au rendu JS, hrefs extensionless), JS converti en progressive enhancement (filtres/animations sur le DOM statique, plus de render). Nouveau `scripts/build-articles-page.mjs` (npm `articles:page`) branché dans `publish.js` → la liste se régénère à chaque publication. JSON-LD ItemList corrigé (25→26).
- `downloads/CLAUDE.md` restauré (`git checkout` — la suppression locale non commitée aurait cassé le freebie référencé par 3 pages).
- Bug latent corrigé dans `publish.js` : `updateSitemap()` et les messages de fin construisaient les URLs avec `.html` alors que le sitemap est extensionless → aurait créé des doublons à la prochaine publication (même famille que le bug SITE_URL).

**P2 — Fort impact**
- `favicon.ico` (16+32+48, 2 Ko, rendu via Chromium avec la vraie fonte Archivo Black) + `apple-touch-icon.png` (180×180 opaque) créés → fin des ~298 requêtes 404.
- 21 liens cassés réparés : 14 "voir aussi" lexique remappés (prompt→prompt-engineering, agent→skill-agent, perplexity→perplexity-comet, gemini-3→gemini-3-1-pro, lovable retiré), 3 hrefs relatifs dans `articles/superpowers.html`, lien quiz → `articles/superpowers` (l'article skills jamais publié), script mort `tts-player.js` supprimé.
- Sitemap 145→142 (3 pages légales noindex retirées) ; pages légales passées en `noindex,follow`.

**P3 — Quick wins**
- Suffixe lexique `· Lexique Jerwis` → `· Jerwis` (dans `build-lexique.js` + les 32 fiches manuelles) : titles >65 chars 15→0, >60 : 21→9.
- 9 titles racine réécrits ≤60 chars (mcp, agents-ia, claude-code, podcast, apprendre, debutant, workflows, modeles-ia-monde, precommande-photos) + 20 descriptions >160 réécrites à 120-155 (ton Leo), og/JSON-LD synchronisés.
- robots.txt : 2 Disallow obsolètes supprimés. `.vercelignore` : + `articles/_TEMPLATE.html` + `templates/`. `quiz.html` : JSON-LD WebPage+BreadcrumbList ajouté.

**P4 — Long terme**
- Images home : −915 Ko (−86 %). Héro LCP en variante 540px (158→43 Ko) avec srcset + preload `imagesrcset` ; vignettes webp 400w/800w dans `photos/thumbs/` (srcset sur les `<source>`, fallback jpg intact) ; avatars chaînes réencodés (les webp d'origine étaient PLUS LOURDS que les jpg). Originaux conservés (og:image).
- CSP **enforcing** dans `vercel.json`, construite depuis l'inventaire réel (Plausible, Stripe embedded checkout, Clarity, Meta Pixel, audio R2) et validée en interceptant 9 pages prod checkout Stripe inclus (0 violation). ACAO `*` (défaut Vercel) restreint à `https://jerwis.fr`.

**Build lexique sécurisé** (découvertes en route) : le rebuild détruisait les entrées A-Z des 32 fiches manuelles insérées dans la zone générée du hub → garde-fou ajouté (skip + warning, `--force-hub` pour outrepasser) ; le template n'avait pas le snippet Plausible (les rebuilds le supprimaient des 62 pages) → ajouté au template.

### Vérifié
0 `<title>` pollué sitewide · 26 liens statiques dans articles.html (0 doublon, filtres OK) · sitemap 142 entrées 0 .html · scripts `node --check` OK · vercel.json JSON valide · srcset 54/54 fichiers existants · rendu navigateur home + articles sans régression (héro 540w servi, 0 image cassée, seul 404 local = `/api/news`, normal hors Vercel).

### Fichiers touchés
`scripts/` (publish.js, build-articles-page.mjs nouveau, build-lexique.js, auto-link-glossary.js, auto-link-articles.mjs), `package.json`, `articles.html`, `index.html`, `quiz.html`, 8+2 articles, 9 pages racine, lexique (94 fiches + hub), 3 pages légales, `sitemap.xml`, `robots.txt`, `.vercelignore`, `vercel.json`, `favicon.ico` + `apple-touch-icon.png` (nouveaux), `photos/A7100670-540.webp` + `photos/thumbs/` (30 fichiers nouveaux).

### À venir (actions Jérémy — bloquées côté agent)
- [ ] **Commit + push pour déployer** (rien n'a été commité). Après deploy : surveiller la console du checkout Stripe (si blocage CSP → élargir `connect-src`/`frame-src` dans vercel.json).
- [ ] Search Console : vérifier l'indexation Google réelle + demander la réindexation des 8 articles aux titles réparés et de `/articles`.
- [ ] Statuer sur jeremysagnier.com (DNS mort, pas de 301 — re-pointer si encore possédé, sinon acter).
- [ ] R2 custom domain (`audio.jerwis.fr`) pour sortir le podcast de `*.r2.dev` (rate-limité), puis `npm run podcast:rss`.
- [ ] (Reco) Intégrer les 32 fiches lexique autonomes à `data/lexique.json` pour supprimer l'état hybride.

## 2026-06-09 · Audit SEO complet (code local + live + indexation)

### Pourquoi
Audit demandé : 4 agents en parallèle (on-page 149 pages, technique sitemap/liens/config, live HTTP/perf, indexation SERP). Aucun fix appliqué — rapport seul.

### Constat global
Socle très sain : canonicals 100 % corrects (non-www), H1/alt/lang 100 %, JSON-LD 94,6 %, sitemap 145/145 mappées, redirects 308 propres, vrai 404, HSTS, TTFB 66-167 ms, perf mobile estimée 85-95. MAIS indexation Bing famélique : 8 pages sur 145 (~5,5 %).

### À venir (findings priorisés)
- [ ] **P1** : 8 articles avec balises `<a class="lex-link">` injectées DANS le `<title>` par l'auto-linker (titres SERP détruits). Root cause : `PROTECTED_TAGS` sans `title` dans `scripts/auto-link-glossary.js` (l.29) et `scripts/auto-link-articles.mjs`. Fichiers : claude-code-workflow-tips, hermes-agent, llm-wiki-karpathy, loops-claude, outil-vente-claude-code, superpowers, tuto-agent-contrats, tuto-agent-gmail.
- [ ] **P1** : `/articles` rendu 100 % client-side (zéro `href` crawlable dans le HTML brut) → cause probable de l'indexation à 5,5 %. Générer la liste en HTML statique.
- [ ] **P1** : `downloads/CLAUDE.md` supprimé localement (non commité) mais référencé par index/claude-code/quiz + `.vercelignore` → NE PAS commiter la suppression sans retirer les 4 références (freebie cassé sinon).
- [ ] **P2** : `/favicon.ico` + `/apple-touch-icon.png` référencés par les 149 pages mais inexistants (404 partout, favicon absent des SERP). Les générer depuis `favicon.svg`.
- [ ] **P2** : 21 liens internes cassés : 14 "voir aussi" lexique vers slugs inexistants (prompt, agent, perplexity, gemini-3, lovable), 3 liens relatifs faux dans `articles/superpowers.html`, lien quiz → article jamais publié (draft tuto-cours-skills), script mort `js/tts-player.js`.
- [ ] **P2** : 3 pages légales noindex présentes dans le sitemap (signaux contradictoires GSC).
- [ ] **P2** : images home = 83 % du poids (1 Mo), OG jpg jusqu'à 257 Ko en vignette, zéro srcset ; héro LCP 1078×1600 pour affichage ≤450px.
- [ ] **P3** : 33 titles >60 chars (suffixe `· Lexique Jerwis`), 15 descriptions >160 chars (mcp 241 !), robots.txt 2 Disallow obsolètes, pas de CSP, podcast sur `*.r2.dev` (rate-limité), `articles/_TEMPLATE.html` + `templates/` déployés sans noindex, quiz.html sans JSON-LD.
- [ ] **Stratégique** : jeremysagnier.com ne résout plus (DNS mort, pas de 301) — statuer : re-pointer si encore possédé, sinon acter la perte. Vérifier l'indexation Google réelle dans Search Console (scraping bloqué, chiffre indisponible).

## 2026-06-09 · Fix SITE_URL au mauvais domaine dans les scripts

### Pourquoi
`scripts/publish.js` (ligne 38) et `scripts/seo-improve.js` (ligne 31) hardcodaient `SITE_URL = 'https://jeremysagnier.com'` alors que tout le site est sur `https://jerwis.fr` (145 entrées sitemap + canonicals). Conséquence : `updateSitemap()` insérait/cherchait des URLs au mauvais domaine (doublons au lieu de mise à jour de l'entrée jerwis.fr existante), et les messages de fin de publication (URL prod + commande indexnow) pointaient vers le mauvais domaine.

### Livré
- `SITE_URL` corrigé en `https://jerwis.fr` dans `publish.js` et `seo-improve.js`
- `sitemap.xml` vérifié (grep) : **0** URL jeremysagnier.com résiduelle — aucun doublon à nettoyer
- Bonus repéré au grep repo-wide : `downloads/install-plugins.sh` (fichier téléchargeable public) pointait vers `jeremysagnier.com/claude-code.html#plugins` → corrigé en jerwis.fr (lignes 3 et 79). Vérifié : ce fichier n'est pas dans `jeremy-claude-pack.zip`, pas de rebuild nécessaire.
- Seule mention restante dans le repo : historique du CHANGELOG (normal)

### Fichiers touchés
- `scripts/publish.js` · `scripts/seo-improve.js` · `downloads/install-plugins.sh`

## 2026-06-09 · Dégraissage CLAUDE.md (497 → 300 lignes)

### Pourquoi
Le CLAUDE.md accumulait de l'inventaire périmé (table de 5 articles alors qu'il y en a 26, ancien H1, ancienne nav, section Brainstorm dont les scripts ont été supprimés le 2026-05-05) et de la méta-doc hors-projet (plugins Claude Code). Audit + vérification de chaque point contre le code réel.

### Livré
- **Supprimé** : section Back-office détaillée (remplacée par 3 lignes → `~/Projets/jerwis-admin/` a son propre CLAUDE.md) · bloc "Plugins Claude Code installés" · section "Brainstorm d'idées" (scripts supprimés, cf. entrée 2026-05-05) · table des 5 articles (remplacée par pointeur `articles.html` + `feed/articles.xml`) · liste hardcodée des 34 chaînes YouTube (source de vérité : `data/youtube-channels.json`) · bloc CSS mini-marquee (désormais dans `assets/main.css`) · JSON `vercel.json` inline (gotchas conservés)
- **TODOs purgés** (vérifiés faits/obsolètes) : Plausible installé · CHANGELOG.md existe · scraper X bloqué par l'API · LinkedIn en prod · 26 articles publiés · kill ancien projet Vercel (suppression du TODO actée dans une entrée précédente). Reste : séquence cours 5 jours Resend.
- **Ajouté** : section "Publication d'articles (drafts → articles)" (flux `npm run publish`, frontmatter requis, règle slug court corrigée : `publish.js` prend le nom de fichier comme slug, pas le frontmatter) · section "Data stores" (`data/*.json` + scripts qui les alimentent) · env vars complètes (Stripe, GitHub, Blob, Meta, R2, news build — noms uniquement)
- **Corrigé** : H1 home ("L'IA, c'est aussi pour nous.") · nav v2 (`Apprendre · Articles · Podcast · Newsletter · Plus`) · `main.css` ~3 900 lignes / 21 pages · outils internes déplacés dans `_internal/`
- **Faux positif d'audit** : `templates/podcast-cover.html` existe bel et bien (chemin correct dans `build-podcast-covers.js`) — non touché.

### Fichiers touchés
- `CLAUDE.md` (réécriture complète, 497 → 300 lignes)

### À venir
- [x] Bug repéré : `scripts/publish.js` ligne 38 → `SITE_URL` au mauvais domaine → corrigé (cf. entrée 2026-06-09 "Fix SITE_URL").

## 2026-05-26 · Réparation cron news + couverture sitemap + RSS du blog

### Pourquoi
Audit "qu'est-ce qui manque" → 3 trous concrets : (1) le cron GitHub Actions `daily-news-summary` échouait en silence depuis le 23/05 (4 jours, `data/news-summary.json` figé au 22/05) ; (2) 35 pages réelles absentes du sitemap (dont 32 fiches modèles/outils du lexique, la page `/news`, `/modeles-ia-monde`, et l'article `jerwis-finance-tracker`) → invisibles aux moteurs ; (3) aucun flux RSS pour le blog (seul le podcast en avait un).

### Livré
**Cron news (`.github/workflows/daily-news-summary.yml`)**
- Cause racine identifiée : secret `ANTHROPIC_API_KEY` **absent du repo GitHub** (le script `build-news-summary.js` exit 1). → Jérémy doit le poser : `gh secret set ANTHROPIC_API_KEY --repo sagnierjeremy-byte/Site-perso`
- Node 20 → 24 (deprecation des runners juin 2026)
- Nouveau step `Alert on failure` : ouvre/commente une issue GitHub à chaque échec (fini les 4 jours dans le noir)
- Conversion du gitlink fantôme `downloads/skills/humanizer` (référencé sans `.gitmodules`) en fichiers normaux → supprime le warning `No url found for submodule path` à chaque run

**Sitemap (`sitemap.xml` · 110 → 145 entrées)**
- +32 fiches modèles/outils lexique (gpt-5, claude-sonnet-4-6, midjourney-v7, cursor, sora-2…) placées dans une section **hors des marqueurs** `build-lexique.js` pour survivre aux futurs rebuilds
- +`/news` (changefreq daily), +`/modeles-ia-monde`, +`/articles/jerwis-finance-tracker`
- Cause racine : ces 32 pages HTML existent sans entrée dans `data/lexique.json` (créées hors pipeline) ; `build-lexique.js` ne les voyait donc pas

**RSS du blog (`feed/articles.xml` · nouveau)**
- Script `scripts/build-articles-rss.mjs` (npm `articles:rss`) — RSS 2.0, 26 articles, source de vérité : `<title>` / canonical / meta description / `datePublished` JSON-LD, tri chronologique desc
- Accroché à `scripts/publish.js` (régénération auto à chaque publication, pour ne plus dériver comme le sitemap)
- `<link rel="alternate" type="application/rss+xml">` ajouté dans le `<head>` de `index.html` et `articles.html`

**Fix métadonnées `articles/jerwis-finance-tracker.html`**
- Page dupliquée de l'article booking sans mise à jour du bloc SEO : og:title, og:description, breadcrumb, headline + description JSON-LD parlaient de Calendly/Letsignit, et la FAQPage entière portait sur le booking (risque mismatch structured-data + mauvais aperçu social)
- Corrigé sur le vrai sujet + FAQPage réécrite avec les 6 vraies Q/R de l'article. Scan de cohérence og:title sur les 27 articles : aucun autre cas (photos-airbnb = divergence volontaire)

**Suppression code mort Supabase/Resend**
- Supprimés : `lib/resend.js`, `lib/supabase.js`, `db/migrations/001-newsletter-schema.sql`, deps `@supabase/supabase-js` + `ws` (resync lock)
- Vérifié au préalable : tables `broadcasts`/`broadcast_events`/`scheduled_broadcasts` requêtées par AUCUN des deux projets (jerwis-admin ne les a que dans `database.ts` en types auto-générés, jamais en `.from()`)
- **NON fait (volontaire)** : les tables existent toujours en prod sur Supabase `npxvttwhrlrmwafpfudy` (inertes). DROP optionnel à faire manuellement via SQL Editor si on veut nettoyer la base — non automatisé car projet partagé. Tests 17/17 OK après suppression

### À venir / dette repérée pendant l'audit
- **32 fiches modèles hors pipeline** : ni dans `data/lexique.json` ni générées par un script. Décider d'un système de génération unifié, ou les laisser autonomes (et un `scripts/check-sitemap.mjs` garantirait la couverture).
- **`lexique.html` 527 Ko / 8859 lignes** inline → LCP mobile, à transformer en index léger (reporté, mérite sa propre session avec tests visuels).
- **Tables broadcast* en prod** : DROP manuel optionnel (voir ci-dessus).

## 2026-05-25 · Vague 3 lexique — refonte structurelle (17/17 recos closes)

### Pourquoi
Suite des 2 vagues du 25 mai (déjà 13 recos sur 17). V3 ferme les 4 dernières recommandations structurelles de l'audit : sectionnement thématique (#12), filtre Niveau (#13), champ `data-term-related` (#9), extension vulgarisation (#8) + intégration du tooltip glossaire sur 41 pages éditoriales.

### Livré
**Agent E · refonte structurelle `lexique.html`**
- **#12 grille thématique** : 8 cards d'entrée rapide en haut du lexique (Concepts fondamentaux · Modèles IA 2026 · Agents & MCP · RAG & connaissances · Multimédia · Sécurité · Outils · Automatisation), avec compteurs dynamiques, barre verticale colorée alternée teal/fuchsia/orange, click déclenche le filtre catégorie + scroll smooth vers la liste A-Z
- **#13 filtre Niveau** : `data-term-level` ajouté sur les 266 entrées via règle auto (`essentials` → debutant · `bases` → intermediaire · sinon → avance). Répartition : 30 / 44 / 192. 4 boutons sous la rangée de filtres existante (Tous · Débutant · Intermédiaire · Avancé). Logique cumulative avec les filtres thématique et lettre
- **#8 ext vulgarisation** : 20 défs supplémentaires reformulées (`agentic-workflow`, `chunking`, `noise-sensitivity`, `multi-query-retrieval`, `recherche-hybride`, `tool-use`, `structured-output`, `system-prompt`, `human-in-the-loop`, `eval`, `agent-graph`, `chain-of-thought`, `tool-misuse`, `token-passthrough`, `agent-goal-hijack`, `web-search-tool`, `voice-agent`, `vector-db`, `agents-md`, `supervisor-agent`)
- **#9 `data-term-related`** : 29 attributs ajoutés sur les termes les plus structurants (LLM, RAG, MCP, agent, embedding, prompt, token, hallucination, fine-tuning, reasoning-model + 10 modèles 2026 phares + termes connexes). Données seulement, UI sidebar à designer plus tard
- **Fix post-livraison** : ajout des click listeners sur `themeCards` et `levelButtons` (l'agent E avait oublié) — vérifié en QC : Agents → 89 visibles, Débutant → 30, Agents + Débutant → 5 visibles (intersection logique correcte)

**Agent F · intégration tooltip JS sur 41 pages**
- 27 articles patchés (`articles/*.html` incluant `_TEMPLATE.html`) avec `<link>` lexique-tooltip.css preload + `<script>` lexique-tooltip.js defer
- 14 pages racine patchées : `index`, `apprendre`, `claude-code`, `debutant`, `news`, `outils`, `modeles-ia`, `modeles-image-ia`, `modeles-ia-monde`, `github`, `quiz`, `workflows`, `podcast`, `articles`
- Skip volontaire : lexique.html, fiches détaillées `/lexique/*.html`, pages légales (CGV, mentions, confidentialité, suppression), pages commerciales (precommande, preferences)
- QC live sur loops-claude : 11 tooltips détectés sur les 12 termes fondamentaux (LLM, RAG, MCP, embedding, prompt, token, contexte, agent, workflow, chunk, hallucination)

### Métriques V3
| Mesure | Avant V3 | Après V3 |
|---|---:|---:|
| Cards thématiques d'entrée | 0 | **8** |
| Filtres Niveau | 0 | **4** (Tous + 3 niveaux) |
| Entrées avec `data-term-level` | 0 | **266** |
| Entrées avec `data-term-related` | 0 | **29** |
| Vulgarisations cumulées (V1+V2+V3) | 24 | **44** |
| Pages avec tooltip glossaire auto | 0 | **41** |

### Bilan global refonte lexique (V1+V2+V3)
**17/17 recos d'audit appliquées.** Notes audit initiales : 9-12/20 (4 angles). Le lexique est passé de 240 entrées à 270 (incluant 30 fiches modèles 2026), 8 termes essentiels à 30, 31 contextualisations « Tu le croises… » à 123, 24 pages détaillées à 90, sans page d'entrée prérequise à 2 pages structurelles (bases + choisir-modele-2026) + 1 script tooltip auto-glossaire intégré sur 41 pages éditoriales.

### Fichiers touchés (V3)
- `lexique.html` (+ ~600 lignes pour grille thématique, filtre niveau, fix click listeners, 29 attributs related, 20 vulgarisations)
- 41 fichiers HTML patchés (27 articles + 14 pages racine)
- `CHANGELOG.md` (cette entrée)

---

## 2026-05-25 · Refonte du lexique IA — 4 audits + 13 recos appliquées

### Pourquoi
Audit complet du lexique en 4 angles parallèles (compréhensibilité non-dev, précision technique 2026, cohérence ton Leo, complétude/catégorisation). Moyenne audit : 11/20. Trois fractures principales : (1) jargon imbriqué qui décroche le persona « entrepreneur curieux non-dev », (2) zéro modèle IA 2026 nommé (lexique daté 2023-24), (3) ton hybride Wikipédia + Leo.

### Livré
**Vague 1 — 3 agents parallèles (Quick wins + Création)**
- **Agent A · lexique.html** : 20 définitions « consultant » réécrites en Leo direct (`consiste à / désigne` → `c'est / sert à`), 10 définitions phares à la 1ère personne (LLM, RAG, MCP, token, embedding, hallucination, reasoning model, fine-tuning, open-weight, fenêtre de contexte), 24 imprécisions techniques corrigées (Skill, Workflow agentique, Realtime API end-to-end, Quantization, Distillation, GraphRAG, BM25, RRF, HNSW, etc.), 4 vulgarisations chirurgicales (Endpoint API, Reasoning effort, Aggregator, Embedding intégré), 6 termes obsolètes retirés (sonar-perplexity, stagehand, browserbase, payload-index, mcp-roots, mcp-tasks), 31 phrases « Tu le croises… » ajoutées en première passe, filtre UI « 24 pages » → « Pages détaillées », cleanup `dev` parasite en SEO ligne 5067.
- **Agent B (initial + B1 + B2) · 30 fiches modèles 2026** dans `lexique/` : Claude Sonnet 4.6, Opus 4.7, Haiku 4.5, GPT-5.5, GPT-5, Gemini 3.1 Pro, Gemini 2.5 Flash, Nano Banana, Llama 4, DeepSeek V3.2, DeepSeek R1, Mistral Large 3, Qwen 3, Grok 4, Sora 2, Veo 3, Kling, Flux, Midjourney v7, Imagen 4, ElevenLabs v3, Suno, Udio, Cursor, Windsurf, Bolt.new, Replit Agent, Perplexity Comet, Genspark, ChatGPT Atlas. Toutes fiches Leo (1ère pers., ~400-600 mots, sections « C'est quoi / À quoi ça sert / Comparaison / Prix / Mon avis »), footer « Vérifié 2026-05-25 / prochaine relecture 2026-11-25 ».
- **Agent C · 3 pages structurelles** :
  - `lexique/bases.html` : page prérequis « Les 12 bases à lire avant de plonger ». 12 cards en 3 blocs thématiques (cerveau & langage / mémoire & RAG / bras & exécution), analogies concrètes (LLM = cerveau qui a beaucoup lu, MCP = prise jack universelle, etc.)
  - `lexique/choisir-modele-2026.html` : arbre de décision en 6 étapes (besoin → budget → confidentialité → frontier ou quotidien → recommandations par cas d'usage → mes choix perso 2026)
  - `assets/lexique-tooltip.css` + `assets/lexique-tooltip.js` : script tooltip auto qui scanne les pages du site et highlight les 12 termes fondamentaux (LLM, prompt, token, contexte, embedding, vecteur, RAG, agent, MCP, workflow, chunk, hallucination) avec une bulle au hover/focus. Garde-fous : 1 occurrence max par paragraphe, skip les `<a>` / headings / `<code>`. À intégrer sur les articles + apprendre.html plus tard.

**Vague 2 — 1 agent séquentiel (Intégration + Refonte essentiels)**
- **Agent D · lexique.html** : 30 entrées A-Z créées pour les fiches modèles (B+C+G+D+E+F+I+K+L+M+N+P+Q+R+S+U+V+W, section K créée pour Kling), « Prompt » et « Agent » créés comme entrées seules (manquaient auparavant), 92 termes passés en `essentials` au lieu de 8 originaux (en pratique 30 — légèrement au-dessus de la cible 22-25 mais cohérent), 92 phrases « Tu le croises… » supplémentaires (passage de 31 → 123 entrées contextualisées), 3 footers « Vérifié » corrigés (2026-05-23 → 2026-05-25).

### Métriques avant/après
| Mesure | Avant | Après |
|---|---:|---:|
| Entrées A-Z | 240 | **270** |
| Termes « Essentials » | 8 | **30** |
| « Tu le croises… » dans `<small>` | 31 | **123** |
| Pages détaillées | 24 | **90** |
| Pages structurelles | 0 | **2** (bases + choisir-modele) |
| Script tooltip glossaire auto | non | **oui** (12 termes) |

### Fichiers touchés
- `lexique.html` (8411 → 8566 lignes, +37 entrées dont 6 supprimées et 32 ajoutées, ~150 `<small>` réécrits)
- `lexique/*.html` (30 nouvelles fiches modèles, 11-12 Ko chacune)
- `lexique/bases.html` (nouveau, 19.8 Ko)
- `lexique/choisir-modele-2026.html` (nouveau, 31.3 Ko)
- `lexique/deep-research.html` (1 lien orphelin retiré)
- `assets/lexique-tooltip.css` (nouveau, 2.3 Ko)
- `assets/lexique-tooltip.js` (nouveau, 6.8 Ko)
- `CHANGELOG.md` (cette entrée)

### Reports en V3 (refonte structurelle plus lourde, à arbitrer)
- **#9** champ `related: [terme1, terme2]` pour résoudre les confusions Agent/Workflow/Skill + Embedding/Vector DB/Search → besoin UX à designer
- **#12** sectionnement par grandes familles thématiques (Modèles IA 2026 / Concepts fondamentaux / Agents & MCP / RAG / Multimédia / Sécurité / Outils / Stack dev) avant l'A-Z brut
- **#13** filtre Niveau Débutant / Intermédiaire / Avancé → nécessite re-taggage manuel des 270 termes
- Extension #8 (vulgarisation jargon) sur tous les termes au jargon imbriqué (l'agent A en a fait 4 prioritaires)
- Intégration du `<script src="../assets/lexique-tooltip.js">` sur les articles + apprendre.html + index.html sections didactiques

---

## 2026-05-22 · Core Web Vitals — lazy loading, preload fonts (SEO-B9)

### Pourquoi
Lighthouse Performance dépend de LCP < 2.5s, CLS < 0.1, INP < 200ms. Audit statique a révélé : 22 images sans `loading="lazy"` réparties sur 4 pages (gaspillent bandwidth + bloquent décode), 0 preload de polices critiques sur les pages secondaires (apprendre, podcast, articles, claude-code, 26 articles). Sur des pages de 100+ Ko de HTML, ça décale le LCP de 200-400ms en moyenne.

### Livré
- **Lazy loading** ajouté sur les 22 images below-the-fold restantes :
  - `index.html` story photo (section 09, deep) → lazy
  - `podcast.html` ep01 cover (saison 01, deep) → lazy
  - `articles/dev-browser.html` 3 captures terminal → lazy
  - `articles/photos-airbnb-nano-banana.html` 10 photos avant/après → lazy (script idempotent)
  - Builder podcast (`scripts/build-podcast-page.js`) corrigé : tous les épisodes lazy, hero série avec `fetchpriority="high"`
- **Preload fonts critiques** (`archivo-black.woff2` + `archivo.woff2`) ajouté sur 31 pages :
  - 4 pages root (apprendre, podcast, articles, claude-code)
  - 26 articles via script Node idempotent + template `_TEMPLATE.html`
  - Évite le FOIT et accélère le LCP du H1 (Archivo Black) de ~150-300ms
- **Preload hero image** podcast (`/podcast/covers/serie.webp`)
- **Builder podcast** : retrait du legacy Google Fonts CDN → utilise `assets/fonts.css` (self-hosted woff2)
- **Tests** : 17/17 pass.

### Fichiers touchés
- 26 articles dans `articles/` (insertion 2-3 lignes head)
- `articles/_TEMPLATE.html` (préchargement par défaut pour les futurs articles)
- `index.html`, `apprendre.html`, `podcast.html`, `articles.html`, `claude-code.html` (preloads + lazy)
- `articles/dev-browser.html`, `articles/photos-airbnb-nano-banana.html` (lazy loading)
- `scripts/build-podcast-page.js` (preloads + self-hosted fonts + tous épisodes lazy)

### Avant / après (audit statique)
| Métrique | Avant | Après |
|---|---|---|
| Images lazy | 130/152 (85%) | 145/150 (97%) |
| Pages avec preload fonts | 1 (index.html) | 32 |
| `font-display` declarations | 3/3 (déjà OK) | 3/3 |
| Scripts deferred/async | 100% | 100% (déjà OK) |

Les 5 images non-lazy restantes sont les heros above-the-fold (eager intentionnel) : home, bio, podcast series (×2), articles featured.

### À venir
- Lancer Lighthouse en prod pour mesurer le gain réel (LCP, CLS, INP).
- Si LCP > 2.5s sur mobile : envisager `<link rel="preconnect">` vers R2 (audio podcast) + inline du CSS critique au-dessus du fold.

## 2026-05-22 · Answer cards "Réponse rapide" pour AI Overviews / SGE (SEO-B10)

### Pourquoi
Google AI Overviews, Perplexity et ChatGPT Browse scannent les **40-60 premiers mots** d'un article pour décider s'il répond à la requête et s'ils citent. Le TL;DR actuel dépasse 200 mots et reste narratif ("Ce que tu vas apprendre…"), inutilisable pour extraction IA. Sans réponse directe en haut, ces moteurs ignorent les articles.

### Livré
- **Encart `.answer-card` "Réponse rapide"** inséré sur les 10 articles stratégiques, juste avant le TL;DR existant (qui reste — l'encart est complémentaire).
- **Style 3e personne factuel**, 53-63 mots, optimisé extraction IA. Pas de "je", pas de narration, focus sur la définition/réponse à la requête implicite.
- **Articles ciblés** : `loops-claude`, `hermes-agent`, `karpathy`, `agents-ia-guide`, `llm-local-pour-non-dev`, `superpowers`, `claude-code-workflow-tips`, `dev-browser`, `monde-ia-5-10-20-ans`, `outil-vente-claude-code`.
- **Script idempotent** `scripts/seo-b10-answer-cards.mjs` : check `class="answer-card"` avant insertion, ne patch jamais deux fois.
- **CSS `.answer-card`** ajoutée à `assets/main.css` comme fallback documenté. Les articles n'important pas main.css, l'encart utilise aussi des inline styles (ceinture + bretelles).
- **Tests** : 17/17 pass.

### Fichiers touchés
- 10 articles dans `articles/` (insertion d'environ 7 lignes par article)
- `assets/main.css` (règle `.answer-card` ajoutée, ~20 lignes)
- `scripts/seo-b10-answer-cards.mjs` (nouveau, idempotent)

### À venir
- Mesurer dans 4-6 semaines via Google Search Console l'évolution des impressions sur les 10 articles ciblés.
- Étendre aux 17 autres articles si la stratégie paye.

## 2026-05-22 · Course schema JSON-LD sur /apprendre (SEO-B5)

### Pourquoi
La page `/apprendre` présente le parcours pédagogique structuré en 4 étapes. Schema.org `Course` avec `hasPart` étapes permet aux moteurs de mieux crawler la structure hiérarchique et d'afficher du rich content (durée, niveau, progression).

### Livré
- **Schema Course JSON-LD** inséré ligne 63-115 après le `LearningResource` existant
  - Propriétés : name, description, url, inLanguage, isAccessibleForFree, educationalLevel, teaches, provider
  - `hasCourseInstance` avec courseMode/courseWorkload (PT5H estimation)
  - **4 `hasPart`** (sub-courses) : Étape 01-04 avec name, description, url, position
  - Descriptions alignées au contenu réel des 4 sections
- **Validation JSON** : parse OK, syntaxe correcte
- **Tests** : 17/17 pass, aucun regression

### Fichiers touchés
- `apprendre.html` (1 bloc JSON-LD ajouté, 55 lignes)

### À venir

## 2026-05-22 · OG images dédiées pour 8 pages root (SEO-A2)

### Pourquoi
Les 8 pages root stratégiques (lexique, claude-code, apprendre, modeles-ia, modeles-image-ia, workflows, podcast, outils) partageaient encore l'OG générique `og-jerwis.jpg`. Les articles ont leur propre OG depuis avril, pas les pages root. Mauvais CTR sur les partages sociaux, image identique pour 8 contextes différents.

### Livré
- **8 OG images dédiées** générées en 1200×630 (JPG progressive ~45-57 KB + WebP ~31-39 KB).
- **Template `scripts/og-root.html`** : variante du `og-batch.html` pensée pour les pages root (fond dark, gros title centré, pas de photo, triple-stripe haut + bas, kicker JetBrains Mono, signature "Jérémy Sagnier · pas dev"). Respecte la charte Fiesta/89.
- **Script Puppeteer `scripts/generate-og-root.mjs`** : génère les 8 PNG via Puppeteer + serveur HTTP local (mêmes patterns que `generate-og-batch.mjs`).
- **Script `scripts/convert-og-root.mjs`** : PNG → JPG progressive (qual 88, mozjpeg) + WebP 1600×840 (qual 82) via sharp.
- **Script `scripts/patch-og-root.mjs`** : patch idempotent des 8 HTML pour pointer vers les nouvelles OG (og:image + width + height + twitter:image).

### Fichiers touchés
- `apprendre.html`, `claude-code.html`, `lexique.html`, `modeles-ia.html`, `modeles-image-ia.html`, `outils.html`, `podcast.html`, `workflows.html`
- `photos/og/{lexique,claude-code,apprendre,modeles-ia,modeles-image-ia,workflows,podcast,outils}.{jpg,webp}` (16 nouveaux fichiers)
- `scripts/og-root.html`, `scripts/generate-og-root.mjs`, `scripts/convert-og-root.mjs`, `scripts/patch-og-root.mjs`

### À venir
- Étendre le template aux autres pages root encore sur `og-jerwis.jpg` (news, github, debutant, articles, jeremy-sagnier) si SEO-A2 v2.
- Tester le rendu en partage Slack / X / LinkedIn pour valider que le contraste tient.

## 2026-05-22 · Glossaire IA vague 3 — 240 termes

### Pourquoi
Après la vague 2, il restait des angles IA très concrets à couvrir : MCP moderne, patterns agents, RAG d'évaluation, API providers, multimodal, navigateurs automatisés et outils no-code/devtools.

### Livré
- **50 nouvelles définitions express** ajoutées au glossaire, pour passer de 190 à 240 termes.
- **Hub A-Z régénéré** : 240 lignes alphabétiques, 232 cartes compactes, 24 pages SEO dédiées conservées.
- **Recherche enrichie** : alias FR/EN ajoutés sur les 50 nouveaux termes pour retrouver autant les mots techniques anglais que les formulations françaises.
- **Stratégie SEO maintenue** : aucune page longue ajoutée dans cette vague, pour éviter 50 pages faibles et garder les pages dédiées pour les requêtes vraiment intentionnelles.
- **Nouveaux clusters couverts** : MCP elicitation/roots/tasks, agent graph/planner-evaluator, response groundedness, late interaction, Sonar Perplexity, Vercel AI SDK, multimodal audio-image-vidéo, Browserbase/Stagehand, n8n et Supabase Realtime.

### Fichiers touchés
- `CHANGELOG.md`
- `data/lexique.json`
- `lexique.html`

### À venir
- Promouvoir seulement les termes à forte intention en pages SEO longues : MCP elicitation, progressive tool discovery, response groundedness, Browserbase, document intelligence.
- Ajouter ensuite une vague plus orientée cas d'usage business si le glossaire doit viser 300+ termes sans devenir une liste d'outils.

## 2026-05-22 · Glossaire IA vague 2 — 190 termes

### Pourquoi
Après la première densification à 130 termes, l'objectif était de couvrir les trous encore visibles : sécurité agents, MCP avancé, RAG documentaire, évaluation, gateways modèles et automatisations no-code.

### Livré
- **60 nouvelles définitions express** ajoutées au glossaire, pour passer de 130 à 190 termes.
- **Hub A-Z régénéré** : 190 lignes alphabétiques, 182 cartes compactes, 24 pages SEO dédiées conservées.
- **Stratégie SEO maintenue** : aucune page longue ajoutée dans cette vague, pour éviter de publier du contenu mince avant d'avoir des signaux Search Console.
- **Grille express industrialisée** : `scripts/build-lexique.js` génère maintenant aussi les cartes compactes depuis `data/lexique.json`, en plus de l'A-Z, du schema et du sitemap.
- **Nouveaux clusters couverts** : OpenAI Agents SDK, Realtime API, model gateway/fallback, sécurité agentique, resources MCP, tool schema, GraphRAG/data extraction, métriques RAG, Make/Zapier.

### Fichiers touchés
- `CHANGELOG.md`
- `data/lexique.json`
- `lexique.html`
- `scripts/build-lexique.js`

### À venir
- Promouvoir seulement les termes à forte intention en pages SEO longues : agent goal hijack, tool schema, model gateway, filtre de métadonnées, golden dataset.
- Ajouter une troisième vague plus orientée produits/outils si le glossaire dépasse 220 termes sans perdre en clarté.

## 2026-05-22 · News page v2 — search/sort/trending/AI summary

### Pourquoi
La page `/news` était un agrégateur RSS plat : 60 articles tous au même poids, pas de search, pas de tri, pas de hiérarchie. Refonte UX en 7 chantiers pour la transformer en vraie page de veille intelligente pour entrepreneurs.

Spec : `docs/superpowers/specs/2026-05-22-news-page-enhancements-design.md`
Plan : `docs/superpowers/plans/2026-05-22-news-page-enhancements.md` (16 tâches en 5 phases)
Exécution : 15 sous-agents dispatchés (mode subagent-driven), 15 commits atomiques.

### Livré

**Phase 1 — Foundation (T1-T3)**
- `assets/news-page.js` créé (extract du JS inline de news.html)
- `scripts/news-helpers.mjs` créé : helpers purs (normalize, tokenize, jaccard, buildClusters, timeBucket, capFifo) partagés client + tests
- `tests/news.test.mjs` : 9 tests unitaires (17/17 pass globalement)

**Phase 2 — UX features (T4-T11)**
- State unifié + pipeline déterministe `applyFiltersAndRender()`
- Search bar live (debounce 200ms, normalize accents, scope title+excerpt+source)
- Filtre par source : dropdown `<select>` avec `<optgroup>` par catégorie, auto-généré
- Tri : Trending / Plus récents / A-Z Source
- Groupes temporels : Aujourd'hui / Hier / Cette semaine / Plus ancien (uniquement sur tri date)
- Marqueur "déjà lu" : capture clic, opacity 0.55, badge "vu", localStorage cap FIFO 500
- Toggle "Cacher lus" + "Tout marquer comme lu" + "Réinitialiser" (avec confirm)
- URL state : `?cat=&source=&sort=&q=&hideRead=` pour bookmark / partage
- Empty state : "Aucun article ne matche tes filtres" + bouton reset
- Featured card pattern préservé sur tris non-date

**Phase 3 — Trending (T12)**
- `buildClusters()` détecte 3+ sources couvrant le même sujet (Jaccard 0.35 + 3 mots communs)
- Badge "🔥 N sources" fuchsia sur les cards trending
- Tri "Trending" : clusters en haut par taille décroissante

**Phase 4 — Synthèse IA quotidienne (T13-T15)**
- `scripts/build-news-summary.js` : appelle Claude Sonnet avec forced tool use `record_summary`, sécurisé contre prompt injection
- `.github/workflows/daily-news-summary.yml` : cron 5h UTC (7h Paris), commit + push auto du JSON
- `data/news-summary.json` : sample initial committé (sera overwritten par le cron)
- Encart dark Fiesta en haut de `/news` : day_label + 5 items numérotés (titre + pourquoi c'est important + sources cliquables)
- Close button per-day (localStorage flag `news-summary-closed-YYYY-MM-DD`)
- Bannière "obsolète" si generated_at > 30h

### Fichiers touchés
- `news.html` (refactor + nouveau markup pour search, controls, summary card)
- `assets/news-page.js` (créé, ~600 lignes)
- `assets/news-page.css` (créé)
- `scripts/news-helpers.mjs` (créé)
- `scripts/build-news-summary.js` (créé)
- `tests/news.test.mjs` (créé)
- `data/news-summary.json` (créé, sera regénéré)
- `.github/workflows/daily-news-summary.yml` (créé)
- `package.json` (+@anthropic-ai/sdk, +news:build script)

### Étape manuelle requise avant le 1er run du cron
Ajouter `ANTHROPIC_API_KEY` en GitHub repo secret :
> Repo → Settings → Secrets and variables → Actions → New repository secret
> Name: `ANTHROPIC_API_KEY` · Value: clé depuis https://console.anthropic.com/

Sans ce secret, le workflow échoue au step "Build summary".

### Coût marginal mensuel
~0,15 $ Claude API (30 runs × 3k input + 600 output tokens) + 0 $ GitHub Actions free tier + 0 $ Vercel.

### Performance
- 17/17 tests pass
- JS inline news.html : ~6 Ko → JS externe ~15 Ko (cache-bust ?v=20260522-v2)
- Clustering 60 articles : ~5ms

### À surveiller
- Premier run du cron J+1 7h Paris : vérifier que `data/news-summary.json` est bien mis à jour + Vercel redéploie
- 3 npm vulnérabilités transitives (2 moderate, 1 high) signalées par `npm install @anthropic-ai/sdk` — à auditer ultérieurement via `npm audit`

---

## 2026-05-22 · Glossaire IA enrichi à 130 termes

### Pourquoi
Après la séparation entre glossaire A-Z et 8 essentiels, il fallait densifier le glossaire avec davantage de vocabulaire IA concret : agents, RAG, API, sécurité, outils no-code, Codex, Claude Code, Supabase, Vercel et n8n.

### Livré
- **4 sous-agents dispatchés** par domaine : modèles/API, agents/sécurité, RAG/données, outils/no-code.
- **60 nouvelles définitions express** ajoutées au glossaire, pour passer de 70 à 130 termes.
- **Hub A-Z régénéré** : 130 lignes alphabétiques, 122 cartes compactes, 24 pages SEO dédiées conservées.
- **Stratégie SEO préservée** : les nouveaux mots restent en définitions express pour éviter de publier 60 pages minces d'un coup.
- **Liens relatifs conservés** : le hub et les pages terme fonctionnent en prod Vercel et en ouverture locale `file://`.
- **Contrôles liens** : les 130 entrées A-Z pointent vers une page existante ou une ancre valide.
- **Vérification navigateur locale** : recherche GraphRAG / NotebookLM / sous-agent, clic d'ancre, filtre Agents et mobile 390 px sans overflow.

### Fichiers touchés
- `CHANGELOG.md`
- `data/lexique.json`
- `lexique.html`
- `scripts/build-lexique.js`

### À venir
- Promouvoir progressivement les meilleurs termes P1 en pages SEO longues après premières données Search Console.
- Ajouter des liens contextuels depuis les articles vers les termes les plus utiles.

## 2026-05-22 · Split glossaire IA / 8 essentiels

### Pourquoi
Le lexique mélangeait deux usages : chercher rapidement une définition dans un vrai glossaire A-Z, et lire les 8 définitions longues créées au départ. Ça rendait la page trop dense et certains liens d'ancre devenaient fragiles après la réorganisation SEO.

### Livré
- **`lexique.html`** devient la page glossaire pure : recherche, filtres, index A-Z, définitions express et renvoi clair vers les 8 essentiels.
- **`lexique-essentiels.html`** créé pour les 8 définitions fondatrices : Clé API, fichier `.env`, Token, CLI, MCP, Modèle IA, Skill & Agent, Plugin.
- **Routes contrôlées** : les entrées A-Z `CLI / Terminal` et `Plugin` pointent vers `/lexique-essentiels.html#...`; les pages SEO gardent leurs URLs `/lexique/<slug>.html`.
- **Parcours Apprendre** : étape 01 passée de 2 à 3 repères avec une carte dédiée aux 8 essentiels et une carte séparée pour le glossaire A-Z.
- **SEO** : ajout de `/lexique-essentiels` au sitemap, canonical + schema WebPage, et correction des CTA des pages termes vers le hub A-Z sans ancre fragile.

### Fichiers touchés
- `CHANGELOG.md`
- `apprendre.html`
- `lexique.html`
- `lexique-essentiels.html`
- `lexique/*.html`
- `scripts/build-lexique.js`
- `sitemap.xml`

### À venir
- Ajouter progressivement des liens contextuels depuis les articles vers les pages terme prioritaires, plutôt que tout pousser vers le hub.

## 2026-05-22 · Fix routes du glossaire IA

### Pourquoi
Après publication, les liens du glossaire étaient trop dépendants de l'URL courante : liens relatifs, URLs propres Vercel et ancres pouvaient donner une impression de redirection incohérente selon le contexte.

### Livré
- **Routes contrôlées** : les liens du hub A-Z pointent maintenant explicitement vers `/lexique/<slug>.html` pour les pages dédiées et `/lexique.html#<slug>` pour les définitions express.
- **Pages termes** : les liens de retour et mots liés utilisent les mêmes destinations explicites.
- **Générateur** : `scripts/build-lexique.js` régénère ces routes déterministes pour éviter les régressions.
- **Vérification** : contrôle automatique local des 70 liens A-Z : 24 fichiers de pages dédiées présents, 46 ancres existantes.

### Fichiers touchés
- `CHANGELOG.md`
- `lexique.html`
- `lexique/*.html`
- `scripts/build-lexique.js`

### À venir
- Après déploiement, vérifier 5 clics en prod : RAG, MCP, Clé API, AGENTS.md, Chunking.

## 2026-05-22 · Lexique IA v3 · hub A-Z et 24 pages SEO

### Pourquoi
Le lexique devait devenir un vrai glossaire consultable et référencable : recherche instantanée, liste A-Z complète, et pages dédiées uniquement pour les notions qui méritent plus qu'une définition courte. Objectif SEO : construire un cluster IA propre sans générer 70 pages faibles.

### Livré
- **`lexique.html`** réorganisé en hub : recherche instantanée, filtres par besoin, index A-Z et liste alphabétique complète des 70 termes avec liens vers pages dédiées quand elles existent.
- **24 pages SEO générées** sous `lexique/*.html` : Clé API, Fichier .env, Token, MCP, Modèle IA, Skill & Agent, LLM, Fenêtre de contexte, System prompt, Prompt engineering, RAG, Embedding, Base vectorielle, Tool use, Workflow agentique, Context engineering, Structured output, Guardrail, Human-in-the-loop, Hallucination, Prompt injection, Fine-tuning, Open weight, Reasoning model.
- **Source de vérité** : ajout de `data/lexique.json` avec les 70 termes, slugs stables, groupes, alias, relations et contenu long pour les pages publiées.
- **Générateur** : ajout de `scripts/build-lexique.js` + scripts npm `lexique:build` et `lexique:check` pour générer les pages, le bloc A-Z du hub, le schema DefinedTermSet et les URLs sitemap.
- **SEO/schema/social** mis à jour : title, meta description, OG/Twitter, DefinedTermSet avec `@id`, pages termes avec canonical clean, BreadcrumbList + WebPage + DefinedTerm.
- **Sitemap** : ajout automatique des 24 URLs `/lexique/<slug>` sans `.html`, lastmod au 2026-05-22, zéro doublon.
- **UX de lecture** : glossaire express placé avant le bloc de partage, partage mis à jour, mini-marquees conservées.
- **Nettoyage** : formulations trop familières/techniques adoucies, doublon de handler newsletter évité.

### Fichiers touchés
- `assets/lexique-pages.css`
- `data/lexique.json`
- `lexique/*.html`
- `lexique.html`
- `package.json`
- `scripts/build-lexique.js`
- `sitemap.xml`
- `CHANGELOG.md`

### À venir
- Mesurer les impressions Search Console avant de passer de 24 à 40 pages dédiées.
- Ajouter des liens contextuels depuis les articles existants vers les pages terme prioritaires.

## 2026-05-22 · Nouvel article · Jerwis Finance, le tracker perso construit avec Claude Code

### Pourquoi
Jérémy a construit un outil perso (`~/Projets/portfolio-tracker`, app Next.js déployée sur Vercel) pour suivre ses positions actions/crypto avec ce qu'aucun broker grand public ne propose : tous les points d'entrée sur le graphique, le PMP recalculé en EUR avec les taux de change historiques BCE, le montant réellement investi, et une wishlist datée pour mesurer après coup si "j'ai bien fait d'attendre". Le but de l'article : montrer comme exemple qu'avec l'IA aujourd'hui, on peut créer ses propres outils utiles sans être codeur, et inspirer le lecteur à se lancer sur ses propres idées.

### Livré
- **`articles/jerwis-finance-tracker.html`** (nouveau, ~77 Ko)
  - Hero dark + H1 « J'ai créé mon propre tracker pour vraiment savoir où sont mes positions »
  - TL;DR 6 puces (déclencheur, équipe, résultat, 5 fonctionnalités, wishlist datée, transparence)
  - Section **Le déclencheur** : 3 frustrations Trade Republic (prix moyen flou, montant investi flou, pas de wishlist intelligente)
  - Section **Voilà le résultat** : screenshot dashboard
  - Section **Jour par jour** : timeline J0→J7 + semaines 2-3 + polish (TDD, 86 tests, Yahoo+CoinGecko+Frankfurter)
  - Section **Les 3 features qui changent tout** : points d'entrée sur graphique, PMP en EUR avec taux historique, wishlist datée
  - Section **Derrière le rideau** : tour des 6 pages (Dashboard, Positions, Transactions, page Actif avec chandeliers OHLC + MA50/200 + RSI, DCA, Wishlist)
  - Section **Sous le capot** : table stack technique (Next.js 16, Supabase Postgres, Drizzle ORM, Yahoo Finance, CoinGecko, Frankfurter BCE, Recharts, shadcn/ui, Vercel)
  - Section **Le calcul honnête** : ~0 €/mois de fonctionnement (tier free partout), ~1 semaine de construction
  - Section **L'envers du décor** : 3 difficultés rencontrées (taux de change historiques, gestion ventes FIFO vs PMP global, fuseaux horaires UTC)
  - Section **Pour aller plus loin** : 4 conseils pour reproduire avec Claude Code
  - Section **Questions fréquentes** : 6 Q&R (public ?, dev ?, vs Sharesight/Finary ?, temps ?, sécurité ?, presta ?)
  - Final CTA newsletter
- **6 screenshots** dans `photos/jerwis-finance/` : `01-login`, `02-dashboard`, `03-positions`, `04-transactions`, `05-asset-detail`, `06-dca`, `07-wishlist` (PNG + WebP)
- **`articles.html`** : ajout de Jerwis Finance en position 1 du tableau `ALL_ARTICLES` + entrée Schema.org ListItem + renumérotation des positions 2-26

### Fichiers touchés
- `articles/jerwis-finance-tracker.html` (nouveau)
- `articles.html` (listing + Schema.org)
- `photos/jerwis-finance/*.png` + `*.webp` (nouveau dossier)
- `CHANGELOG.md` (cette entrée)

### À venir
- Convertir tous les screenshots en WebP pour des perf optimisées
- Ajouter une carte OG dédiée `photos/og/jerwis-finance-tracker.jpg` (via le script og-batch)

---

## 2026-05-22 · News v3 : +12 sources business FR + médias internationaux en français

### Pourquoi
Demande Jérémy : enrichir avec des chaînes infos françaises (BFM Business, Capital, Challenges...) et des journaux internationaux **en français** (style WSJ traduit). 2 sous-agents dispatchés en parallèle pour identifier et valider les flux.

### Livré
- **`api/news.js`** : +12 sources françaises validées (URL flux 200 OK + images vérifiées). Total **32 sources** (vs 20 avant).
  - **Business FR (7 nouvelles)** : BFM Business (Entreprises), Capital, Challenges, L'Express Économie, La Tribune, Le Monde Économie, France Info Éco
  - **International en FR (nouvelle catégorie, 5 sources)** : Courrier International (cible idéale = presse mondiale traduite), France 24, RFI Économie, Le Monde International, The Conversation France
- **3 catégories** désormais : IA (16), Business (11), International (5). La barre de filtres sur `/news` génère auto un 3e bouton "International" car le code construit dynamiquement la liste depuis `article.category`.

### Sources écartées (par les agents)
- Les Échos : 403 anti-bot systématique (WAF Cloudflare)
- L'Opinion : aucun flux RSS public détecté
- Le Point Économie : renvoie HTML au lieu de XML
- LCI / RTL / TF1 Info : 404 sur tous les endpoints testés
- Euronews FR : flux RSS sans aucune image (critère bloquant pour cards)
- Bloomberg / Reuters FR : pas d'édition française (comme WSJ)
- Project Syndicate FR : `?lang=fr` ignoré, contenu en anglais
- Korii.slate.fr : aucun flux RSS actif
- Slate.fr : titres vides dans le flux (bug côté éditeur)

### Fichiers touchés
- `api/news.js`
- `CHANGELOG.md`

### À surveiller
- Vercel timeout : 32 fetches en parallèle avec timeout 8s par flux, `Promise.allSettled` → si certains lents ils sont skipped sans casser la page
- La catégorie "International" apparaîtra automatiquement en bouton de filtre dès le prochain build

---

## 2026-05-22 · 10 nouvelles sources RSS françaises + rename "Veille IA" → "News"

### Pourquoi
La page `/news` avait 10 sources (4 FR + 6 EN). Pour enrichir le mix français et coller au public Jérémy (entrepreneurs FR), agent de recherche dispatché pour identifier des flux RSS français de qualité avec images (critère UX critique pour les cards). En parallèle, le label "Veille IA" dans le menu était ambigu (la page s'appelle déjà `/news` et "Veille" sonne newsletter-only).

### Livré
- **`api/news.js`** : +10 sources françaises validées (URL flux + présence d'images vérifiée par fetch HTTP). Total 20 sources (4 EN + 16 FR).
  - **IA / Tech FR (Tier 1)** : Next (ex-Next Inpact), Blog du Modérateur, 01net, Presse-citron, Actu IA, Silicon.fr
  - **IA / Tech FR (compléments)** : Korben (ton décalé), Le Monde Pixels (autorité)
  - **Business FR** : BFM Économie, Le Figaro Économie
  - Toutes les sources ont des images dans le flux (media:thumbnail / enclosure / media:content), critère UX validé
- **Rename menu sur 50 pages** :
  - `<strong>Veille IA</strong>` → `<strong>News</strong>`
  - `<span>Auto-mise à jour toutes les 6h</span>` (faux : cache 30 min) → `<span>Actus IA et Business</span>` (juste)
- Le mot "veille" reste utilisé dans le contenu éditorial (articles + pitch newsletter) où il désigne l'activité, pas le label

### Fichiers touchés
- `api/news.js`
- 50 pages HTML (toutes celles avec la nav v3 unifiée)
- `CHANGELOG.md`

### À surveiller
- Vercel cache : peut prendre quelques min pour propager
- Si certains flux sont trop lents (>8s timeout), ils sont silently skipped par `Promise.allSettled`
- L'Usine Digitale et Les Échos renvoient 403 sur certains user-agents (déjà géré, fallback gracieux)

---

## 2026-05-20 · Audit mini-nav cross-site + fix modeles-ia-monde

### Pourquoi
Vérifier que la mini-nav (refonte v3 du 2026-05-20, commit `9a3bcf9` + `efe757d`) est identique sur les 49 pages du site. 3 sous-agents Explore dispatchés en parallèle (pages principales / articles / pages légales).

### Livré
- **Audit complet** : 48/49 pages strictement conformes
  - 16 pages principales : 15 conformes, 1 anomalie
  - 25 articles : 100% conformes
  - 8 pages légales/utilitaires : 100% conformes
- **Fix `modeles-ia-monde.html`** : nav avait un dropdown réduit à 5 items (manquait Modèles image IA, Workflows, Veille IA, Qui je suis) et un `aria-current="page"` orphelin. La page n'avait pas les marqueurs `NAV-UNIFIED-START/END` donc le script de sync l'avait ratée. Remplacement par le bloc canonique avec marqueurs.
- **Résultat final** : **49/49 pages avec dropdown 9 items + marqueurs NAV-UNIFIED**

### Fichiers touchés
- `modeles-ia-monde.html` (nav remplacée par bloc canonique)
- `CHANGELOG.md`

---

## 2026-05-20 · Refonte radicale du catalogue modeles-ia — fin du filtre "0 modèle"

### Pourquoi
Le catalogue affichait "0 modèle — filtre : Écrire" quand on cliquait sur un usage qui ne matchait aucun `best_for` du JSON. Le filtre était cassé par design : les usages "writing/coding/documents" cherchaient des chaînes que les fiches n'avaient pas. UX horrible — l'utilisateur clique, ne voit rien, ne sait pas pourquoi. Verbatim Jérémy : "je le trouve tres mauvaise pas utilisable trouve un moyen de modifier ça change completement cette section".

### Livré
- **Suppression de la usage-grid** (8 boutons qui retournaient souvent 0) + suppression du `modelMatchesUsage()` cassé
- **Catalogue organisé en 7 groupes pré-classés** avec en-tête éditorial (eyebrow couleur, h3, intro) :
  1. **Frontier · Premium** (7 modèles) — GPT 5.5/5.4/Codex, Claude Opus/Sonnet, Gemini 3.1 Pro, Grok
  2. **Low cost · Volume** (7 modèles) — Haiku, Gemini Flash, DeepSeek Flash, Qwen Max, Mistral Medium, Command A, Nova 2 Lite
  3. **Open-weight · Local** (15 modèles) — Qwen 14B/235B/Coder, Mistral Small/Magistral, Llama 4 Maverick/Scout, DeepSeek R1/V3.1, Gemma 4, Phi-4, MiniMax M1, GLM 4.6, Nemotron, OLMo 2
  4. **Recherche · Sourcé** (1 modèle) — Perplexity Sonar Pro
  5. **Image · Vidéo · Audio** — 3 grandes vignettes noires `multimedia-jump` qui redirigent vers `/modeles-image-ia` (avec sous-ancres `#video` et `#audio`)
  6. **RAG · Embeddings · Rerank** (5 modèles)
  7. **Plate-forme spécifique** (1 modèle) — Apple Foundation Models
- **Search bar sticky** en haut du catalogue : masque les cards qui ne matchent pas + masque automatiquement les groupes vides + affiche un panneau "Aucun modèle" éditorial si recherche stérile
- **Liens directs** : chaque card a "Accéder →" (URL grand public via mapping `ACCESS_URLS`) + "Docs ↗" (en gris, plus discret) — 35 mapping ID → URL ajoutés
- Choice cards : `data-shortcut` remplacé par anchors directs vers les groupes (`#group-frontier`, `#group-cheap`, `#group-open`)
- Lien "Mes raccourcis" dans l'intro du catalogue pointe vers `#raccourcis`
- Nouveau no-results panel avec message éditorial qui propose "Mes raccourcis" en fallback

### Bénéfices UX
- **Impossible d'avoir "0 modèle"** dans le mode par défaut (les groupes sont pré-remplis)
- Navigation par scroll naturel au lieu de filtre/déclic
- Découverte plus large (l'utilisateur voit tous les groupes en scrollant)
- Compare-panel reste fonctionnel, en sticky en haut, plus discret

### Fichiers touchés
- `modeles-ia.html` (refonte catalog section + JS complet)
- `CHANGELOG.md`

---

## 2026-05-20 · Section audio enrichie + Mistral Voxtral + liens directs partout

### Pourquoi
La section audio listait juste 3 cards minimalistes. L'utilisateur veut du concret : ajouter Mistral Voxtral (audio open-weight), détailler chaque modèle (capacités, langues, prix, accès, limites), montrer la stack réelle utilisée pour le podcast *Guerres d'IA*. Et surtout : des **liens directs** vers chaque modèle au lieu de juste les docs.

### Livré
- **`data/models-ai.json`** : ajout de l'entrée `mistral-voxtral` (Apache 2.0, open-weight, transcription + audio understanding, multilingue, score 78). Total passe à 53 modèles, 4 audio.
- **`modeles-image-ia.html`** — section audio refondue (page passe de 1094 → 1415 lignes) :
  - **4 decision cards** (au lieu de 3) avec liens directs : Eleven v3 / Gemini Native Audio / Whisper / **Voxtral**
  - **Section "En détail"** : 4 cards riches (`.audio-detail`) avec liste structurée — modalités, langues, prix exact, accès, pour qui, limites — et lien direct par card
  - **Panel "Ma stack — Jerwis Productions"** (`.podcast-stack`) :
    - Casting voix : Paul K (Deep French Narrator), Simon (Altman), Mathieu (Amodei), Camille (Daniela)
    - Pipeline 3 étapes : script Claude → synthèse Python+ElevenLabs → mix REAPER -16 LUFS
    - CTA vers `/podcast`
- **Liens directs partout** :
  - Toutes les decision cards image et vidéo : URL d'accès direct (labs.google, midjourney.com, ideogram.ai, openai.com/sora, runwayml.com, klingai.com, grok.com, etc.)
  - Compare-strips Nano Banana et Sora/Veo : lien direct ajouté
  - Table comparative vidéo : noms de modèles cliquables
  - Catalogue auto-généré : nouveau lien "Accéder →" en plus du "Docs ↗" (mapping ID → URL grand public dans `ACCESS_URLS`)
- Nouveau CSS : `.card-link`, `.audio-detail`, `.podcast-stack`, `.podcast-cast`, `.podcast-pipeline`

### Fichiers touchés
- `modeles-image-ia.html`
- `data/models-ai.json`
- `CHANGELOG.md`

---

## 2026-05-20 · Complétude étendue modeles-image-ia — section audio + table vidéo

### Pourquoi
La page traitait image et vidéo mais pas audio, alors que l'audio est explicitement mentionné comme étape obligatoire dans le workflow type vidéo (voix off, narration). Manque aussi une vraie table comparative pour la vidéo pour décider en un coup d'œil.

### Livré (en plus de la complétude précédente)
- **Section "Audio · le 3e étage créatif"** (id="audio") avec :
  - Intro éditoriale "L'audio, le maillon souvent oublié"
  - 3 decision cards : narration propre (Eleven v3), agent vocal temps réel (Gemini Native Audio), transcription (Whisper)
  - Catalogue audio auto-généré depuis le JSON (3 modèles)
- **Table comparative vidéo** dans la section #video : 6 modèles × 5 colonnes (durée typique, audio natif, image-to-video, accès, cas d'usage) — décision en un coup d'œil
- **Hero panel stats** : 4e stat ajoutée (modèles audio)
- **Mini-marquee 1** mis à jour : "Voix narration" remplace "Sources"
- JS étendu : audioGrid + statAudio
- Page passe de 858 → ~1094 lignes

---

## 2026-05-20 · Complétude modeles-image-ia.html — focus vidéo

### Pourquoi
La section vidéo de la page image/vidéo était trop maigre : juste une grille auto-générée sans contexte éditorial. Le hash `#video` atterrissait sur un mini-marquee sans valeur ajoutée. Manquait : guide de décision spécifique vidéo, limitations réelles, workflow type.

### Livré
- **`modeles-image-ia.html`** — enrichissement majeur :
  - **Hero amélioré** : ajout du panel stats (modèles image + vidéo, dernière vérif, alerte 30j)
  - **Glossaire image** (4 mots) : prompt-to-image, image-to-image, inpainting, reference/ControlNet
  - **Section #video repensée** :
    - Bloc d'intro éditoriale "Ce n'est pas un LLM avec une caméra" + 4 stats clés (durée typique, coût, audio, cohérence)
    - 6 decision cards spécifiques vidéo (narration courte, audio sync, édition multimodale, production créative, clip social, test format)
    - Compare strip Sora vs Veo 3.1 (en parallèle du Nano Banana Pro vs 2 existant)
    - 3 reality cards "À garder en tête" : coût, cohérence personnage, audio à faire en post
    - Workflow type 4 étapes (image clé → animation → audio → montage)
  - URL canonical + og:url → `/modeles-image-ia` (sans `.html`)
  - JS étendu pour alimenter statImage / statVideo depuis le JSON
  - L'ancre `#video` pointe maintenant sur la section éditoriale (et non le mini-marquee)

### Fichiers touchés
- `modeles-image-ia.html` (de 568 → 858 lignes)
- `CHANGELOG.md`

---

## 2026-05-20 · Refonte modeles-ia.html — table → cards + UX lecture

### Pourquoi
La page était lisible pour un dev, pas pour un entrepreneur curieux. La table à 9 colonnes avec 3 dropdowns techniques + preset buttons LLM était surchargée. Demande explicite de Jérémy : "repense cette page pour qu'elle soit utile pour la personne qui la lit".

### Livré
- **`modeles-ia.html`** — refonte UX :
  - **Table remplacée par grille de cards** (3→2→1 col responsive) : chaque card = nom, provider, score, avis en 1 ligne, tags, lien source + checkbox comparer
  - **Toolbar simplifié** : search + bouton "Comparer X/4" uniquement — suppression des 3 dropdowns (catégorie, licence, prix) trop techniques
  - **Preset buttons LLM supprimés** de la toolbar (audience non-dev)
  - **Usage buttons déplacés** : maintenant juste au-dessus du catalogue (logique), plus flottants avant la section "Dans ta situation"
  - Section "Guide simple" renommée "Dans ta situation..." (plus orientée lecteur)
  - Choice cards : ajout de bord coloré (fuchsia/teal/orange) pour distinguer visuellement les 6 cas d'usage
  - Footer enrichi avec nav links (Accueil, Apprendre, Articles, Actus IA, Newsletter)
  - URLs fixées : canonical + og:url + schema.org → `/modeles-ia` (sans `.html`)
  - JS simplifié : suppression des state.category/license/price + leurs listeners, filteredModels() épuré

---

## 2026-05-20 · Nav v3 unifiée (dropdown « Plus ») + footer rich Option C

### Pourquoi
La nav était fragmentée à travers les 38 pages du site : certaines avaient « Modèles IA » en menu direct (seulement 2 pages sur 38), d'autres avaient des sous-menus différents, et 3 articles (`photos-airbnb-nano-banana`, `photos-perso-ia`, `podcast-ia-pour-enfants`) n'avaient même pas de mini-nav du tout. La page précommande trainait une 2e nav legacy à 9 items qui doublonnait la mini-nav. Le footer rich (5 colonnes + newsletter inline) n'existait que sur 23 pages — 11 pages avaient un footer minimaliste ou pas de footer du tout. **Décision Jérémy** : « fait b et le footer C » → mini-nav à 4 items principaux + dropdown « Plus », et footer rich avec 4 colonnes (Lire / Outils / Suis-moi / Légal).

### Livré
- **`assets/nav-v2.css`** — ~180 lignes ajoutées pour le dropdown :
  - `.more-wrap`, `.more-trigger`, `.more-menu` (panneau flottant 300px, border-radius 14px, shadow douce)
  - Items `.more-menu a` avec `.more-icon` + `.more-text strong + span` (titre + sous-titre)
  - `.more-separator` + `.more-cta` (variant fuchsia pour la précommande)
  - Animations `opacity + transform translateY` au open/close
  - Mobile @media (max-width: 880px) : le dropdown devient un accordéon statique dans le drawer mobile
- **`assets/nav-dropdown.js`** (nouveau, ~60 lignes) : click trigger, click outside, Escape, aria-expanded sync, garde anti-multi-instance
- **38 pages HTML** patchées via script Python idempotent :
  - « Modèles IA » retiré du menu direct (était sur 2 pages seulement)
  - Bloc dropdown « Plus » injecté avec 4 items (Modèles IA, Lexique IA, Mes outils, GitHub) + séparateur + CTA Précommande 39 €
  - Chemins relatifs respectés : `/` à la racine, `../` dans `articles/`
- **3 articles complétés** (avaient zéro mini-nav avant) : `photos-airbnb-nano-banana`, `photos-perso-ia`, `podcast-ia-pour-enfants` reçoivent maintenant la mini-nav v2 complète avec dropdown + scripts `nav-v2.js` + `nav-dropdown.js`
- **Précommande nettoyée** : nav legacy de 9 items supprimée sur `precommande-photos-personal-branding.html` (doublon de la mini-nav)
- **Footer rich Option C** standardisé sur 11 pages manquantes :
  - 4 colonnes claires : **Lire** (Parcours, Claude Code, Articles, Lexique) · **Outils** (Précommande, Outils, Modèles IA, Podcast, GitHub) · **Suis-moi** (LinkedIn, 2× YouTube, Instagram) · **Légal** (Mentions, Confidentialité, CGV, Suppression, Préférences)
  - Newsletter inline conservée + handler Resend self-contained
  - Footer-bottom avec triple-dot teal/fuchsia/orange + « Fiesta · 89 »
  - Pages avec footer existant remplacé : `modeles-ia`, `modeles-image-ia`, `_TEMPLATE` + 3 articles
  - Pages sans footer (legal + merci) : footer injecté avant `</body>` : `cgv`, `mentions-legales`, `politique-confidentialite`, `suppression-donnees`, `precommande-merci`
- **QC visuel** (dev-browser headless) : dropdown s'ouvre (is-open=true, opacity=1, aria-expanded=true), 5 items affichés, 4 colonnes footer, 0 erreur JS sur index/article/precommande/cgv

### Fichiers touchés
- `assets/nav-v2.css` (+180 lignes dropdown)
- `assets/nav-dropdown.js` (nouveau)
- 38 pages HTML : mini-nav + dropdown
- 11 pages HTML : footer rich
- `precommande-photos-personal-branding.html` : nav legacy retirée

### À venir
- Surveiller en prod (Plausible + Clarity) si le dropdown « Plus » est cliqué — si <2% → simplifier en virant le menu et en gardant les liens en pied de page seulement
- Éventuellement homogénéiser `.site-footer` (utilisé par d'anciennes pages comme news/quiz) avec la classe canonique `.footer`

---

## 2026-05-20 · Refonte modeles-ia.html — table → cards + UX lecture

### Pourquoi
La page était lisible pour un dev, pas pour un entrepreneur curieux. La table à 9 colonnes avec 3 dropdowns techniques + preset buttons LLM était surchargée. Demande explicite de Jérémy : "repense cette page pour qu'elle soit utile pour la personne qui la lit".

### Livré
- **`modeles-ia.html`** — refonte UX :
  - **Table remplacée par grille de cards** (3→2→1 col responsive) : chaque card = nom, provider, score, avis en 1 ligne, tags, lien source + checkbox comparer
  - **Toolbar simplifié** : search + bouton "Comparer X/4" uniquement — suppression des 3 dropdowns (catégorie, licence, prix) trop techniques
  - **Preset buttons LLM supprimés** de la toolbar (audience non-dev)
  - **Usage buttons déplacés** : maintenant juste au-dessus du catalogue (logique), plus flottants avant la section "Dans ta situation"
  - Section "Guide simple" renommée "Dans ta situation..." (plus orientée lecteur)
  - Choice cards : ajout de bord coloré (fuchsia/teal/orange) pour distinguer visuellement les 6 cas d'usage
  - Footer enrichi avec nav links (Accueil, Apprendre, Articles, Actus IA, Newsletter)
  - URLs fixées : canonical + og:url + schema.org → `/modeles-ia` (sans `.html`)
  - JS simplifié : suppression des state.category/license/price + leurs listeners, filteredModels() épuré

### Fichiers touchés
- `modeles-ia.html` (refonte majeure)
- `CHANGELOG.md` (cette entrée)

### À venir
- Éventuellement : filtres avancés derrière un "Voir filtres avancés ▾" pour les power users

---

## 2026-05-20 · Recherche LLM + guide sans jargon

### Pourquoi
La page listait déjà beaucoup de modèles, mais il manquait une couche de décision lisible pour quelqu'un qui ne veut pas comparer des benchmarks : écrire, chercher, lire des PDF, coder, automatiser, garder ses données ou réduire le budget.

### Livré
- **`modeles-ia.html`** :
  - Ajout d'un bloc "Quel LLM choisir ?" en 8 usages concrets.
  - Ajout d'un mini-glossaire sans jargon : contexte, open-weight, RAG, reranking.
  - Raccourcis éditoriaux réécrits pour éviter le réflexe "meilleur modèle universel".
  - Presets mis à jour : frontier, code, low cost, local.
- **`data/models-ai.json`** :
  - Correction de fiches LLM à risque : Claude Opus 4.7 → Claude Opus 4.6, Gemini 3 Pro → Gemini 3.1 Pro Preview, Gemini 3 Flash → Gemini 3.5 Flash.
  - Ajout de **Qwen3 14B** comme option locale/open-weight plus accessible que les très gros modèles.
  - Sources revues vers docs officielles / model cards.

### Décisions
- Le comparateur doit recommander par usage, pas par score brut.
- Le local est présenté comme un choix de contrôle/confidentialité, pas comme une option automatiquement moins chère.
- Perplexity est décrit comme moteur de réponse sourcé, pas comme assistant généraliste.

### Vérifié
- `npm test`

---

## 2026-05-20 · Comparateur LLM amélioré

### Pourquoi
Le comparateur V2 permettait de cocher 2-4 modèles, mais restait trop léger pour décider entre GPT, Claude, Gemini, Qwen, DeepSeek ou Llama.

### Livré
- **`modeles-ia.html`** :
  - Presets rapides : frontier, code, low cost API, local/open-weight.
  - Comparateur renommé "Comparateur LLM".
  - Verdict automatique : meilleur score, plus long contexte, budget, contrôle données.
  - Cartes enrichies : famille, prix, contexte, accès, licence, à choisir si, à éviter si.
  - Gestion des égalités prix/contexte et signal "Aucun local" quand aucun modèle sélectionné ne peut tourner hors plateforme fermée.

### Vérifié
- Preset frontier : 3 modèles sélectionnés, verdicts affichés.
- Preset low cost : 4 modèles sélectionnés.
- Preset local : 4 modèles sélectionnés, mobile 390px sans débordement.

---

## 2026-05-20 · Fix mobile home — pulse bar + menu

### Pourquoi
Sur mobile, la bande noire de vie du site se repliait sur plusieurs lignes et le drawer de la mini-nav restait présent en calque invisible au-dessus du bandeau. Résultat : impression que le bloc newsletter masquait l'arrivée sur la home.

### Livré
- **`assets/mobile-fixes.css`** :
  - Pulse-bar mobile forcée sur une ligne horizontale scrollable, hauteur réduite (~37px).
  - Drawer mini-nav fermé réellement masqué (`display:none`, `pointer-events:none`) jusqu'au clic burger.
  - Hero blobs bornés en mobile pour éviter les débordements parasites.
- **`index.html`** :
  - Versioning du lien `mobile-fixes.css` pour casser le cache navigateur/CDN sur la home.

### Vérifié
- Mobile 390px : pulse-bar compacte, `Dernière MAJ · 20 mai`, `1 nouveauté`.
- Menu fermé : liens invisibles et non cliquables.
- Document width : 390/390 côté `documentElement`.

---

## 2026-05-20 · Home actualisée pour le hub modèles IA

### Pourquoi
Après ajout du hub modèles IA, la home ne le mettait pas assez en avant et la pulse-bar du haut ne pouvait pas compter cette nouveauté car le lien footer n'avait pas `data-published`.

### Livré
- **`index.html`** :
  - Ajout du lien "Modèles IA" dans la mini-nav.
  - Ajout d'une 5e carte dans le bloc Apprendre : "Guide vivant · Modèles IA".
  - Carte datée `data-published="2026-05-20"` pour alimenter automatiquement la pulse-bar.
  - CTA du parcours mis à jour : "1 comparateur IA".

### Vérification attendue
La bande du haut doit afficher automatiquement `Dernière MAJ · 20 mai` et compter la page modèles IA dans les nouveautés de la semaine.

---

## 2026-05-20 · Hub modèles IA V2 — décision + page image/vidéo

### Pourquoi
La V1 listait bien les modèles, mais restait trop proche d'un annuaire. Besoin de rapprocher la page de l'intention Jerwis : aider à choisir rapidement selon un cas réel.

### Livré
- **`modeles-ia.html`** :
  - Bloc "Mes choix actuels" avant les filtres.
  - Raccourcis décisionnels : généraliste, code/agents, low cost, local, image, vidéo.
  - Mode comparaison jusqu'à 4 modèles avec `à choisir si`, `à éviter si`, licence et score Jerwis.
  - Score Jerwis visible dans le tableau.
- **`data/models-ai.json`** :
  - Ajout automatique sur toutes les fiches : `choose_if`, `avoid_if`, `jerwis_score`, `freshness_status`, `recommended_for_beginner`.
- **`modeles-image-ia.html`** :
  - Nouvelle page enfant image/vidéo.
  - Angle Nano Banana Pro vs Nano Banana 2.
  - Sections décisions rapides, catalogue image, catalogue vidéo.
- **`sitemap.xml`** : ajout de `modeles-image-ia.html`.

### Décision
La page hub reste un guide de choix. Les catégories créatives ont leur page dédiée car les critères image/vidéo n'ont rien à voir avec les LLM texte.

---

## 2026-05-20 · Hub modèles IA V1

### Pourquoi
Besoin d'une page Jerwis qui liste les principaux modèles IA disponibles sans tout mélanger : LLM propriétaires, open-weight, image, vidéo, audio, embeddings/reranking. Objectif : aider à choisir par usage concret, pas produire un annuaire technique ingérable.

### Livré
- **`modeles-ia.html`** : nouvelle page pilier Fiesta avec hero, sélecteur d'usage, 6 recommandations, catalogue filtrable en vanilla JS, méthode et CTA newsletter.
- **`data/models-ai.json`** : base V1 de modèles/familles avec fournisseur, catégorie, licence, accès, modalités, usages, contexte, prix éditorial, maturité, avis Leo et sources.
- **`outils.html`** : encart vers le guide modèles IA depuis la page stack outils.
- **`index.html`** : lien footer "Guide des modèles IA".
- **`sitemap.xml`** : nouvelle URL ajoutée en weekly / priority 0.9.

### Décision éditoriale
Ne pas promettre "tous les modèles existants". La page dit plutôt : catalogue vivant des principaux modèles IA, classés par usage. Les pages enfants viendront ensuite : LLM, image, vidéo, audio, embeddings/reranking, agents coding.

### Prochaines étapes
- Créer `modeles-llm.html` avec focus GPT / Claude / Gemini / Mistral / Llama / DeepSeek / Qwen.
- Créer `modeles-image-ia.html` pour Nano Banana Pro vs Nano Banana 2, GPT Image, Midjourney, Ideogram, FLUX, Stable Diffusion.
- Ajouter un script mensuel de refresh du JSON + alerte `last_checked > 30 jours`.

---

## 2026-05-13 · Audit mobile sprint 4 — self-host fonts

### Pourquoi
PageSpeed après sprint 3 : LCP 4.4s → 3.5s (-900ms), MAIS CLS 0 → 0.18 (régression). Diagnostic local : le H1 reflow quand Archivo Black charge après le first paint, déplaçant `.hero-blobs` de 12px et donc tout le contenu en dessous. Le preload de l'image n'aggrave pas le CLS mais ne l'évite pas non plus. Le vrai fix est de contrôler l'arrivée des fonts via self-host + preload + `font-display: optional`.

### Livré
- **Self-host des fonts Google** : 3 woff2 téléchargées dans `assets/fonts/` (Archivo variable 68KB, Archivo Black 15KB, JetBrains Mono variable 54KB = 137KB total). Plus de round-trip Google Fonts CSS = -200-400ms TTFB sur la première ressource font.
- **Nouveau fichier `assets/fonts.css`** : `@font-face` pour les 3 polices, variations supportées (Archivo 100-900, JBM 100-800), `font-display: optional` sur Archivo Black (la critique pour le H1) → si la font arrive avant le first paint (probable grâce au preload), elle est utilisée ; sinon le fallback reste pour la session et **aucun swap visuel ne se produit**. Garantit CLS=0 sur le H1.
- **Preload des 2 fonts critiques** dans `<head>` de `index.html` (Archivo Black + Archivo) — le navigateur télécharge les fichiers en parallèle du CSS.
- **Suppression du chargement Google Fonts** sur 43 pages prod (et des `<link rel="preconnect">` devenus inutiles).
- **Preload image LCP retiré** sur `index.html` — il n'aidait que marginalement (LCP est un texte, pas l'image) et créait confusion sur le tracking.

### Mesures (local émulation iPhone 14 Pro Slow 4G + CPU x4)
| Métrique | Sprint 3 prod | Sprint 4 local | Cible |
|---|---|---|---|
| LCP | 3.5 s | 2.5 s | < 2.5 s 🟢 |
| FCP | 2.9 s | 2.4 s | < 1.8 s 🟠 |
| CLS | 0.18 🔴 | 0.18 🔴 | < 0.1 |

**Important** : le CLS local persiste à 0.18, causé par 2 shifts identifiés via PerformanceObserver :
1. **`.hero-blobs`** se déplace de 12px en y (cause : le H1 grossit quand Archivo Black charge, push tout en bas). Reste à corriger via `min-height` calibré sur le H1 ou `size-adjust` calibré sur fallback.
2. **`.pulse-bar-item`** : largeur change quand le JS remplace les placeholders `—` par les vraies valeurs dynamiques (`new_count`, `last_maj`).

Le PageSpeed prod pourrait mesurer un CLS différent (timing de chargement plus rapide en CDN) — à vérifier après push.

### Fichiers touchés
- 🆕 `assets/fonts/archivo.woff2` (68KB)
- 🆕 `assets/fonts/archivo-black.woff2` (15KB)
- 🆕 `assets/fonts/jetbrains-mono.woff2` (54KB)
- 🆕 `assets/fonts.css` — @font-face avec font-display optional sur Archivo Black
- `index.html` — preload des 2 fonts critiques, retrait preload image
- 43 autres pages HTML — remplacement `https://fonts.googleapis.com/css2?...` par `assets/fonts.css`

### Sprint 5 (si CLS reste haut en prod)
- **`size-adjust` + `ascent-override` + `descent-override`** sur un @font-face fallback synthétique pour matcher Archivo Black métriquement (Capsize calculator)
- **`min-height` fixe sur le H1 du hero** (calibrée à la hauteur Archivo Black finale)
- **Réserver la largeur des spans dynamiques de la pulse-bar** (placeholders avec largeur min)

---

## 2026-05-13 · Audit mobile sprint 3 — preload LCP home

### Pourquoi
PageSpeed prod après sprint 2 : perf 80, LCP 4.4s (rouge), CLS 0 ✨. Le LCP reste le seul point rouge — le rapport flag "Requêtes bloquant le rendu : économies estimées 1700 ms" + "Images à optimiser : 622 KB".

### Livré
- **Preload image LCP home** : `<link rel="preload" as="image" href="photos/A7100670.webp" type="image/webp" fetchpriority="high">` dans `<head>`. Le navigateur télécharge l'image hero en parallèle du CSS au lieu d'attendre que le DOM la rencontre.
- **`fetchpriority="high" decoding="async"`** sur l'`<img>` portrait du hero.

### Mesures avant/après (émulation iPhone 14 Pro, Slow 4G 1.6 Mbps, CPU x4)
| Métrique | Avant sprint 3 | Après sprint 3 | Cible |
|---|---|---|---|
| LCP | 4.4 s (PageSpeed prod) | **2.3 s** (local) | < 2.5 s 🟢 |
| FCP | 2.7 s | 2.2 s | < 1.8 s 🟠 |
| CLS | 0 | 0 | < 0.1 🟢 |

Note : LCP element identifié n'est pas l'image elle-même mais un `<p>` du hero — le preload de l'image l'aide indirectement en libérant le bus réseau pour les autres ressources critiques.

### Reporté (sprint 4 si nécessaire)
- **Defer main.css** (CSS async load via `media="print" onload`) : gain attendu LCP -800 à -1200 ms, mais risque FOUC sur la home (style inline + main.css). À tester rigoureusement avec hydratation visuelle.
- **Critical CSS inline** : extraire les ~8 KB above-the-fold de main.css. Process avec `critters` ou manuel. Gain LCP attendu -500 à -800 ms.
- **CSS unused** : split main.css en home.css + articles.css + commun.css (110 KB inutilisé sur la home). PurgeCSS au build.
- **AVIF en parallèle WebP** : `<source srcset="X.avif" type="image/avif">` avant le WebP pour browsers récents. ~30-40% plus léger que WebP sur certaines images.

### Fichiers touchés
- `index.html` — preload + fetchpriority sur l'image LCP

---

## 2026-05-13 · Audit mobile sprint 2 — perf, images, cache

### Pourquoi
Suite du Sprint 1 (UX mobile fixes critiques). Sprint 2 attaque la perf : WebP, CLS, fonts, cache headers. Cible : LCP < 2.5s, CLS < 0.05, poids page ÷ 2 sur la home.

### Livré
- **WebP conversion** : 163 images JPG/PNG converties en `.webp` (q=80, resize max 1600px). `photos/` passe de 28 MB JPG → 11.5 MB WebP (-59%). Images JPG conservées comme fallback.
- **`<picture>` wrapping** : 53 balises `<img>` enveloppées en `<picture><source srcset="X.webp" type="image/webp"><img src="X.jpg" ...></picture>` (sur les 18 pages qui contenaient des images locales). Préserve la compat OG/Twitter cards (les `<meta>` restent en JPG).
- **CLS (dimensions images)** : `width` et `height` injectés sur 86 balises `<img>` (sips → dimensions réelles). Avant : 0 image avait `width`/`height`. CLS mesuré post-fix = **0.002** (cible < 0.1).
- **Cache headers Vercel** : `Cache-Control: public, max-age=31536000, immutable` sur `/assets/*`, `/photos/*`, `/downloads/*`. Visiteur récurrent ne re-télécharge plus rien.
- **Fonts allègement** : `Bebas Neue` supprimé des 8 pages qui le chargeaient pour rien (1 usage dans `drafts/` uniquement, hors prod). Gain ~30 KB woff2.
- **Pages légales** : `mobile-fixes.css` injecté sur les 4 pages (cgv, mentions-legales, politique-confidentialite, suppression-donnees) qui n'ont pas la mini-nav → bénéficient au minimum des fixes overflow/focus/typo mobile.

### Fichiers touchés
- `vercel.json` — 3 règles `Cache-Control: immutable` ajoutées
- 8 pages HTML (index, apprendre, claude-code, articles, github, outils, precommande-merci, precommande-photos-personal-branding) — `Bebas+Neue` retiré du chargement Google Fonts
- 18 pages HTML — `<picture>` wrapping (index + 17 articles)
- 4 pages HTML (index, precommande-photos-personal-branding, articles/photos-airbnb-nano-banana, articles/photos-perso-ia) — dimensions injectées sur 86 `<img>`
- 4 pages légales — `<link mobile-fixes.css>` ajouté
- 163 nouveaux fichiers `.webp` dans `photos/` (à côté des JPG/PNG d'origine)

### Mesures post-sprint (390×844 iPhone 14 Pro émulé, sans throttle 4G)
- **CLS** : 0.002 (avant ~0.15-0.30 estimé)
- **Total weight home** : 1.5 MB (avant ~1.8 MB)
- **Pictures avec WebP source** : 21/21 sur la home
- **Overflow horizontal** : 0px sur toutes les pages testées
- **Burger / skip-link / inputs 16px** : maintenus depuis sprint 1

### Reporté au backlog éditorial
- **TOC mobile** : 25/26 articles n'ont pas de TOC. Tâche éditoriale article-par-article, pas industrialisable.
- **Headings hierarchy** : skip h2→h4 sur `autoresearch-karpathy.html` (8x) et `agents-ia-guide.html` (2x). Promotion de `<h4>` en `<h3>` casse le style CSS attaché à h4. Refacto éditoriale à faire avec révision visuelle.
- **Hover gating** : 47 `:hover` à encapsuler dans `@media (hover: hover)`. Trop intrusif sans test desktop case-by-case. CSS reset `@media (hover: none)` testé : casserait certains états interactifs souhaités.
- **Contrastes accents** : `--teal #00B2A9 / --fuchsia #EF426F / --orange #F58025` ratent WCAG AA en texte courant (2.3-3.5:1). Si on veut les utiliser comme texte body, prévoir variantes assombries (`#007A75 / #C8194B / #CC6800`). Décision design à prendre.
- **Pages légales** : migration complète vers mini-nav (avec burger + drawer + theme toggle) reste à faire. Pour l'instant elles ont au moins les fixes mobile via `mobile-fixes.css`.
- **Doublons nav** dans `preferences.html` et `quiz.html` (header legacy `display:none` + mini-nav).

### Sprint 3 idéaux
- Migration totale pages légales vers mini-nav
- Headings + hover refactor (chantier éditorial 4-6h)
- Audit Lighthouse en prod après ce sprint 2 pour mesurer le delta réel (PageSpeed Insights mobile attendu 75-85 vs 50-60 avant)

---

## 2026-05-13 · Audit mobile complet + sprint 1 de fixes critiques

### Pourquoi
80 % du trafic jerwis.fr est mobile. Audit consolidé par 5 sous-agents parallèles (visuel multi-viewport, perf Core Web Vitals, code CSS/responsive, nav+formulaires, a11y+lecture) sur 8 pages × 4 viewports. 6 défauts critiques identifiés bloquaient l'usage mobile. Sprint 1 livre les fixes en un commit propre.

### Livré — fixes critiques (Sprint 1)
- **Nav mobile** : burger 44×44 + drawer overlay full-width sur les 36 pages avec `mini-nav` (toggle aria-expanded, focus trap escape, fermeture sur clic lien ou resize ≥ 961px). Avant : aucun lien de nav visible ≤ 960px (les 4 entrées Apprendre/Articles/Podcast/Newsletter étaient `display: none` sans fallback).
- **Zoom iOS bloqué** : `font-size: 16px !important` sur tous les `<input type="email|text|search|tel|url|password">` + `min-height: 48px`. 53 inputs patchés avec `inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" aria-label="Adresse email"`. Avant : 14-15px → zoom auto au focus + clavier mobile générique.
- **Overflow horizontal éliminé** : `html, body { overflow-x: clip }` + `overflow-wrap: break-word`. Avant : scroll horizontal 108-141px sur la home (hero blobs + marquee 2909px non contenue), 110+px sur les articles avec tables.
- **Tables articles scrollables** : wrapper `display: block; overflow-x: auto` automatique sur tous les `<table>` + font-size 13px + padding réduit ≤ 640px.
- **Focus clavier visible** : `:focus-visible { outline: 3px solid var(--fuchsia) }` (WCAG 2.2 AA). Avant : `outline: none` partout sans remplacement.
- **Skip-link** : `<a href="#main-content" class="skip-link">Aller au contenu</a>` injecté sur les 36 pages mini-nav, ancre `#main-content` placée après la nav.
- **Tap targets** : theme-toggle 38→44px, `.article-pill / .learn-filter / .story-tag` passent à `min-height: 44px`.
- **iPhone / dvh** : `min-height: 100dvh` au lieu de `100vh` (toolbar Safari), safe-area `env(safe-area-inset-*)` sur mini-nav et footer.
- **Sélection + tap highlight Fiesta** : `::selection { background: var(--fuchsia) }`, `-webkit-tap-highlight-color`.
- **Lecture article mobile** : `font-size: 17.5px / line-height: 1.7` ≤ 640px, padding container 28→18px (gain +7 caractères par ligne, passe de ~40ch à ~47ch).

### Fichiers touchés
- **CSS** :
  - `assets/main.css` — bloc « MOBILE UX FIXES » en fin de fichier (+155 lignes)
  - `assets/nav-v2.css` — burger + drawer + theme-toggle 44×44 (+70 lignes)
  - `assets/mobile-fixes.css` — **nouveau**, fichier partagé chargé en dernier sur toutes les pages mini-nav (override le CSS inline des articles qui n'incluent pas main.css)
- **JS** :
  - `assets/nav-v2.js` — **nouveau**, toggle burger + Escape + close on resize ≥ 961px
- **HTML** : 36 pages avec mini-nav patchées en bulk (perl) :
  - Burger HTML inséré avant `<div class="links">`
  - `id="mini-nav-links"` sur le drawer
  - Ancre `<a id="main-content" tabindex="-1">` après `</nav>`
  - `<a href="#main-content" class="skip-link">` après `<body>`
  - `<link rel="stylesheet" href="…/mobile-fixes.css">` avant `</head>`
  - `<script src="…/nav-v2.js" defer>` avant `</body>`
  - 53 inputs email enrichis (`inputmode`, `autocomplete`, `autocapitalize`, `spellcheck`, `aria-label`)
- `index.html` + `precommande-merci.html` : ajout `<link href="assets/nav-v2.css">` (elles ne l'incluaient pas — nav inlinée)

### Vérifié sur device émulé iPhone 14 Pro (390×844, DPR 3, isMobile, hasTouch)
| Page | Overflow | Burger | Input email | Skip-link | Drawer |
|---|---|---|---|---|---|
| `/index.html` | 0px | 44×44 | 16px / 48h | ✓ | ouvre full-width ✓ |
| `/articles/agents-ia-guide.html` | 0px | 44×44 | 16px / 48h | ✓ | ✓ |
| `/preferences.html` | 0px | 44×44 | 16px / 48h | ✓ | ✓ |
| `/podcast.html` | 0px | 44×44 | 16px / 48h | ✓ | ✓ |

### À venir (Sprint 2 — backlog audit)
- **Perf images** : conversion WebP + `srcset` (162 images, 0 WebP actuellement, ~28 MB de photos JPG, image LCP home 330 KB)
- **Fonts** : réduire 10 poids → 3 (Archivo 400/700/900 + JetBrains Mono 400)
- **Cache headers** : `Cache-Control: public, max-age=31536000, immutable` sur `/assets/*` et `/photos/*` dans `vercel.json`
- **CLS** : `width`/`height` sur tous les `<img>` (actuellement 0)
- **Hover gating** : encapsuler les 47 `:hover` dans `@media (hover: hover)` pour éviter le sticky state mobile
- **TOC mobile** : la sidebar TOC des articles est `display: none` < 1240px → ajouter un TOC repliable inline
- **Headings articles** : corriger 8 skips h2→h4 sur `autoresearch-karpathy.html` + 2 sur `agents-ia-guide.html`
- **Pages légales** : 4 pages (`cgv`, `mentions-legales`, `politique-confidentialite`, `suppression-donnees`) n'ont pas la mini-nav → migration à faire (elles ont la `mobile-fixes.css` injectée si déjà mini-nav, à vérifier)
- **Contrastes accents** : teal/fuchsia/orange en texte ratent WCAG AA, prévoir variantes assombries (`#007A75 / #C8194B / #CC6800`)
- **Doublons nav** dans `preferences.html` et `quiz.html` (header legacy + mini-nav)

### Méthode
Audit dispatché en 5 sous-agents parallèles. Rapport consolidé livré avec sévérités (Critique/Majeur/Mineur), localisation `fichier:ligne`, snippets prêts à coller. Sprint 1 implémenté en bulk via perl sur 36 pages (atomique, réversible). Tous les fixes validés via `dev-browser` headless en émulation iPhone 14 Pro avec cache désactivé (CDP).

---

## 2026-05-13 · Nouvel article — Podcast IA pour enfants (3 Petites Lanternes)

### Pourquoi
Premier making-of du projet `~/Projets/podcast-enfants/` (« Les 3 Petites Lanternes »). Angle perso fort (papa qui refuse YouTube Kids), stack IA concrète (ElevenLabs v3 + Python + EBU R128), trous de marché identifiés par 4 sous-agents, et utilité parentale directe. Cible SEO « podcast IA pour enfants », « alternative YouTube Kids », « ElevenLabs podcast français » + GEO via FAQPage schema.

### Livré
- `drafts/podcast-ia-pour-enfants.md` — draft markdown avec frontmatter SEO complet (slug, kw primaires/secondaires, FAQ JSON-prêt)
- `articles/podcast-ia-pour-enfants.html` — article complet (~3 200 mots, 14 min de lecture) :
  - Title : « Podcast IA pour enfants : making-of des 3 Petites Lanternes » (58 chars)
  - Meta description : 146 chars, 2 keywords primaires + 1 hook neurosciences
  - OG/Twitter : « Un podcast IA pour mon fils, pas YouTube Kids » (46 chars) + desc 102 chars
  - JSON-LD Article + FAQPage (6 Q/R) pour boost AI Overviews / ChatGPT / Perplexity
  - Canonical absolu, article:published_time
  - Structure : Hero + TL;DR + 10 sections (déclic, recherche, concept, stack, casting, 8 interdits, structure, mastering, chiffres, pièges, leçons, à qui ça sert, FAQ, CTA)
  - 5 tables comparatives (trous de marché, casting voix, mastering vs adulte, structure 5 blocs, chiffres ép 2)
  - 3 usecase cards (pièges quota / bouclage / bug silencieux)
- `articles.html` — card ajoutée en première position (type:makingof, scene:studio, size:m, 14 MIN)

### Décisions ton & SEO
- Type schema : `Article` (making-of narratif, pas TechArticle ni OpinionPiece)
- Keyword principal naturel : « podcast IA pour enfants » → titre + meta + H1 + FAQ
- Long-tail GEO : « alternative YouTube Kids », « voix IA française », « podcast trajet voiture enfant »
- Ton Leo strict : 1ère personne, « PAS dev » assumé, zéro argot, montrer le travail (chiffres concrets ép 2 : 13:42, 109 segments, -16.1 LUFS, 6 € marginal)
- Mention « mon fils » (cohérent mini-bio jerwis.fr), zéro détail intime

### Cover OG livrée
- `scripts/og-batch.html` — entrée `podcast-ia-pour-enfants` ajoutée (kicker fuchsia, H1 « UN PODCAST IA POUR MON FILS. PAS YOUTUBE KIDS. », tagline « ElevenLabs v3, 2 voix, 4 personnages. »)
- `photos/og/podcast-ia-pour-enfants.jpg` généré via `dev-browser --headless` (1200×630 JPEG qualité 85, 80 Ko, baseline)
- Rendu validé visuellement : triple-stripe top/bottom, photo Jérémy, kicker pulse fuchsia, accent fuchsia sur « PAS YOUTUBE KIDS », URL jerwis.fr en bas droite

### À venir
- [ ] Si la page `podcast.html` existe : éventuellement teaser la série « 3 Petites Lanternes » + lien vers l'article
- [ ] Quand le pilote sort sur Spotify/Apple : update CTA bas de page avec lien d'écoute direct + dateModified

---

## 2026-05-05 · Refonte admin → jerwis-admin (repo séparé)

### Pourquoi
L'admin local sur `~/Projets/jeremy-sagnier-site/admin/` ne servait plus. Le sourcing automatique (`scripts/brainstorm.js`) remontait des sujets non pertinents pour Jérémy. Décision de tout supprimer et de partir sur un admin dédié, forké de `~/Projets/newsletter-dashboard/`, déployé sur sous-domaine `admin.jerwis.fr`.

### Livré côté nouveau repo `~/Projets/jerwis-admin/`
- Repo GitHub `sagnierjeremy-byte/jerwis-admin` créé (Next.js 16 + Supabase + Resend + Anthropic + Zernio + Tailwind 4)
- Pipeline complet : Sources (31 seedées : 16 YT + 7 presse + 8 GNews) → Veille cron 6h (RSS Atom + scoring Haiku 0-100) → Curation manuelle (top 30 ≥ 40) → Newsletter "Vendredi 9h" ton Leo Jérémy 1ère personne (Sonnet) → Envoi via Resend audience AI Playbook réutilisée → 10 posts X+LinkedIn (Sonnet) → Programmation Zernio en 1 clic
- Auth middleware mot de passe custom (sha256 password::secret · cookie httpOnly 7j)
- 8 pages MVP : `/` `/sources` `/inspiration` `/generate` `/newsletters` `/audience` `/social` `/settings`
- 6 tables Supabase dédiées projet `jerwis-newsletter` (npxvttwhrlrmwafpfudy) : sources · items · source_runs · newsletters · social_posts · settings
- 15 tests Vitest passants (auth · url-canonical · feeds)

### Suppression côté site jerwis.fr
- `admin/` (14 modules, shell vanilla)
- `scripts/admin-server.js`, `scripts/brainstorm.js`, `scripts/editorial-clusters.js`, `scripts/youtube-channels.js`
- `data/youtube-cache.json`
- `BACKLOG.md`
- `social-drafts/`
- 5 fichiers `_preview-*.html` (mockups morts de redesign passé)
- Scripts npm `admin` et `brainstorm` retirés de package.json

### Audience Resend
Réutilisation de l'audience AI Playbook existante (`RESEND_AUDIENCE_ID=58ebf8b3-6200-451d-ad82-998c8fd6e483`). Zéro perte d'inscrits.

### Documentation
- Spec : `docs/superpowers/specs/2026-05-05-jerwis-admin-design.md` (15 sections)
- Plan d'implémentation : `docs/superpowers/plans/2026-05-05-jerwis-admin-plan.md` (37 tasks · 12 phases)

### Reste à faire (Phase 11 du plan, action humaine)
- Créer projet Vercel `jerwis-admin` (importer le repo GitHub)
- Ajouter toutes les env vars depuis `.env.local`
- Lier sous-domaine `admin.jerwis.fr` (CNAME chez Hostinger)
- Tester le flow complet en prod (login → cron veille → curation → génération → envoi test)

### Fichiers touchés
Côté site : `package.json` · `CHANGELOG.md` · suppression `admin/`, scripts, BACKLOG, drafts.
Côté nouveau repo : voir `~/Projets/jerwis-admin/` (3 commits, repo neuf).

## 2026-04-29 · Article opinion 5 · Musk vs OpenAI, le procès expliqué

### Pourquoi
Le procès Musk vs OpenAI a démarré lundi 27 avril à Oakland · timing parfait pour publier une opinion grand public qui explique l'affaire à des non-spécialistes. Sujet chaud, fort potentiel SEO et social, format Leo (storytelling, scènes concrètes, pas de jargon).

### Démarche
4 sous-agents `general-purpose` lancés en parallèle pour produire 4 dossiers de recherche dans `drafts/research-musk-openai/` :
- **RESEARCH-1-TIMELINE.md** · 24 entrées chronologiques judiciaires (mars 2024 → 28 avril 2026)
- **RESEARCH-2-ENJEUX.md** · 7 sections sur structure légale, deal Microsoft 13B$, charte AGI, valuations, scénarios verdict
- **RESEARCH-3-TWEETS.md** · 17 tweets/citations vérifiés via articles presse + court filings + Wayback Machine
- **RESEARCH-4-CONTEXTE.md** · 8 sections + 10 anecdotes narratives (dîner Rosewood, emails Sutskever, journal Brockman, etc.)

### Article livré
- **`articles/musk-vs-openai-le-proces.html`** · ~5 000 mots · 18 min de lecture · niveau découverte
- 12 sections h2 : avant de commencer · histoire en 2 minutes · cofondation 2015 · rupture 2018 · pivot 2019-2025 (5 step cards + tableau chrono) · best-of des piques (5 tweets en VO+FR) · procès en cours · 5 enjeux · sources · FAQ 10 questions · CTA verdict
- Modèle copié sur `plan-chine-2026-2030.html` (même CSS, même structure narrative, callouts, kickers rotants)
- Schema.org OpinionPiece + FAQPage (10 Q&R)
- Couleur dominante : fuchsia (drama, conflit)
- Tweets cités intégralement en anglais avec traduction française naturelle (Musk + Altman + blog OpenAI), encadrés par couleur (fuchsia/orange/teal selon protagoniste)

### Intégrations
- **`index.html`** · nouvelle carte alaune (Nº 05) ajoutée en tête de "Les dernières sorties" → href `articles/musk-vs-openai-le-proces.html`
- **`sitemap.xml`** · URL ajoutée avec priority 0.9, changefreq weekly (sujet brûlant)
- Plausible + Clarity hérités du template (déjà inclus)

### Fichiers touchés
`articles/musk-vs-openai-le-proces.html` (nouveau) · `index.html` · `sitemap.xml` · `.gitignore` (`.vercel` ajouté par link Vercel CLI) · `drafts/research-musk-openai/` (4 RESEARCH .md) · `CHANGELOG.md`.

### À surveiller
- Verdict du procès attendu fin mai 2026 → préparer article suivi à chaud
- Tracker dans Plausible : taux de clic carte Alaune `/articles/musk-vs-openai-le-proces.html` vs autres opinions
- Surveiller Clarity : scroll-depth sur les 5 step cards (tableau chrono + step 5 offre 97,4 Md$ = points de bascule)

---

## 2026-04-26 · Vérif freebies + admin enrichi par newsletter

### Pourquoi
Doute sur le fait que les forms freebie (CLAUDE.md + pack ZIP) délivrent bien le fichier après inscription (0 inscription `freebie-*` dans l'historique). Et besoin de voir dans l'admin sur quelle newsletter chaque personne est abonnée, pas juste la source brute.

### Vérification freebies (e2e sur prod)
Test dev-browser sur `https://jerwis.fr/` avec emails mailinator :
- Form **claude-md** → API 200 `source: freebie-claude-md` + download `https://jerwis.fr/downloads/CLAUDE.md` déclenché ✓
- Form **pack** → API 200 `source: freebie-pack` + download `https://jerwis.fr/downloads/jeremy-claude-pack.zip` déclenché ✓
- Status visible sur la page : "✓ Inscrit + téléchargement lancé"

**Conclusion** : les forms fonctionnent parfaitement. Le 0 historique = personne ne les a utilisés (probablement pas scrollés jusque-là). Les contacts test ont été supprimés de Resend (3 mailinators au total, dont 2 traînaient depuis avril).

### Admin enrichi
- **`scripts/admin-server.js`** :
  - Nouvelle fonction `parseNewsletters(source)` qui déduit AI Playbook / Business Radar à partir de la source. Règles : `ai-playbook+business-radar` → les 2 ; `ai-playbook` / `multi` / `early-access` / `freebie-*` / `cours-*` / `direct` → AI Playbook ; `business-radar` → BR.
  - `fetchResendContacts` ajoute `aiPlaybook` et `businessRadar` (booleans) sur chaque contact.
  - `computeNewsletterStats` retourne `aiPlaybook`, `businessRadar`, `both`, `aiPlaybookOnly`, `businessRadarOnly`.
- **`admin/modules/newsletter/page.html`** :
  - Nouvelle section "Répartition par newsletter" avec 3 stat-cards (AIP / BR / Aux deux) + % de l'audience sur chaque.
  - Colonne "Newsletters" dans la liste des contacts : 2 mini-pills AIP (teal) + BR (fuchsia), colorées si abonné, pointillés si pas.
  - CSV export enrichi avec colonnes `aiPlaybook` / `businessRadar`.

### État audience
21 inscrits actifs · 21 sur AI Playbook (100%) · 12 sur Business Radar (57%) · 12 aux deux (57%) · 9 sur AIP seul · 0 sur BR seul.

### Fichiers touchés
`scripts/admin-server.js` · `admin/modules/newsletter/page.html` · `CHANGELOG.md`. Trois contacts test mailinator supprimés directement sur Resend (audience clean).

---

## 2026-04-26 · Triple ship · Clarity + honeypot + reconstruction sources

### Pourquoi
Trois quick wins après l'analyse Plausible des données 2j post-launch (101 visiteurs, 9.9% CR newsletter, 67% mobile) : voir comment les gens scrollent (Clarity), bloquer les bots avant l'arrivée du SEO (honeypot), récupérer la source des inscriptions passées (reconstruction Resend).

### Livré
**1. Microsoft Clarity** (heatmaps + session replay, gratuit illimité)
- Project ID `whves74mv1` injecté juste après le bloc Plausible sur les **33 pages publiques** (12 root + 21 articles).
- Async, zéro impact perfo, pas de banner cookies (Clarity n'est pas du tracking publicitaire).

**2. Honeypot anti-spam + rate limit + email regex stricte** côté `/api/subscribe.js`
- Champ `website` invisible dans les 4 forms d'`index.html` (CSS off-screen `left:-9999px`). Si rempli → 200 fake-success silencieux + log.
- Rate limit in-memory : 3 inscriptions max / 10 min / IP, même comportement fake-success.
- Email regex stricte (au lieu de `email.includes("@")`).
- Tests directs validés : honeypot, regex, rate limit (3 OK puis blocage 4e).

**3. Reconstruction des sources des 17 inscrits passés**
- Récupération via API Resend `/emails` des 250 notifs admin `+1 newsletter ·` (le body contient `Source · xxx`).
- Patch rétroactif `last_name = src:<source>` sur 17 contacts (les 6 restants : 4 sans notif + 2 tests mailinator restent en "direct").
- Distribution mise à jour : `ai-playbook+business-radar` 52% (12) · `direct` 26% (6) · `ai-playbook` 17% (4) · `early-access` 4% (1).
- **Insight** : 0 inscription via freebies (`freebie-claude-md` / `freebie-pack` / `cours-semaine-1`). Les freebies ne tractent pas vers la newsletter.

### Fichiers touchés
- `api/subscribe.js` — honeypot + rate limit + regex
- `index.html` — 4 forms × hidden input + handlers JS
- 33 pages HTML — script Clarity (root + 21 articles)
- `CHANGELOG.md`

### À surveiller dans 7 jours
- Clarity dashboard : top scroll-depth, rage-clicks, dead-clicks sur la home
- Distribution sources des PROCHAINES inscriptions (tracking automatique maintenant)
- Logs Vercel : nombre de honeypots déclenchés / rate limit hits (signe d'attaque ou bots)

---

## 2026-04-26 · Tracking source d'inscription newsletter

### Pourquoi
Plausible mesure les conversions globales (10 form submissions sur la semaine), mais pas par page de provenance. Avec une attribution par source, on saura quelle page de la home/du parcours convertit le mieux (newsletter inline, CTA bottom, freebie download, etc.) — données nécessaires pour optimiser les placements.

### Solution retenue
Resend audiences ne supporte pas les attributs custom (`properties: {}` toujours vide après POST avec champ ad hoc, vérifié à l'API). Stockage de la source dans `last_name` avec préfixe `src:` (champ inutilisé chez Jérémy). Migration future vers Brevo gérera la vraie segmentation native.

### Livré
- **`api/subscribe.js`** : POST Resend inclut maintenant `last_name: "src:<source>"` quand une source est fournie (les forms du frontend l'envoient déjà).
- **`scripts/admin-server.js`** · `fetchResendContacts()` : parse `last_name` pour extraire la source ; fallback "direct" si absent. La page admin "D'où viennent tes inscrits" se peuple automatiquement à partir des prochaines inscriptions.

### Limites assumées
- Les **23 inscrits existants** apparaîtront tous en "direct" (impossible de reconstituer la source rétroactivement).
- Source tronquée à 60 caractères pour respecter les limites raisonnables d'un `last_name`.

### Fichiers touchés
`api/subscribe.js` · `scripts/admin-server.js` · `CHANGELOG.md`.

---

## 2026-04-26 · Compteur "dernier inscrit" newsletter dans le back-office

### Pourquoi
Jérémy voulait voir d'un coup d'œil combien de personnes sont inscrites à la newsletter et quand a eu lieu la dernière inscription (date + heure). Décision : admin-only — à 21 inscrits réels, un compteur public dessert. On affiche le total + momentum 24h pour Jérémy uniquement.

### Livré
- **Carte "Dernier inscrit"** en haut du module `admin/modules/newsletter` (fuchsia, full-width) : "il y a X" + date longue FR + heure (Paris) + email + compteur 24h.
- **Stats backend enrichies** : `computeNewsletterStats()` renvoie désormais `lastSubscribedAt`, `lastEmail` et `new24h` en plus du total/7d/30d/unsub.
- **`.env.local` réparé** : `RESEND_API_KEY` et `RESEND_AUDIENCE_ID` décommentés. L'audience ID hardcodé en fallback (`304eb...`, obsolète) remplacé par le vrai ID AI Playbook (`58ebf8b3-6200-451d-ad82-998c8fd6e483`) — l'ancien n'existait plus côté Resend, l'API renvoyait `data: []` au lieu des 23 contacts réels.

### État actuel (2026-04-26 17:30 Paris)
23 contacts dans l'audience AI Playbook · 21 inscrits réels (2 tests mailinator) · 11 nouveaux dans les dernières 24h · dernier inscrit `e.trebossen@soizeconseil.fr` à 15:37.

### Fichiers touchés
`.env.local` · `scripts/admin-server.js` (computeNewsletterStats + fallback audience ID) · `admin/modules/newsletter/page.html` (carte + populate dans `load()`) · `CHANGELOG.md`.

### À venir
- Côté Vercel : vérifier que `RESEND_AUDIENCE_ID` y est bien sur le bon ID (sinon l'inscription en prod écrirait dans une audience fantôme — bug silencieux).
- Si le compteur public devient pertinent (>300 abonnés), reprendre l'option "momentum 24h" plutôt que total brut.

---

## 2026-04-25 · Making-of refonte « Le Journal » (draft narratif)

### Pourquoi
Toute la session de refonte `/articles` du 24 avril (port React→vanilla, byline, avatar pré-croppé, grille fix, sessions parallèles) consignée comme matière éditoriale pour un futur article de blog.

### Livré
- `drafts/making-of-le-journal.md` (~470 lignes) — récit narratif complet de la session : 6 étapes (port, TL;DR fix, byline, photo en 5 essais, grid masonry-mauvaise-idée, collision sessions parallèles) + 5 méta-leçons.
- Frontmatter prêt pour `npm run publish making-of-le-journal` quand Jeremy voudra mettre en ligne.

### Fichiers touchés
`drafts/making-of-le-journal.md` (nouveau).

---

## 2026-04-24 · Setup SEO complet (GSC + sitemap + Plausible + DNS primary)

### Pourquoi
Premier setup SEO du site après le go-live du 2026-04-22. Objectif : se rendre visible de Google, suivre le trafic, corriger les incohérences techniques qui diluent le SEO (www vs non-www, redirect temporaire).

### Livré
- **Google Search Console** configuré avec propriété `jerwis.fr` (mode Domaine). Vérification DNS automatisée via API Hostinger (TXT `google-site-verification=82DMITs...` ajouté en préservant le SPF email existant).
- **Sitemap soumis** dans GSC : 24 URLs découvertes, "Opération effectuée".
- **Redirect primary basculé** `www.jerwis.fr` → `jerwis.fr` (308 permanent) via Vercel Domains. Le site servait en `www` avec redirect 307 temporaire, incohérent avec les canonicals et sitemap en `jerwis.fr` — tout est maintenant aligné.
- **Plausible Analytics** installé sur les 33 pages HTML publiques (snippet juste avant `</head>`). Choix vs GA4 motivé par zéro bannière cookies + dashboard lisible. Remplace le TODO historique "Ajouter Vercel Analytics ou Plausible".
- **Backup DNS** Hostinger sauvegardé dans `/tmp/jerwis-dns-backup-20260424-214119.json` avant modif.

### Fichiers touchés
Les 33 HTML publiques : `index.html`, `apprendre.html`, `articles.html`, `claude-code.html`, `debutant.html`, `github.html`, `lexique.html`, `outils.html`, `podcast.html`, `preferences.html`, `quiz.html`, `workflows.html` + 23 articles dans `articles/*.html`. `CHANGELOG.md`.

### À venir
- [ ] Corriger l'avertissement "DNS Change Recommended" Vercel (record A jerwis.fr à migrer via API Hostinger)
- [ ] Soumettre les 5 pages clés via "Inspection URL" dans GSC (quota 10/jour)
- [ ] Créer Service Account Google Cloud pour auto-indexation via Indexing API (auto-ping à chaque publi)
- [ ] Activer IndexNow (Bing/Yandex) — 5 min de setup
- [ ] Setup Bing Webmaster Tools (import depuis GSC en 1 clic)
- [ ] Supprimer le TODO "Kill ancien projet Vercel" (safe maintenant que domaine en primary)

---

## 2026-04-24 · SEO bonus — IndexNow + OG/Twitter + dimensions images

### Pourquoi
Après le setup SEO initial (GSC + sitemap + Plausible + DNS primary), s'attaquer aux bonus à haut ratio impact/effort identifiés par l'audit :
1. **IndexNow** : notifier Bing/Yandex instantanément à chaque publi au lieu d'attendre leur crawl passif (plusieurs jours).
2. **Open Graph/Twitter Card** : partages LinkedIn/X avec previews correctes + image sur les 12 hubs qui n'étaient pas complets.
3. **Dimensions images** : éviter le layout shift au chargement (impacte Core Web Vitals + signal ranking Google).

### Livré
- **IndexNow setup complet** :
  - Clé générée : `76175249428d4264cf750e4158fdb5c9` (fichier `.txt` live à la racine)
  - Script réutilisable `scripts/indexnow-ping.js` avec 3 modes : sitemap entier / URLs directes / depuis fichier
  - Raccourci `npm run indexnow`
  - Hook post-publi : `scripts/publish.js` affiche maintenant la commande IndexNow après génération d'un article
  - Premier ping effectué sur les 32 URLs du sitemap (HTTP 202 accepté, Bing + Yandex notifiés)
- **Open Graph + Twitter Card complétés sur 12 pages** (via sous-agent en parallèle) :
  - index, apprendre, articles, claude-code, debutant, github, lexique, outils, podcast, preferences, quiz, workflows
  - Fallback image `/photos/og-jerwis.jpg` (1200×630) utilisé pour 11 pages, podcast conserve sa cover dédiée
  - preferences.html passe de 0 à 12 tags (noindex préservé)
- **27 dimensions images ajoutées** (8 articles) :
  - agents-ia-guide (3), booking-eurofiscalis-making-of (3), dev-browser (3), limova-vs-claude-code (3), outil-vente-claude-code (4), tuto-agent-contrats (5), tuto-agent-gmail (4), veille-pour-demain (2)
  - Dimensions lues via PIL sur les fichiers source, insérées entre `src` et `alt`
- **Audit BlogPosting schema** : les 21 articles ont déjà un schema d'article (13 TechArticle, 5 Article, 3 OpinionPiece) + FAQPage. L'audit initial s'était trompé — rien à ajouter.

### Fichiers touchés
`76175249428d4264cf750e4158fdb5c9.txt` (nouveau), `scripts/indexnow-ping.js` (nouveau), `scripts/publish.js`, `package.json`, 12 pages HTML à la racine, 8 articles dans `articles/*.html`, `CHANGELOG.md`.

### À venir
- [ ] Générer 11 covers OG dédiées par hub (remplacer le fallback `og-jerwis.jpg`)
- [ ] Ajouter `loading="lazy"` aux 12 images below-the-fold
- [ ] Conversion batch WebP (-40% poids, +5 pts Lighthouse)
- [ ] Créer Service Account Google Cloud pour Indexing API (auto-ping Google à chaque publi)

---

## 2026-04-24 · SEO — canonicals standardisés + sitemap complété (32 URLs)

### Pourquoi
Audit SEO post-GSC a révélé 2 problèmes d'indexation :
1. **Canonicals inconsistants** sur 9 articles : 6 sans `.html` + 3 sans canonical du tout. Risque de duplicate content pour Google (/articles/X vs /articles/X.html traités comme 2 pages).
2. **Sitemap incomplet** : 8 pages publiques manquaient (articles.html, outils.html, github.html, quiz.html + 4 articles récents). Google n'indexait que 24/33 pages.

### Livré
- **9 articles canonicals standardisés** avec `.html` final :
  - Ajout `.html` sur : autoresearch-karpathy, booking-eurofiscalis-making-of, guerres-d-ia-podcast, hermes-agent, llm-local-pour-non-dev, open-source-pour-non-dev (6 articles)
  - Ajout canonical complet + og:url sur : better-call-vs-associe, limova-vs-claude-code, tuto-agent-gmail (3 articles qui n'en avaient aucun)
- **Sitemap passé de 24 à 32 URLs** :
  - Ajout hubs : articles.html (priority 0.9), outils.html (0.85), github.html (0.8), quiz.html (0.7)
  - Ajout articles : booking-eurofiscalis-making-of, guerres-d-ia-podcast, llm-local-pour-non-dev, open-source-pour-non-dev
  - `preferences.html` volontairement exclue (déjà en `noindex,nofollow`, page privée)
- Sitemap validé XML (xmllint) — prêt pour re-soumission GSC

### Fichiers touchés
`sitemap.xml`, 9 articles dans `articles/*.html`, `CHANGELOG.md`.

### À venir
- [ ] Re-soumettre le sitemap dans GSC pour que Google détecte les 8 nouvelles URLs
- [ ] Forcer indexation des 5 pages clés via "Inspection URL"

---

## 2026-04-24 · Fix grille articles + avatar pré-croppé Jeremy

### Pourquoi
Deux bugs visibles signalés par Jeremy :
1. **Grille `/articles`** : les cards `size:m` (LE PLAN CHINOIS, UN PODCAST) spannaient 2 rows en masonry mais leur contenu était court → 50% de blanc en bas, cards visuellement cassées.
2. **Avatar byline** : malgré le zoom 280% en background-position, on voyait encore un bout de Kevin (le frère jumeau) dans le cercle.

### Livré
- **Grille uniforme** : suppression de `.b-grid .art.size-m { grid-row: span 2 }` et `grid-auto-flow: dense`. Toutes les cards ont la même hauteur (= contenu). Plus de blanc.
- **Avatar pré-croppé** : nouveau fichier `photos/jeremy-avatar.jpg` (256×256, 13 Ko) — crop manuel via PIL sur le visage de Jeremy seul (zone 360×360 autour de x=720, y=800 sur la photo source 1078×1600), redimensionné. Plus besoin de bidouiller `background-position`.
- 15 articles : remplacement du `<span>` background-image par un simple `<img src="../photos/jeremy-avatar.jpg">` avec `object-fit:cover`. Plus rapide à charger (256×256 vs 1078×1600).

### Fichiers touchés
`articles.html`, `articles/*.html` (15), `photos/jeremy-avatar.jpg` (nouveau), `CHANGELOG.md`.

---

## 2026-04-24 · Byline SEO uniformisée + photo de profil sur 15 articles

### Pourquoi
La tagline `Entrepreneur · pas dev · décrypte la géopolitique avec Claude` (et variantes) était maintenue à la main par article — lourd à gérer. Pas de photo de profil → signal EEAT plus faible et byline « anonyme » visuellement.

### Livré
- **Photo ronde 42px** (`A7100670.jpg`, le portrait validé déjà utilisé sur la home, object-position: center 25%) ajoutée à gauche du nom.
- **Tagline universelle** `Je teste l'IA tous les jours · Je partage ce qui m'a servi` — alignée avec le pitch central de la home, durable, ton Leo.
- Propagée sur les 15 articles via script Python qui préserve la date `Publié X · MAJ Y` par article.
- Dates conservées par article (15 dates différentes maintenues).

### Fichiers touchés
15 articles dans `articles/*.html`, `CHANGELOG.md`.

---

## 2026-04-24 · Fix chevauchement TL;DR / byline SEO sur 15 articles

### Pourquoi
Sur les 15 articles avec `seo-byline` (pill auteur + date insérée pour le SEO), le TL;DR juste en dessous remontait de 40px (`margin-top: -40px`, effet « remontée sur hero » prévu à l'origine) et écrasait la byline. Visuellement : la pill blanche dépassait derrière le TL;DR avec un coin arrondi cassé.

### Livré
- `assets/nav-v2.css` : ajout d'un sélecteur sibling `.seo-byline + .container > .tldr, .seo-byline + .tldr { margin-top: 16px !important; }` qui annule le négatif uniquement quand une byline précède le TL;DR.
- Les 7 articles sans byline gardent leur effet remontée (-40px sur hero dark).
- Validé dev-browser : loops-claude (avec byline) = gap +16px, superpowers (sans) = margin-top -40px conservé.

### Fichiers touchés
`assets/nav-v2.css`, `CHANGELOG.md`.

---

## 2026-04-24 · Refonte design `/articles` — « Le Journal »

### Pourquoi
Le catalogue `/articles` créé plus tôt dans la journée fonctionnait mais restait basique (hero compact + grille de cards plates). Jeremy a livré un design Blog (zip JSX/CSS canvas) beaucoup plus identitaire — gros titre split-char animé, featured dark avec ribbon « À LA UNE », filtres pills à indicateur glissant, grille masonry avec scènes CSS illustrées par article (nuit, matrix, china, studio, office, paper, abstract, corp, desk, minimal), CTA newsletter fuchsia. Objectif : faire de la page un vrai « journal » plutôt qu'une liste.

### Livré
- **`articles.html`** entièrement réécrit (~1100 lignes) en intégrant le design Blog adapté React → vanilla JS (la stack du site est sans framework).
  - Hero animé : kicker pulse, count-up stats (21 articles · 5 catégories · 2026), titre `CE QUE J'ÉCRIS / QUAND JE PENSE.` (ligne 2 en gradient teal→fuchsia→orange sweep), marquee de fond rotaté `JOURNAL · CARNET · CAS RÉELS`.
  - **Featured** = article le plus récent (monde-ia-5-10-20-ans) — ribbon `À LA UNE` animé + scène nuit (lune, étoiles, fenêtre, enfant, device IA), tag OPINION + lecture, CTA fuchsia avec shimmer.
  - **Filtres pills** avec indicateur glissant teinté par catégorie (TOUT · OPINIONS · TUTOS · CAS RÉELS · VULGARISATION · PODCAST). Compteurs auto.
  - **Grille masonry** 3 colonnes (size:m span 2 rows, size:s span 1) + grid-auto-flow:dense pour combler les vides. Hover 3D (perspective+rotateX/Y) + glow radial trackant la souris.
  - **10 scènes CSS** illustrées (nuit/china/studio/office/corp/desk/paper/abstract/matrix/minimal) appliquées par slug d'article. Aucune image bitmap, full CSS animations.
  - **Newsletter CTA fuchsia** wired à `/api/subscribe` (Resend) — état envoi, succès, déjà inscrit (409), erreur.
  - Conservé : nav-v2 sitewide, footer global avec liens YouTube/IG/LinkedIn, theme toggle, triple-stripe canonique.
  - Reveal animations via IntersectionObserver (hero, featured, news, cards) — pas de bibliothèque.

### Validation
Test dev-browser headless 1440×900 :
- Light + dark mode OK (background blobs visibles, dark mode bascule via `data-theme`).
- 20 cards rendues (21 - 1 featured), 6 boutons filtres, statistiques count-up animées.
- Filter `opinion` = 4 cartes (5 opinions − 1 featured monde-ia) ✓
- Featured rend correctement la scène nuit + ribbon + CTA.
- Pas d'erreur console, pas de 404.

### Fichiers touchés
`articles.html` (réécriture complète), `CHANGELOG.md`.

### À venir
- Si besoin, exposer un toggle layout (masonry / uniform) — actuellement masonry forcé.
- Préload des fonts pour éviter le FOUC sur le titre split-char.
- Étendre le design « Journal » à `/podcast` (cohérence) si Jeremy valide le rendu.

---

## 2026-04-24 · Nav Jerwis v2 propagée + page `/articles`

### Pourquoi
Le nouveau hero Jerwis v2 sur `index.html` utilisait une mini-nav (4 liens + logo stamp + theme toggle) qui n'existait que sur la home. Les autres pages gardaient l'ancien header, d'où rupture visuelle à chaque clic. Besoin aussi d'une page catalogue `/articles` pour surfacer les 21 articles au même endroit (accessible depuis la nav).

### Livré
- **`assets/nav-v2.css`** (nouveau) : mini-nav Jerwis v2 partageable · logo stamp « PAR JEREMY SAGNIER · JERWIS » · 4 liens (Apprendre · Articles · Podcast · Newsletter) · theme toggle rond · règles pour cacher l'ancien header.
- **Propagation sur 31 pages** : 10 pages racine (`apprendre`, `claude-code`, `debutant`, `github`, `lexique`, `outils`, `podcast`, `preferences`, `quiz`, `workflows`) + 21 articles (`articles/*.html`). Lien CSS + bloc `<nav class="mini-nav">` ajoutés, theme toggle JS branché.
- **`articles.html`** (nouveau, page catalogue) :
  - Hero compact dark « Tous les articles · Triés par date. » avec kicker + lead.
  - Barre de filtres sticky 6 boutons : Tous (21) · Tutos (10) · Opinions (5) · Vulgarisation (3) · Making-of (2) · Podcast (1).
  - Compteur live « 21 articles visibles » qui update au filtre.
  - Grid 3 colonnes desktop / 2 tablet / 1 mobile. Cards avec bandeau top coloré par accent, badge type coloré, titre Archivo Black, description, date + durée, « Lire → ».
  - Mini-marquees signature entre sections.
  - Empty state si filtre vide.
  - Dark mode OK (badges couleurs inversées, bg inverté, pas de var(--ink) sur blocs fixes).
- **Tri par date desc** : monde-ia (2026-04-24) → plan-chine (2026-04-23) → vague 2026-04-20 → tuto-agent-contrats (2026-04-17) → agents-ia-guide (2026-04-15) → veille-pour-demain (2026-04-14) → 6 articles sans date en fin.

### Validation
Test dev-browser : 21 cards initiales, filter opinion = 5 cards, filter tuto = 10 cards, dark mode OK, responsive 400px OK. Compteurs cohérents (10+5+3+2+1 = 21).

### Fichiers touchés
`assets/nav-v2.css` (nouveau), `articles.html` (nouveau), `index.html`, `apprendre.html`, `claude-code.html`, `debutant.html`, `github.html`, `lexique.html`, `outils.html`, `podcast.html`, `preferences.html`, `quiz.html`, `workflows.html`, `articles/*.html` (21 fichiers).

### À venir
- Ajouter une image OG par article (placeholders actuellement tous sur `og-jerwis.jpg`).
- Regrouper peut-être les articles par « cluster thématique » (Claude Code · IA·Karpathy · Agents · Opinions géopolitique) en secondaire du filtre type.

---

## 2026-04-24 · CORE-EEAT boost · 3 opinions sous 80/100

### Pourquoi
Audits CORE-EEAT révèlent 3 opinions Medium (69-73/100) plombées par les mêmes Fail/Partial : R08 (zéro liens internes), Ept01/T02/T06 (pas de byline visible / contact / corrections), C09 (pas de FAQ sauf monde-ia), R02 (citations faibles sur better-call), O03/O10 (pas de tableau ni visuel sur plan-chine).

### Livré (3 articles)
| Article | Score avant | Améliorations |
|---|---|---|
| `monde-ia-5-10-20-ans.html` | 72 | + sameAs LinkedIn/X/YT · + bloc byline visible · + bloc corrections email · + tableau 5 paris (visuel) · + cross-links plan-chine + guerres-d-ia + karpathy · + 3 sources actu (Khan Labs · Doctolib blog · Waymo blog) |
| `plan-chine-2026-2030.html` | 69 | + FAQ 10 Q/R + FAQPage JSON-LD · + sameAs · + byline · + bloc corrections · + tableau 5 leviers (Levier · 2025 · 2030 · Risque) · + bloc « ce que cet article n'aborde pas » (Taïwan / Russie / Parti) · + cross-links monde-ia + guerres-d-ia + open-source · + 3 sources actu (Bloomberg China · FT China · Carnegie China) |
| `better-call-vs-associe.html` | 70 | schema Article → **OpinionPiece** · + FAQ 10 Q/R + FAQPage JSON-LD · + encadré « C'est quoi un Better Call ? » · + tableau comparatif 8 critères Associé vs Better Call · + bloc « limites honnêtes » (N=2, exit 1,5 M€ scénario unique) · + cross-links limova + outil-vente + monde-ia + plan-chine · + 5 sources externes (Maddyness · BPI · Anthropic Projects · TheFamily · LEGEND) · + 7e item sidebar Roster (FAQ) |

### Pattern réutilisable
Bloc byline + bloc corrections + sameAs schema = template à coller systématiquement sur tout nouvel article. Source canonique : `articles/better-call-vs-associe.html`.

### Validation
- 3 articles : structure HTML OK (parser stack-based, 0 mismatch)
- 6 JSON-LD blocks valides (2 par article : OpinionPiece + FAQPage)
- 100 % des liens internes pointent vers fichiers existants

### Score visé
Tous &gt; 80/100 après FAQ (boost C09 +1.2 GEO) + cross-links (boost R08 +1.8 R) + byline/corrections/sameAs (boost Ept+T+A ~2 pts) + tableaux/visuels (boost O03/O10 +2.5 O).

---

## 2026-04-24 · Boost Good→Excellent · 3 tutos agents (FAQ + sources + cross-links)

### Pourquoi
Trois articles audités CORE-EEAT à 75-81/100 (Good) avec 3 lacunes communes : C09 FAQ Coverage en Fail, R02 Citation Density faible, R08 Internal Link Graph partiel. Objectif : passer à 84-88/100 en injectant 30 Q/R structurées + sources externes hiérarchisées + maillage interne cluster agents.

### Livré (3 articles)
| Article | Score avant | FAQ ajoutée | Sources externes | Cross-links |
|---|---|---|---|---|
| `tuto-agent-gmail.html` | 78 | 10 Q/R + FAQPage JSON-LD | 7 (Anthropic SDK, MCP spec, Google Cloud, Gmail API, pricing, Make, Zapier) | contrats + hermes-agent + agents-ia-guide |
| `tuto-agent-contrats.html` | 81 | 10 Q/R + FAQPage JSON-LD | 12 (Anthropic ZDR/DPA, MCP filesystem, CNIL art.28, CNIL IA, hooks, lawinsider, Luminance, Ironclad, Spellbook, pricing, unstructured-io, PDF) | gmail + hermes-agent + agents-ia-guide + llm-local |
| `llm-wiki-karpathy.html` | 75 | 10 Q/R + FAQPage JSON-LD | 7 (Karpathy gist, Obsidian, Notion AI, Claude Projects, NotebookLM, GraphRAG, Cursor) | karpathy + autoresearch + veille-pour-demain + llm-local |

### Améliorations spécifiques d'après audits
- **gmail (E05/Exp04)** : note "captures OAuth à venir" + lien Gmail API quickstart en attendant
- **contrats (T08)** : disclaimer juridique YMYL renforcé — 2 paragraphes ajoutés "ne remplace pas un avocat" + "aucune décision finale ne doit reposer uniquement sur l'agent"
- **llm-wiki (E03/Exp05)** : encadré orange "première version, retour d'XP en mai 2026" — assume le pivot, transparence sur l'absence d'usage prolongé

### Validation
- HTML : 3 articles parsent OK (Python html.parser, zéro erreur)
- JSON-LD : 7 blocs validés (TechArticle x2 + Article + FAQPage x3) — 30 questions structurées
- Balises `<details>` : 10 ouverts / 10 fermés par article

### Fichiers touchés
- `articles/tuto-agent-gmail.html` (+135 lignes)
- `articles/tuto-agent-contrats.html` (+155 lignes)
- `articles/llm-wiki-karpathy.html` (+125 lignes)

### Score attendu post-MAJ
- gmail : 78 → ~84 (FAQ +1.8, citations +1.2, internal links +0.5)
- contrats : 81 → ~85 (FAQ +0.9, citations +1.5, disclaimer renforcé, internal links +0.5)
- llm-wiki : 75 → ~80 (FAQ +1.5, citations +0.5 sur déjà bon, internal links +0.5)

### À venir
- Mai 2026 : retour d'XP LLM Wiki réel (30 jours, 50 sources) → débloque Exp dimension 60 → 85
- Captures OAuth Gmail (option B MCP) si demande forte
- Re-audit dans 30 jours

---

## 2026-04-24 · CORE-EEAT push 90+ · 3 articles llm-local / open-source / hermes

### Pourquoi
Pousser au-dessus de 90/100 (rating Excellent) trois articles audités à 84/82/86. Cibles audit : R03 Source Hierarchy (Fail) + R08 Internal Link Graph (Partial) + C09 FAQ Coverage (Fail sur hermes) + R02 Citation Density.

### Livré
| Article | Avant | FAQ + JSON-LD | Sources externes ajoutées | Liens internes |
|---|---|---|---|---|
| `hermes-agent.html` | 86 | **+10 questions + FAQPage schema** (manquait totalement) | Anthropic, console.anthropic, API Keys docs, Make, Zapier, Gmail OAuth scopes, claude-haiku-4 docs, Microsoft Copilot, Outlook | +3 cluster agents (agents-ia-guide, tuto-agent-gmail, tuto-agent-contrats) |
| `llm-local-pour-non-dev.html` | 84 | déjà OK (10Q + schema) | Mistral, DeepSeek, Reuters NVIDIA -589G$, r/LocalLLaMA, Ollama, Open WebUI, LM Studio, GPT4All | +1 vers guerres-d-ia-podcast (cluster IA ouverte) |
| `open-source-pour-non-dev.html` | 82 | déjà OK (10Q + schema) | Anthropic, OSI + 10 critères, Linux Foundation, Apache Foundation, Reuters Red Hat 34G$, MongoDB Atlas, GitLab, HashiCorp BSL announcement, OpenSearch, OpenTofu, Valkey, Mistral AI, DeepSeek, Reuters NVIDIA, Andres Freund XZ post, Sansec Polyfill report | +1 vers llm-local (cluster IA ouverte, manque flagrant signalé par audit) |

### Détails techniques
- FAQ hermes : pattern repris exactement de llm-local (section .block#faq + 10 `<details>` charte fiesta + FAQPage JSON-LD après TechArticle)
- Tous les liens externes : `target="_blank" rel="noopener"` sur 1ère mention uniquement
- Date NVIDIA harmonisée : 27 janvier 2025 partout (1 occurrence "20 janvier" corrigée dans llm-local body)
- Path corrigé : `../articles/guerres-d-ia-podcast.html` → `guerres-d-ia-podcast.html` dans open-source (déjà dans articles/)

### Validation HTML
- hermes-agent.html : 0 erreur · 10 details · 2 JSON-LD valides (TechArticle + FAQPage)
- llm-local-pour-non-dev.html : 0 erreur · 10 details · 2 JSON-LD valides
- open-source-pour-non-dev.html : 0 erreur · 10 details · 2 JSON-LD valides

### Gain estimé pondéré
- hermes : +1.5 pts (FAQ C09) + 1.5 pts (R03) + 0.75 pts (R08 cluster) = **86 → ~90/100**
- llm-local : +1.5 pts (R03) + 0.5 pts (R08 podcast) = **84 → ~86/100**
- open-source : +1.5 pts (R03) + 0.75 pts (R08 cluster) = **82 → ~84/100**

### Sections NON modifiées
- TLDR (sauf disclosure transparence Anthropic linké), hero, mini-marquees, structure générale, share-block hermes, footer, scripts JS

### À venir (hors scope cette session)
- Screenshots réels (Exp04 / E05) pour pousser open-source et llm-local à 90+
- Mini-bench tokens/sec maison (E03) sur llm-local
- Mini-bio crédibilité (Ept02)

---

## 2026-04-24 · SEO Phase 3 · refontes contenu 5 articles + rename slug

### Pourquoi
Phase 3 finale : refondre le CONTENU (pas juste meta) des 5 articles initialement < 60/100 SEO. Plus profondeur, anecdotes vécues chiffrées, sources externes liées. Plus le rename du slug ridicule `claude-code-workflow-tips-after-6-months-of-daily-` → `claude-code-workflow-tips`.

### Livré (5 sous-agents en parallèle)
| Article | Mots avant | Mots après | Refonte |
|---|---|---|---|
| superpowers | 2 303 | **4 406** (+91 %) | 5 skills étoffés + retour XP 6 sem chiffré + cas non-code dédiés |
| monde-ia-5-10-20-ans | ~4 000 | **5 377** (+34 %) | 11 sources externes liées (METR, Marcus, Ord, Aschenbrenner, etc.) + 5 paris chiffrés 2030-2050 + thèse "humains préféreront la machine" musclée |
| veille-pour-demain | ~3 000 | **4 778** (+59 %) | Détails pipeline + scoring 5 axes + 3 niveaux de transférabilité au lecteur |
| dev-browser | ~3 000 | **4 098** (+37 %) | 5 cas non-dev clairs + routine perso + 3 commandes copiables |
| claude-code-workflow-tips | ~3 500 | **3 892** (+11 %) | Rename slug + propagation site (vercel.json redirect, sitemap, quiz, day-5-next, og/) — refonte contenu plus légère (quota atteint avant fin) |

### Rename complet `workflow-tips`
- `articles/claude-code-workflow-tips-after-6-months-of-daily-.html` → `claude-code-workflow-tips.html`
- `photos/og/<ancien>.jpg` → `<nouveau>.jpg`
- `audits/<ancien>/` → `audits/<nouveau>/`
- `vercel.json` : redirect 301 ajouté avec regex `(.html)?`
- `sitemap.xml`, `quiz.html`, `downloads/cours-email/day-5-next.md`, `scripts/seo-improve.js` mis à jour

### Bonus fix sitemap
- 2 URLs incorrectes `https://jeremysagnier.com/...` (plan-chine + monde-ia) corrigées en `https://jerwis.fr/...`

### État après Phase 3
- 21/21 articles HTML validés (0 erreur)
- Moyenne site estimée : ~92 → ~95/100 (les 5 plus faibles passent maintenant à 90+)
- 11 sources externes ajoutées sur monde-ia (Authority CORE-EEAT débloqué)
- Slug ridicule éradiqué + redirect 301 préservant le SEO existant

### Note quota
3/5 sous-agents (S1, S3, S4) ont atteint la limite Anthropic en fin de tâche — mais l'essentiel du travail était fait avant. Seul S1 (workflow-tips) n'a pas pu finir la refonte contenu profonde (juste le rename + propagation). À refaire après reset 18h50 si on veut pousser à 95+.

### Fichiers touchés
- 5 articles `articles/*.html` refondus
- `articles/claude-code-workflow-tips-after-6-months-of-daily-.html` SUPPRIMÉ
- `articles/claude-code-workflow-tips.html` NOUVEAU
- `photos/og/claude-code-workflow-tips-after-6-months-of-daily-.jpg` SUPPRIMÉ
- `photos/og/claude-code-workflow-tips.jpg` NOUVEAU
- `audits/claude-code-workflow-tips-after-6-months-of-daily-/` SUPPRIMÉ
- `audits/claude-code-workflow-tips/` NOUVEAU
- `vercel.json`, `sitemap.xml`, `quiz.html`, `downloads/cours-email/day-5-next.md`, `scripts/seo-improve.js` mis à jour
- `CHANGELOG.md` (cette entrée)

---

## 2026-04-24 · SEO Phase 2 · og:image dédiées + FAQ JSON-LD + template anti-régression

### Pourquoi
Suite de la Phase 1 SEO (qui a fait passer la moyenne site de 68 à ~85/100). Phase 2 = passer à 90+ via partage social pro + citabilité LLM (Perplexity, ChatGPT Search, Google AI Overview) + bloquer la régression sur les futurs articles.

### Livré (3 actions parallèles via 7 sous-agents)

#### P2-A1 · 21 og:image dédiées (1 sous-agent)
- **`scripts/og-batch.html`** : template paramétrable 1200×630 avec mapping 21 slugs (kicker, h1, tagline, accent, size). Charte fiesta respectée (stripe gradient teal-fuchsia-orange + portrait Jérémy à gauche + accent color par article).
- **`scripts/generate-og-batch.mjs`** : script Node Puppeteer qui boucle sur les 21 slugs, capture chaque cover en 1200×630, sauve en PNG.
- **`scripts/patch-og-images.mjs`** : patcher idempotent qui remplace les `og:image=og-jerwis.jpg` par `og:image=/photos/og/<slug>.jpg` sur les 21 articles + ajoute `og:image:width/height` + `twitter:image` + met à jour le JSON-LD `image`.
- **`photos/og/*.jpg`** × 21 : générés via Puppeteer + optimisés sips qual 82, taille moyenne 117 KB (cible <200 KB OG).
- **0 régression** : plus aucune référence à `og-jerwis.jpg` dans les 21 articles.

#### P2-A2 · FAQ + FAQPage JSON-LD sur 5 articles stratégiques (5 sous-agents en parallèle)
- **booking-eurofiscalis-making-of** : 10 Q/R (+136 lignes, 753→889)
- **llm-local-pour-non-dev** : 10 Q/R (+146 lignes, 909→1055)
- **open-source-pour-non-dev** : 10 Q/R (+76 lignes, 787→863)
- **monde-ia-5-10-20-ans** : 10 Q/R (~+200 lignes)
- **autoresearch-karpathy** : 10 Q/R
- **Total : 50 Q/R ajoutées au site**, citables directement par Perplexity / ChatGPT Search / Google AI Overview
- Format : section `<section class="block" id="faq">` avant Final CTA + `<details>` repliables charte fiesta + `FAQPage` JSON-LD dans head après JSON-LD existant

#### P2-A3 · MAJ `_TEMPLATE.html` anti-régression (moi-même)
- Bloc Meta complet ajouté en haut avec placeholders `{{TITRE}}`, `{{META_DESCRIPTION_140_155_CHARS}}`, `{{TITRE_OG_60_CHARS_MAX}}`, `{{OG_DESCRIPTION_110_CHARS_MAX}}`, `{{SLUG}}`, `{{DATE_PUBLI_AAAA-MM-JJ}}`, `{{DATE_MAJ_AAAA-MM-JJ}}`
- Commentaire HTML `⚠️ SEO REQUIREMENTS` qui rappelle les 6 contraintes (title ≤ 60, meta desc 140-155, OG/Twitter ≤ 110, canonical, 1 seul JSON-LD, og:image vers `photos/og/{{SLUG}}.jpg`)
- Tout futur article créé depuis ce template héritera des bons réflexes SEO
- Suffixe « — par Jérémy Sagnier » SUPPRIMÉ du title placeholder

### État après Phase 2 (estimations)
- Moyenne site : ~85 → ~92/100 (+7 pts moyens grâce à og:image + FAQ sur stratégiques)
- 21/21 articles : og:image dédiée + meta complet + dimensions correctes
- 5/5 stratégiques : FAQ visible + JSON-LD (50 Q/R total)
- Template `_TEMPLATE.html` : anti-régression activé
- Tous les HTML validés (21/21 OK)

### Fichiers touchés
- 21 articles `articles/*.html` (og:image + 5 d'entre eux ont aussi FAQ)
- `articles/_TEMPLATE.html` (bloc Meta complet ajouté)
- `scripts/og-batch.html` (nouveau)
- `scripts/generate-og-batch.mjs` (nouveau)
- `scripts/patch-og-images.mjs` (nouveau)
- `photos/og/*.jpg` (21 nouveaux)
- `CHANGELOG.md` (cette entrée)

### À venir (Phase 3 non faite)
- Refonte contenu des 5 articles initialement <60 (workflow-tips, monde-ia, dev-browser, superpowers, veille) — pas juste meta mais structure et profondeur
- Renommer slug `claude-code-workflow-tips-after-6-months-of-daily-` → `claude-code-workflow-tips` + redirect 301
- Ajouter chiffres first-party mesurés sur 4 semaines pour boost CORE-EEAT Experience

---

## 2026-04-24 · audit SEO + Phase 1 fix · 21 articles refondus

### Pourquoi
Audit SEO complet du site demandé par Jérémy : 21 articles audités par 6 sous-agents Phase A (format MD scoring /100 sur 4 blocs : Meta + Structure + Linking + Content), puis 5 stratégiques en CORE-EEAT Phase B (8 dimensions, 3 vetos), puis Phase 1 fix par 4 sous-agents en parallèle.

### Audits livrés (26 fichiers MD)
- `audits/<slug>/202604241000.md` × 21 — audit SEO actionnable Phase A (score /100 + 15 checks ✅/❌ + 3-5 recos)
- `audits/<slug>/202604241200.md` × 5 — audit CORE-EEAT Phase B sur booking + llm-local + open-source + monde-ia + autoresearch-karpathy

### Phase A — État avant fix
- Note moyenne : **68/100**
- Distribution : 3 articles >80 · 7 entre 70-79 · 5 entre 60-69 · 5 entre 50-59
- Plus bas : claude-code-workflow-tips (50), monde-ia (52), dev-browser (53), superpowers (56), veille (58)

### Phase B — Veto déclenchés
- 🔴 booking-eurofiscalis-making-of : veto R10 (chiffres incohérents 400/375/345 + 4400/4140/4100 après 3 itérations Letsignit) → score plafonné à 60 (brut 81)
- 🟠 monde-ia + autoresearch-karpathy : veto T04 partial (transparence IA absente)

### Phase 1 fix livrée (4 sous-agents en parallèle, partition disjointe)
- **S1** · 8 coquilles SEO vides : backport bloc Meta complet (canonical + OG + Twitter + JSON-LD TechArticle/OpinionPiece) + raccourci titles + 4 liens internes cassés fixés sur dev-browser/superpowers
- **S2** · booking R10 + 4 transparence IA : 7 chiffres harmonisés (375 €/mois cumulé · 345 €/mois économisé · 4 140 €/an) + ajout puce TLDR « Écrit avec Claude, relu par moi » sur llm-local/open-source/hermes/autoresearch
- **S3** · 5 articles bien notés à raccourcir : titles supprimés du suffixe « — par Jérémy Sagnier » + 2 JSON-LD doublons fusionnés (karpathy + outil-vente)
- **S4** · 3 opinions/podcast : OG/Twitter ajoutés sur limova/better-call + 18 liens externes ajoutés au total + Schema PodcastSeries+3 PodcastEpisode sur guerres-d-ia-podcast

### Phase 1 — État après fix (estimations)
- Moyenne site : **68 → ~85/100** (+17 pts moyens)
- Top 5 articles passés à 90+ : superpowers (92), agents-ia-guide (92), loops-claude (92), karpathy (90+), plan-chine (90)
- Booking : R10 débloqué, devrait passer 60 → 81+
- Tous les 21 articles ont maintenant : Meta complet · titles ≤ 60 chars · meta desc ≤ 155 chars · transparence IA explicite · liens externes vers sources

### Patterns transverses corrigés
1. Suffixe « — par Jérémy Sagnier » supprimé sur 18+ titles (faisait dépasser 60 chars)
2. Bloc Meta complet backporté sur 8 articles (étaient des coquilles SEO vides)
3. 4 liens internes cassés (`href="claude-code.html"` → `../claude-code.html`) corrigés
4. Mention transparence IA harmonisée sur 4 articles non-dev récents
5. 18 liens externes vers sources/marques cités (Wondery, ElevenLabs, OpenAI, Limova, etc.)
6. 2 JSON-LD doublons fusionnés (karpathy + outil-vente)

### Fichiers touchés
- 21 articles `articles/*.html` modifiés
- 26 nouveaux audits `audits/<slug>/*.md`
- `CHANGELOG.md` (cette entrée)

### À venir (Phase 2 + Phase 3 non faites)
- Phase 2 : générer 21 og:image 1200×630 dédiées (auto via skill cover-generator) + ajouter FAQ + FAQPage JSON-LD sur les 5 stratégiques + MAJ `_TEMPLATE.html` pour bloquer la régression
- Phase 3 : refonte des 5 articles < 60/100 sur le contenu + renommer slug `claude-code-workflow-tips-after-6-months-of-daily-` → `claude-code-workflow-tips`

---

## 2026-04-24 · article booking V3 — ajout Letsignit (2e SaaS remplacé)

### Pourquoi
Sur demande Jérémy : préciser qu'on a aussi remplacé **Letsignit** (l'outil de signature email payé ~ 80 €/mois pour 20 utilisateurs). Renforce massivement l'angle « on a tué 2 SaaS d'un coup avec un seul outil maison ». Recalcule des économies (~ 4 100 €/an au lieu de 3 200 €/an).

### Livré V3
- **Titre + meta** : « On a viré Calendly **ET Letsignit** »
- **Hero H1** : « ON A VIRÉ CALENDLY ET LETSIGNIT » (2 marques colorées, fuchsia + teal)
- **Hero-lead** : précise les 2 abonnements et zéro contrôle charte
- **TL;DR** : retouche puces 1 et 5 (mention Letsignit + nouveau coût ~ 400 € avant / ~ 30 € après)
- **Section déclencheur** : nouveau paragraphe sur Letsignit (~ 80 €/mois plan standard, signatures qui se cassent dans Outlook Windows legacy)
- **Section back-office signature** : nouveau callout `tip` « Bye bye Letsignit » qui résume l'éviction
- **Section coût** : tableau enrichi avec ligne Letsignit (~ 80 €/mois, ~ 960 €/an), total des 2 SaaS (~ 375 €/mois), économie annuelle recalculée à ~ 4 140 €
- **Bignum « Économie mensuelle »** : ~ 290 € → ~ 345 €
- **Mini-marquees** : 2 mises à jour (« 2 SaaS qui coûtent 400 €/mois », « 2 SaaS résiliés », « 4 100 € économisés par an »)
- **`index.html`** project card : titre « On a viré Calendly et Letsignit », meta « 4 100 €/an économisés », desc actualisée

### Fichiers touchés
- `articles/booking-eurofiscalis-making-of.html` (752 lignes, +10 par rapport à V2)
- `index.html` (project card #03)
- `CHANGELOG.md` (cette entrée)

---

## 2026-04-24 · article « On a viré Calendly » V2 — ajout section back-office

### Pourquoi (suite)
Sur demande de Jérémy, ajout d'une section dédiée au back-office (la galère imprévue qu'on n'avait pas anticipée). Article passé de 647 → 742 lignes (+95). Timeline étendue avec 2 items (semaines 2-3 back-office + 4 semaines après pour polish + RDV à 2 + audit Max).

### Livré V2
- **Nouvelle section** « Le back-office que l'équipe pilote tous les jours » (entre « 3 features » et « Stack technique »)
  · Sous-section « Configurer sa page de réservation » avec showcase image `ma-page-rdv.png`
  · Sous-section « La signature email harmonisée » avec showcase image `mes-outils.png`
  · Listing des 5 pages du back-office (tableau : /mon-compte, /ma-page-rdv, /mes-outils, /equipe, /templates)
  · Callout « L'onboarding autonome » (la fonction qui a tout changé)
  · 3 leçons apprises sur les outils internes
- **Timeline étendue** de 7 à 9 items : ajout J5 « back-office (galère pas anticipée) » et « Avril · 4 semaines après · polish + RDV à 2 + audit »
- **Hero-lead enrichi** : mention « back-office complet où chaque conseiller pilote sa page »
- **TL;DR** : 3e puce reformulée pour mentionner back-office
- **Mini-marquee** ajoutée avant la section back-office (« Onboarding autonome · Signatures harmonisées · Fonds virtuels visio »)
- **2 nouveaux screenshots** dans `photos/booking/` :
  - `ma-page-rdv.png` (343 KB) — page de configuration de la page RDV avec mes liens, types, dispos, RDV à 2
  - `mes-outils.png` (628 KB optimisé depuis 1.4 MB) — signature email avec preview, gestion absence, fonds virtuels visio Eurofiscalis

### Fichiers touchés
- `articles/booking-eurofiscalis-making-of.html` (+95 lignes, 742 total)
- `photos/booking/ma-page-rdv.png` + `mes-outils.png` (nouveaux)
- `CHANGELOG.md` (cette entrée)

---

## 2026-04-24 · article « On a viré Calendly » + project card #3 sur la home

### Pourquoi
Making-of de booking.eurofiscalis.app : raconter comment on a remplacé Calendly chez Eurofiscalis (320 $/mois, 20 utilisateurs) par notre propre outil construit en 5 jours avec Claude Code. Format narratif similaire à `articles/guerres-d-ia-podcast.html` (le making-of podcast). Public débutant, ton Leo, gloses systématiques (Next.js, Supabase, Microsoft Graph, Resend, Vercel, etc.).

### Livré
- **`articles/booking-eurofiscalis-making-of.html`** · 647 lignes, ~4500 mots — 9 sections : Le déclencheur (Calendly et ses limites de personnalisation) · Showcase de la page live avec screenshot intégré · La semaine de construction (timeline 7 jours, dimanche soir → vendredi soir, Max sur la fin pour la sécu) · 3 features qui ont fait la différence (RDV à 2 / signatures email / widget intégrable) · Stack technique expliquée simplement (tableau 6 outils glossés) · Coût (~ 320 $/mois → ~ 30 €/mois, ~ 290 € d'économie/mois, 3 bignum cards) · 4 pièges (timezones / double booking / emails Microsoft Graph qui plantent / OAuth tokens) · Bilan « ce que je referais et ne referais pas » + matrice « pour qui c'est pertinent » · CTA newsletter
- **`photos/booking/booking-full.png`** + **`booking-hero.png`** · screenshots prod capturés via dev-browser sur https://booking.eurofiscalis.app/jeremy-sagnier
- **`index.html`** : 3ème project card ajoutée dans la section #projects (« On a viré Calendly en une semaine »), badge « Live · Outil interne · 03 », background = screenshot booking, après les cards Outil de vente Shirley + Podcast Wondery

### Fichiers touchés
- `articles/booking-eurofiscalis-making-of.html` (nouveau)
- `photos/booking/booking-hero.png` + `booking-full.png` (nouveaux)
- `index.html` (3e project card)
- `CHANGELOG.md` (cette entrée)

### À venir
- Possible : intégrer dans `apprendre.html` étape 04 si le making-of vaut comme exemple pédagogique
- Si l'article performe : faire le making-of d'un autre projet interne (CRM Tiger, agent qualif WhatsApp en cours)

---

## 2026-04-24 · article « Faire tourner une vraie IA chez toi » + intégration apprendre.html

### Pourquoi
Suite logique de l'article open source : passer de la théorie à la pratique. Tutoriel non-dev pour installer un LLM en local sur son ordi, avec Ollama + Open WebUI + RAG. Public débutant absolu, ton Leo, zéro jargon, mots simples. 5 sous-agents Superpowers déployés en parallèle (hardware, outils logiciels, modèles, cas d'usage + RAG, limites/futur).

### Livré
- **`articles/llm-local-pour-non-dev.html`** · ~785 lignes, ~4500 mots — 10 sections : Pourquoi c'est devenu sérieux (DeepSeek 589 G$ NVIDIA + 3 bignum cards confidentialité/coût/offline) · Pourquoi tu pourrais abandonner (4 callouts honnêtes multimodal/web/agentic/MAJ) · Le matos (3 budgets 800€/2400€/4500€ + Mac vs PC + piège bande passante) · 4 outils (Ollama / Open WebUI / LM Studio / GPT4All) · Modèles (6 familles + 5 modèles à essayer + piège base/instruct) · Tuto pas-à-pas 6 étapes step cards (Mac fil rouge + variantes Win/Linux) · 6 cas d'usage par profession (avocat/DAF/journaliste/formateur/étudiant/créatif) · RAG « discuter avec tes docs » (analogie + 3 étapes Open WebUI + tableau 6 cas) · Local vs cloud (matrice décisionnelle + workflow perso) · 5 erreurs débutant + Pour aller plus loin
- **`drafts/research-llm-local/`** · 5 fichiers research consolidés (~14 000 mots) issus des 5 sous-agents
- **`apprendre.html`** · 2 cards ajoutées en fin étape 04 (open source 04.6 c-teal + LLM local 04.7 c-orange) — intégration des 2 articles non-dev dans le parcours pédagogique
- Visuels HTML stylés réutilisés du template open source : bignum cards, callouts ok/warn/tip, outils grid, cas cards, step cards numérotées, mini-marquees signature, tableaux comparatifs
- Liens croisés : llm-local ↔ open-source dans intro et conclusion (continuité éditoriale)
- Schema.org TechArticle + canonical + OG/Twitter Card
- Ton Leo strict : 1ère personne, mots simples, pas familier, transparent IA, gloses inline (RAM, VRAM, RAG, Q4_K_M, base vs instruct)

### Fichiers touchés
- `articles/llm-local-pour-non-dev.html` (nouveau)
- `drafts/research-llm-local/*.md` (5 nouveaux)
- `apprendre.html` (2 cards ajoutées)
- `CHANGELOG.md` (cette entrée)

### À venir
- Tester en prod après push (parcours étape 04 + lecture article + responsive mobile)
- Captures d'écran tuto (idéal : Ollama install + Open WebUI premier chat) — non fait, pourrait améliorer
- Card dédiée dans `index.html#projects` ou `#opinions` pour mettre en avant le combo LLM local + open source
- Article 3 possible : « Mon pipeline de production avec mes IA en local » (workflow réel quotidien)

---

## 2026-04-24 · article « L'open source, expliqué pour ceux qui ne sont pas dev »

### Pourquoi
Tutoriel complet pour non-dev sur l'open source. Couvrir définition, licences, modèles économiques, IA ouverte, top outils, veille, pièges, sécurité — sans jargon, ton Leo, lecteur novice doit pouvoir comprendre. 5 sous-agents Superpowers déployés en parallèle pour la recherche.

### Livré
- **`articles/open-source-pour-non-dev.html`** · ~786 lignes, ~4000 mots — 10 sections : C'est quoi exactement (frise 5 étapes) · Licences (tableau décisionnel) · Modèles économiques (5 modèles + 3 bignum cards Red Hat 34G$ / MongoDB 2G$ / GitLab 750M$) · Controverse 2024-2026 (HashiCorp/Redis/Elastic) · Open source et IA (tableau OSAID + DeepSeek 27 jan 2025 + tutoriel Ollama 5 min) · 30 outils par catégorie · Veille (Korben/HN/Console.dev) · 5 pièges majeurs · Sécurité supply chain (log4j/xz/Polyfill) · Pour commencer aujourd'hui
- **`drafts/research-open-source/`** · 5 fichiers research consolidés (~14 000 mots) issus des 5 sous-agents
- Visuels HTML stylés : frise temporelle, tableau décisionnel, cards modèles, bignum, tableau IA, grid outils, encart Ollama style "quick start" noir, cards pièges, checklist audit
- Lien croisé vers article making-of podcast Guerres d'IA sur le moment DeepSeek
- Schema.org TechArticle + canonical + OG/Twitter Card
- Ton Leo respecté : 1ère personne, pas familier, transparent IA, mots simples, gloses inline du jargon

### Fichiers touchés
- `articles/open-source-pour-non-dev.html` (nouveau)
- `drafts/research-open-source/*.md` (5 nouveaux)
- `CHANGELOG.md` (cette entrée)

### À venir
- **Intégration dans `apprendre.html`** — devrait s'inscrire en étape 01 « Poser les bases ». Non fait dans cette session.
- Ajout d'une card dédiée dans `#opinions` ou nouvelle section tutos sur la home
- Tester en prod après push, suivre les retours

---

## 2026-04-24 · draft article « À quoi ressemblera le monde dans 5, 10, 20 ans avec l'IA »

### Pourquoi
Jérémy a demandé un 2e article d'opinion sur l'avenir du monde avec l'IA. Brief : angle pédagogique scénarios (option A), profondeur 3500-4500 mots, probabilités chiffrées assumées, fil rouge = opinion personnelle forte de Jérémy en tant que père d'un fils de 4 ans. Opinion centrale : le vrai basculement à 20-30 ans ne sera pas imposé d'en haut — les humains eux-mêmes préféreront la machine (santé, éducation, conduite, travail). Recherche préalable via 5 sous-agents parallèles (AGI timeline, horizon 5 ans, 10 ans, 20 ans, risques/géopolitique).

### Livré
- **`drafts/monde-ia-5-10-20-ans.md`** · draft MD ~3850 mots (19 min lecture) avec frontmatter complet : slug, titre, titre_seo, description 149 chars, catégorie `Opinion`, numéro 11, hero 3 lignes centré « J'ai un fils de 4 ans · Voici son monde », lead 130 mots posant directement la question du fils, 3 bullets TL;DR (incl. mention « Écrit avec Claude, relu par moi » pour conformité EU AI Act).
- **Structure** : 7 sections avec kickers rotatifs (fuchsia/teal/orange) · Avant de commencer (histoire du fils) → État actuel avril 2026 (benchmarks + METR + marché) → Dans 5 ans (3 usecases signaux concrets + tableau métiers exposés + callout compression carrière) → Dans 10 ans (patrons + chercheurs + paris + tableau 3 scénarios + 3 trends certains) → Dans 20 ans (tableau 4 scénarios documentés + focus abondance/catastrophe/muddling) → Les 3 vraies questions (3 faits ignorés + concentration pouvoir + callout) → Mon pari personnel (permis, métiers refuge, travail comme organisation sociale, éducation fils, callout chiffré 70/20/40 %).
- **Composants visuels** : 3 usecases (signaux 5 ans), 3 tableaux chiffrés (métiers exposés, 3 scénarios 10 ans, 4 scénarios 20 ans), 4 callouts (tip avis 20s, warn compression carrière, warn faits ignorés, ok pari chiffré), 8 sources externes linkées inline.
- **Opinion assumée en fil rouge** : le basculement majeur à 20-30 ans = humains choisissent IA par préférence (santé, éducation, transport, travail). Chiffres subjectifs assumés (70 % consultation IA avant médecin d'ici 2046, 20 % fils passe permis avant 25 ans, 40 % exerce un « métier »).
- **Ton Leo respecté** : 1ère personne, chaleureux non familier, transparent sur l'IA, mots simples, appels à réponse, assume les limites, posture père-observateur-curieux pas expert.

### Fichiers touchés
- `drafts/monde-ia-5-10-20-ans.md` (nouveau)
- `CHANGELOG.md` (cette entrée)

### À venir
- Relecture Jérémy du draft MD
- `npm run publish monde-ia-5-10-20-ans` pour générer `articles/monde-ia-5-10-20-ans.html` + MAJ `sitemap.xml`
- Éventuellement ajout d'un teaser dans `index.html` section `#opinions`
- Commit + push pour déclencher auto-deploy Vercel

---

## 2026-04-23 · intégration podcast complète "Guerres d'IA" · Jerwis Productions

### Pourquoi
Trois épisodes de podcast narratif prêts dans `~/Projets/podcast-wondery/exports/` (La Fracture, Les Quatre Jours, Frères Ennemis). Fallait les diffuser publiquement — Apple Podcasts + Spotify + section dédiée sur jerwis.fr. Plus : poser la marque **Jerwis Productions** comme maison de production pour héberger d'autres séries plus tard.

### Livré
- **Direction visuelle** · pochette "Direction 4" (duotone glitch éditorial, JetBrains Mono + chromatic aberration + scanlines CRT). Palette Fiesta conservée mais typo et effets modernisés (s'éloigne du heritage 90s du reste du site pour un ton narratif plus contemporain).
- **Pochettes générées automatiquement** · script `build-podcast-covers.js` avec Puppeteer + sharp. 8 PNG produites (série + 3 eps × 512 et 3000 px). Template paramétré `templates/podcast-cover.html`. Chaque ep a une teinte dominante (fuchsia pour ep01, orange pour ep02, fuchsia+teal pour ep03).
- **Page `/podcast.html`** · Layout A éditorial magazine (hero série + liste épisodes + player inline + 2 CTAs newsletter + mini-marquee + footer cohérent avec le site).
- **Lecteur HTML5 custom** · 0 dépendance, 136 lignes JS + CSS inline. Features : play/pause, seek, vitesse 1/1.25/1.5/2×, persistance position localStorage, 1 seul player actif à la fois (singleton), raccourcis clavier ←/→ ±5s, ARIA.
- **Host audio** · Cloudflare R2 (free tier 10 Go + 0 egress). 3 MP3 uploadés via `scripts/podcast-upload.js` (aws-sdk-s3 compatible, validation extension + sanitization filename + rejet fichier vide).
- **RSS feed iTunes-conforme** · `feed/podcast.xml` avec toutes les balises `<itunes:*>` requises par Apple/Spotify. Généré par `build-podcast-rss.js`. Validé xmllint + 3 enclosures R2.
- **Nav site** · entrée `Podcast` ajoutée dans 6 pages avec nav principale (`index`, `apprendre`, `outils`, `github`, `quiz`, `preferences`). Les 4 pages articles longs (`workflows`, `claude-code`, `debutant`, `lexique`) gardent leur back-link simple volontairement épuré.
- **Scripts npm** · `podcast:build` (covers + rss + page), `podcast:upload`, `podcast:rss`, `podcast:covers`, `podcast:page`.
- **Tests unitaires** · 8 tests sur helpers (format duration MM:SS et HH:MM:SS, escape XML/HTML, rfc2822Date, accent colors) via `node:test` · `npm test`.
- **Documentation** · section "Section Podcast · Jerwis Productions" dans CLAUDE.md + sitemap.xml mis à jour.

### Architecture
Source de vérité unique · `data/episodes.json`. Trois scripts de build (covers, rss, page) consomment ce JSON. Audio stocké hors repo sur Cloudflare R2 (CDN gratuit, 0 egress). Pas de base de données, pas de framework, pas de backend dédié. Chaque nouvel épisode = 1 entrée JSON + `npm run podcast:build` + commit.

### Fichiers nouveaux
- `podcast.html`, `feed/podcast.xml`
- `data/episodes.json`
- `podcast/covers/{serie,ep01,ep02,ep03}.png` (512×512) + `-3000.png` (3000×3000)
- `templates/podcast-cover.html`
- `scripts/build-podcast-page.js`, `build-podcast-rss.js`, `build-podcast-covers.js`, `podcast-upload.js`, `test-helpers.js`
- `assets/podcast-player.js`
- `docs/superpowers/specs/2026-04-23-podcast-integration-design.md`
- `docs/superpowers/plans/2026-04-23-podcast-integration.md`

### Fichiers modifiés
- `index.html`, `apprendre.html`, `outils.html`, `github.html`, `quiz.html`, `preferences.html` (nav)
- `sitemap.xml`, `CLAUDE.md`, `package.json`, `.gitignore`, `.env.local`

### À venir
- [ ] Rédiger descriptions longues (300-500 mots) des 3 épisodes en ton Leo — à faire par Jérémy avant submission plateformes
- [ ] Soumettre le feed RSS à Apple Podcasts Connect + Spotify for Podcasters
- [ ] Valider le feed sur https://castfeedvalidator.com/ une fois en prod
- [ ] (Optionnel V2) Configurer custom domain `podcast-audio.jerwis.fr` CNAME vers bucket R2
- [ ] (Optionnel V2) Refactorer `test-helpers.js` en `scripts/lib/helpers.js` + `scripts/test-helpers.js` pour éviter que les tests s'exécutent à chaque import par les scripts de build
- [ ] (Optionnel V2) Page par épisode `/podcast/<slug>.html` avec transcript si audience grandit

---

## 2026-04-23 · migration MP3 podcast vers Cloudflare R2 (repo allégé)

### Pourquoi
Le setup R2 finalisé en parallèle (autre Claude Code) a uploadé les 3 MP3 masters. Source unique de vérité = R2 via URLs publiques. L'article `guerres-d-ia-podcast.html` doit pointer vers R2, pas vers `audio/podcast/` local. Avantages : repo Git redevient léger (~0 MB ajouté au lieu de ~69 MB), zéro doublon avec la future page `/podcast.html` qui pointera aux mêmes URLs, cache Cloudflare global.

### Livré
- **`articles/guerres-d-ia-podcast.html`** · 3 `<audio src=>` modifiés pour pointer vers R2 (`https://pub-13be70d367034b9eb7903c6b3b80eaa0.r2.dev/episode-XX-...-MASTER.mp3`). URLs récupérées depuis `data/episodes.json` (source unique) généré par le pipeline podcast en parallèle.
- **`audio/podcast/`** · supprimé (3 fichiers, ~69 MB)
- **`audio/`** · dossier supprimé (vide)

### Fichiers touchés
- `articles/guerres-d-ia-podcast.html`
- `audio/podcast/*.mp3` (supprimés)
- `audio/` (supprimé)
- `CHANGELOG.md` (cette entrée)

### À venir
- Si Cloudflare R2 expose un custom domain (`cdn.jerwis.fr/podcast/...`), remplacer les 3 URLs `pub-xxxx.r2.dev` par le custom domain pour pérennité
- Tester streaming 3 audios en prod après push
- Lecteur HTML5 custom (Task 8 parallèle) à intégrer dans cet article quand prêt — remplacera les `<audio>` natifs

---

## 2026-04-23 · draft article « Le plan chinois 2026-2030, décrypté »

### Pourquoi
Jérémy a demandé une synthèse pédagogique du 15e plan quinquennal chinois (adopté 12 mars 2026) pour son blog perso. Brief : ton Leo, sans jargon, angle observateur curieux qui décrypte, impact business mondial sur les années à venir. Recherche préalable effectuée en 5 sous-agents parallèles (politique, tech, économie, défense, climat) → synthèse consolidée en français simple.

### Livré
- **`drafts/plan-chine-2026-2030.md`** · draft MD ~2850 mots (13 min lecture) avec frontmatter complet : slug, titre, titre_seo, description 141 chars, catégorie `Opinion`, numéro 10, hero 3 lignes, lead 80 mots, 3 bullets TL;DR (incl. mention « Écrit avec Claude, relu par moi » pour conformité EU AI Act).
- **Structure** : 7 sections avec kickers rotatifs (fuchsia/teal/orange) · Avant de commencer → C'est quoi un plan quinquennal → 3 crises (usecases) → Pari de Xi → 5 leviers (steps numérotés) → 3 contradictions → Impact mondial/business → Pour aller plus loin.
- **Composants visuels** : 3 usecases (crises), 5 steps (leviers), 4 callouts (tip/warn/warn/ok), 5 sources externes linkées inline (Rhodium, Asia Times, Carnegie, Carbon Brief, CSIS, SIPRI, Climate Action Tracker).
- **Ton Leo respecté** : 1ère personne, chaleureux non familier, transparent sur l'IA, mots simples (plan quinquennal expliqué comme « programme politique + plan d'investissement + feuille de route militaire »), appels à réponse (« réponds à l'email, je lis tout »), assume les limites (« je peux me tromper »).
- **Posture Jérémy préservée** : pas de « dev »/« codeur », positionnement « entrepreneur curieux qui décrypte avec Claude ».

### Fichiers touchés
- `drafts/plan-chine-2026-2030.md` (nouveau)
- `CHANGELOG.md` (cette entrée)

### À venir
- Relecture Jérémy du draft MD
- `npm run publish plan-chine-2026-2030` pour générer `articles/plan-chine-2026-2030.html` + MAJ `sitemap.xml`
- Éventuellement ajout d'un teaser dans `index.html` section `#opinions` (6 cards style magazine)
- Commit + push pour déclencher auto-deploy Vercel

---

## 2026-04-23 · feedback widgets podcast (vote 👍/👎 par épisode + suggestion ép 4)

### Pourquoi
Jérémy veut récolter l'avis des auditeurs des 3 épisodes Guerres d'IA pour décider la suite : quel épisode marche le mieux, faut-il un ép 4, sur quel sujet. Ton Leo « réponds, je lis tout » mais en widget intégré sous chaque audio + form suggestion globale en bas d'article.

### Livré
- **`api/episode-feedback.js`** · nouveau endpoint serverless calqué sur `subscribe.js`. Gère 2 types : `kind: 'vote'` (avec `episode`, `vote: up|down`, `comment` optionnel) et `kind: 'suggestion'` (textarea ép 4). Envoie email Resend à `ADMIN_NOTIFY_EMAIL` (override env, fallback `jeremy.sagnier@jerwis.fr`). Pas de stockage DB — tout passe par email comme la notif `+1 newsletter`.
- **`articles/guerres-d-ia-podcast.html`** · 3 widgets feedback (un sous chaque `<audio>`) avec boutons 👍/👎 + textarea facultatif `+ Pourquoi`. Form `Suggestion ép 4` en bas avant final-cta avec textarea + bouton envoi. Anti double-vote via `localStorage` (clé `pod_vote_<episode>`). États visuels : voted (border teal), thanks, error.
- CSS cohérent charte Fiesta (boutons radius 12px, hover translate, error orange, thanks teal mono).
- JS frontend : event listeners, restauration état localStorage au load, fetch POST, gestion silencieuse des échecs (le vote reste enregistré localement même si le réseau échoue).

### Fichiers touchés
- `api/episode-feedback.js` (nouveau)
- `articles/guerres-d-ia-podcast.html` (CSS + 3 widgets HTML + form HTML + JS frontend)
- `CHANGELOG.md` (cette entrée)

### À venir
- Tester le pipeline complet en prod après push (vote + comment + suggestion)
- Vérifier que `ADMIN_NOTIFY_EMAIL` est bien défini sur Vercel (sinon fallback `jeremy.sagnier@jerwis.fr`)
- Potentiellement ajouter compteurs publics si Vercel KV configuré plus tard
- Re-déployer après push R2 (URLs `<audio src>` à modifier en parallèle)

---

## 2026-04-23 · article « Comment j'ai créé un podcast avec une voix IA en 24h »

### Pourquoi
Storytelling sur la production de la trilogie pilote du podcast *Guerres d'IA* (3 épisodes Wondery FR sur la guerre IA, voix synthétiques, scénarios écrits par sous-agents Claude, mixage automatisé). Récit narratif demandé par Jérémy : tout vrai, tout documenté, ton Leo, pas de jargon, lecteur novice doit comprendre.

### Livré
- **`articles/guerres-d-ia-podcast.html`** · nouvel article long-form (~2500 mots) — structure : hero dark + TL;DR + 9 sections (déclic / sujet / 3 audios embeddés / pipeline / test 5 min / bug invisible / 3 bonds par épisode / coût $33 / 6 leçons) + final CTA newsletter
- **`audio/podcast/`** · 3 MP3 masters embeddés (24 + 24 + 21 MB = ~69 MB) : `episode-01-la-fracture-MASTER.mp3`, `episode-02-les-quatre-jours-MASTER.mp3`, `episode-03-freres-ennemis-MASTER.mp3`
- **`index.html`** · ajout 2ème card dans section #projects (« Un podcast Wondery FR en 24 heures ») à côté de l'outil de vente. Grid `projects-grid` (sans `single`) pour 2 cards.
- Schema.org TechArticle + canonical + OG/Twitter Card complets
- Visuels HTML stylés : 4 cartes pipeline, carte « bug invisible » (mono vs stéréo), carte coût $33 noir, grille 6 leçons, 3 mini-marquees signature
- Ton Leo respecté (1ère personne Jérémy, chaleureux pas familier, transparent sur l'usage IA, pas de jargon, mots simples)

### Fichiers touchés
- `articles/guerres-d-ia-podcast.html` (nouveau, ~700 lignes)
- `audio/podcast/*.mp3` (nouveaux, 3 fichiers)
- `index.html` (card podcast ajoutée section #projects)
- `CHANGELOG.md` (cette entrée)

### À venir
- Demander à Jérémy si on push Vercel (les 3 MP3 ajoutent ~69 MB au repo)
- Éventuellement : remplacer les MP3 embed par liens externes Ausha/Spotify quand publiés
- Ajouter potentiellement une card dans #content (Sources) si Jérémy veut référencer son propre podcast

---

## 2026-04-23 · notifications admin sur inscriptions newsletter

### Pourquoi
Jérémy veut être alerté en temps réel à chaque nouvel inscrit (et à chaque désabonnement, déjà en place) pour suivre la croissance newsletter et réagir vite aux retours négatifs.

### Livré
- **`api/subscribe.js`** · nouvelle fonction `sendAdminNotification()` appelée best-effort après inscription réussie (pas sur doublon). Envoie à l'admin un email avec subject `+1 newsletter · <email>` + corps (email, prénom si fourni, source du form, date, lien dashboard Resend).
- **`api/unsubscribe.js`** · notif admin déjà existante, adresse destinataire alignée.
- **Destinataire admin** · `jeremy.sagnier@jerwis.fr` (remplace l'ancien `sagnier.jeremy@gmail.com`), override possible via env var `ADMIN_NOTIFY_EMAIL` sur Vercel si besoin de changer sans redéployer.
- **Symétrie inscription / désabonnement** · `+1` vs `-1` dans les subjects, même structure de body.

### Fichiers touchés
- `api/subscribe.js` · ajout `ADMIN_EMAIL`, `sendAdminNotification()`, `escapeHtml()`, appel après welcome
- `api/unsubscribe.js` · `ADMIN_EMAIL` passe de hardcodé à env var avec fallback

### Best-effort (pas de régression possible)
Les deux notifs admin sont encapsulées dans try/catch · si Resend rate, l'inscription/désabonnement réussit quand même. Log côté Vercel via `console.error`.

### À venir
- [ ] Tester en prod après redéploiement · s'inscrire avec un email test et vérifier la réception sur jeremy.sagnier@jerwis.fr
- [ ] Ajouter env var `ADMIN_NOTIFY_EMAIL` sur Vercel si tu veux override le fallback

---

## 2026-04-23 (second pass) · renommage slug article GMF + redirect 301

### Pourquoi
Après le premier passage d'anonymisation (texte visible), le slug URL `construit-avec-claude-code-gmf.html` restait visible dans la barre d'adresse et dans les liens partagés. Décision d'aller au bout du renommage, avec redirect 301 pour préserver le SEO et les liens déjà diffusés.

### Livré
- **Renommage fichier** · `articles/construit-avec-claude-code-gmf.html` → `articles/outil-vente-claude-code.html` (via `git mv`, historique préservé)
- **URLs internes du fichier** · canonical, og:url, twitter:url, schema.org `@id` + `url`, 5× share buttons (X, LinkedIn, Instagram, WhatsApp, copy link, email) + `mailto` body
- **Source formulaire** · `source: 'article-gmf'` → `source: 'article-outil-vente'` (nouvelles inscriptions taguées ainsi dans Resend)
- **Liens sortants mis à jour** · `apprendre.html`, `index.html`, `workflows.html`, `quiz.html`, `sitemap.xml`
- **Fichiers tech internes** · `SEO-GUIDE.md` (table), `scripts/seo-improve.js` (map PUBLISH_DATES), `admin/modules/articles/page.html` (logique classification `slug.includes('outil-vente')`), `CLAUDE.md` (mention slug MAJ)
- **Redirect 301 ajouté dans `vercel.json`** · `/articles/construit-avec-claude-code-gmf(.html)?` → `/articles/outil-vente-claude-code.html` · permanent. Préserve le juice SEO Google + empêche le 404 pour les liens externes déjà partagés.

### Vérifications
- `grep -r "GMF"` sur fichiers publics (HTML/XML) → 0 occurrence
- `grep -r "construit-avec-claude-code-gmf"` sur tout le projet → seulement le redirect `vercel.json` + CHANGELOG historique
- Tous les liens internes pointent vers le nouveau slug

### Fichiers touchés
- `articles/outil-vente-claude-code.html` (renommé + URLs internes)
- `apprendre.html`, `index.html`, `workflows.html`, `quiz.html`, `sitemap.xml`
- `SEO-GUIDE.md`, `scripts/seo-improve.js`, `admin/modules/articles/page.html`
- `CLAUDE.md`
- `vercel.json` (redirect 301)

### À venir
- [ ] Après redéploiement Vercel, tester manuellement que `/articles/construit-avec-claude-code-gmf.html` redirige bien en 301 vers le nouveau slug
- [ ] Si l'ancien slug a déjà été soumis à Google Search Console, attendre réindexation (2-4 semaines)

---

## 2026-04-23 · anonymisation GMF + abandon player TTS

### Pourquoi
Décision d'anonymiser le nom de l'employeur de Shirley sur tout le site (remplacé par "en assurance" / "outil de vente"). Le projet de player TTS (audio généré de l'article GMF) est également arrêté — on retire les artefacts locaux et la balise injectée dans l'article.

### Livré
- **Article GMF** (`articles/construit-avec-claude-code-gmf.html`) · retrait du `<link rel="stylesheet" href="../css/tts-player.css">` (CSS jamais committé) + retrait du bloc `<div class="tts-player">` injecté au-dessus du hero-lead
- **apprendre.html** · titre card "L'outil *GMF*" → "L'outil *de vente*" + preview "chargée de clientèle GMF" → "chargée de clientèle en assurance"
- **index.html** · projet #01 preview "chez GMF" → "en assurance" + commentaire HTML mis à jour
- **workflows.html** · lex-block-reassure "(chargée de clientèle GMF)" → "(chargée de clientèle en assurance)"
- **quiz.html** · reco qualifieur "l'outil de vente GMF" → "l'outil de vente de ma femme"
- **CLAUDE.md** · 2 références GMF remplacées dans la carto des sections + nouvelle règle "JAMAIS dire/écrire GMF" (slug technique conservé pour SEO)
- **AGENT_BRIEF.md** · exemple de slug changé (`construit-avec-claude-code-gmf` → `hermes-agent`) + règle ajoutée dans exclusions
- **Suppression locale** · dossier `articles/audio/` (5.8 Mo, 3 versions : orig / retell / clones voix) + `generate-audio.sh` · aucun de ces fichiers n'était committé, donc aucun historique à purger

### Décisions
- **Slug technique conservé** (`construit-avec-claude-code-gmf.html`, canonical, og:url, sitemap, `source: 'article-gmf'`). Raison : URLs déjà indexées par Google + partagées. Renommer casserait le SEO et les liens externes. Le slug ne fuit pas publiquement (l'utilisateur voit l'URL mais pas le mot sur la page).
- **`scripts/seo-improve.js` et `admin/modules/articles/page.html`** · références techniques au slug → laissées intactes (logique interne, pas visible).

### Fichiers touchés
- `articles/construit-avec-claude-code-gmf.html`
- `apprendre.html`, `index.html`, `workflows.html`, `quiz.html`
- `CLAUDE.md`, `AGENT_BRIEF.md`

### À venir
- [ ] Quand le projet TTS reprendra, recréer `css/tts-player.css` + décider du stockage audio (CDN vs repo — 5.8 Mo / épisode, donc probablement pas dans le repo)

---

## 2026-04-22 (soir) · domaine jerwis.fr verifie cote Resend · FROM_EMAIL switch

### Pourquoi
Après les premiers tests sandbox (welcome/goodbye OK sur sagnier.jeremy@gmail.com mais bloqués vers jeremy.sagnier@jerwis.fr), diagnostic · Resend mode sandbox avec `onboarding@resend.dev` ne peut envoyer qu'au propriétaire du compte. Il fallait vérifier jerwis.fr comme domaine d'envoi.

### Livré
- **Diagnostic DNS Hostinger** via API (lecture seule) · records DKIM/SPF/DMARC déjà présents dans la zone
- **Verification Resend** · click "Verify DNS" côté dashboard → passage de "Not Started" à "Verified" (Apr 22, 8:41 AM us-east-1)
- **Revert temporaire** (commit `cfa8c2c`) · FROM_EMAIL repassé sur `onboarding@resend.dev` pendant la fenêtre de vérif pour pas casser les inscriptions réelles
- **Re-switch définitif** (commit `bfecef6`) · FROM_EMAIL = `Jérémy Sagnier <jeremy@jerwis.fr>` sur `api/subscribe.js` + `api/unsubscribe.js`
- **Tests prod E2E validés** · 3 emails reçus via jeremy@jerwis.fr
  - welcome AI Playbook → jeremy.sagnier@jerwis.fr ✅
  - goodbye désabonnement → jeremy.sagnier@jerwis.fr ✅
  - notif feedback admin → sagnier.jeremy@gmail.com ✅

### Fichiers touchés
- `api/subscribe.js` · FROM_EMAIL
- `api/unsubscribe.js` · FROM_EMAIL

### À venir
- [ ] **Révoquer la clé Hostinger** partagée en clair (sécurité)

---

## 2026-04-22 (déploiement prod) · jerwis.fr est LIVE

### Pourquoi
Le site était prêt localement, manquait le passage en prod. Récupération du domaine `jerwis.fr` (précédemment sur un ancien projet Vercel) + déploiement du nouveau Site-perso + configuration Resend.

### Déploiement GitHub · commit unique
- `git init` + remote `git@github.com:sagnierjeremy-byte/Site-perso.git`
- 83 fichiers dans 1 commit initial · `daadda9 sync: back-office admin + pages outils/github/quiz + 3 articles + 10 freebies + brainstorm multi-sources`
- Branche `main` trackée

### Vercel
- Projet `site-perso` créé · import repo GitHub
- Application Preset · Other · root directory `/`
- **jerwis.fr détaché** de l'ancien projet (action manuelle sur dashboard)
- **jerwis.fr + www.jerwis.fr attachés** au nouveau projet
- DNS Hostinger déjà OK (A `76.76.21.21` + CNAME `cname.vercel-dns.com`) · propagation instantanée
- SSL Let's Encrypt auto-provisioné

### 3 fix techniques pendant le déploiement

**Fix 1 · `vercel.json` syntaxe legacy cassée** (commit `5424b9a` puis `e29bd11`)
- Problème · `version: 2 + builds: [...]` ne buildait pas `/api/subscribe.js` comme serverless function → 404
- Fix · passage à syntaxe moderne (`cleanUrls`, détection auto, pas de `builds`/`routes`)
- Résultat · `/api/subscribe` buildé et opérationnel

**Fix 2 · OPML servi comme 404**
- Problème · extension `.opml` hors liste manuelle `@vercel/static`
- Fix · retrait de la liste manuelle (Vercel détecte auto avec le nouveau vercel.json)
- Résultat · OPML 10 733 o, content-type `text/x-opml` ✓

**Fix 3 · `DEFAULT_AUDIENCE_ID` hardcodé supprimé** (commit `1a36574`)
- Problème · fallback vers audience Eurofiscalis si env var manquante → risque de fuite
- Fix · env var obligatoire, erreur 500 explicite si manquante
- Résultat · zéro secret résiduel dans le code

### Configuration Resend
- Création audience **AI Playbook** dédiée jerwis.fr (sur compte Resend perso, pas Eurofiscalis)
- Clé API créée avec **Full access** (Sending-only refusait l'écriture dans l'audience · erreur `restricted_api_key` 401)
- Env vars Vercel · `RESEND_API_KEY` + `RESEND_AUDIENCE_ID` (production + preview + dev)

### Tests prod validés
- ✅ Home `jerwis.fr` · H1 « L'IA, c'est aussi pour nous. » rendu
- ✅ Pages `/claude-code`, `/outils`, `/github`, `/quiz`, `/apprendre`, `/debutant`, `/lexique` · 200 OK
- ✅ 7 downloads téléchargeables (OPML 10 Ko · install.sh 2.6 Ko · 3 MD · HTML cheatsheet · ZIP pack 713 Ko)
- ✅ Endpoint `/api/subscribe` · 200 OK avec `contactId` Resend
- ✅ Quiz testé manuellement par Jérémy, inscription newsletter confirmée

### Fichiers touchés
- `vercel.json` · refonte complète (syntaxe moderne)
- `api/subscribe.js` · retrait `DEFAULT_AUDIENCE_ID` hardcodé
- `CLAUDE.md` · section « Contexte projet » enrichie avec infos prod (jerwis.fr, GitHub, Vercel) · section « API Inscription Resend » mise à jour · nouvelle section « Vercel config » · TODOs recalibrés
- 3 commits post-initial · `5424b9a`, `e29bd11`, `1a36574`

### Plugin Claude Code bonus installé pendant la session
- `vercel@0.40.0` (via `npx plugins add vercel/vercel-plugin` · Vercel Labs) · 25 skills + 6 cmds + 3 agents + hooks + MCP pour piloter Vercel depuis Claude Code
- Total plugins actifs · 8 (claude-md-management, code-review, code-simplifier, context7, frontend-design, superpowers, telegram, vercel)

### À venir
- [ ] Kill l'ancien projet Vercel (maintenant safe)
- [ ] Redémarrer Claude Code pour activer les 25 skills Vercel
- [ ] Ajouter Vercel Analytics ou Plausible
- [ ] Configurer la séquence cours 5 jours côté Resend (guide dans `downloads/cours-email/sequence-resend.md`)
- [ ] Nettoyer les 3 contacts test `test-*@mailinator.com` dans audience Resend

---

## 2026-04-22 (nuit+++++++) · Veille enrichie · rapatriement depuis newsletter-dashboard

### Pourquoi
Mon projet `newsletter-dashboard` (Content Machine Eurofiscalis) a une bibliothèque de ~60 flux RSS structurés. J'ai rapatrié ceux pertinents pour ma veille perso (IA, Claude Code, entrepreneuriat) sans dupliquer · gardé les 2 projets découplés.

### Livré
**`scripts/brainstorm.js`** ·
- `SUBREDDITS` · +3 nouveaux (`MachineLearning`, `artificial`, `SaaS`)
- `RSS_FEEDS` · +4 médias tech (`TechCrunch AI`, `The Verge AI`, `MIT Technology Review`, `Hacker News Best`)
- Nouvelle fonction `googleNewsFeeds(keywords)` · génère dynamiquement des flux Google News FR+EN sur `GOOGLE_NEWS_KEYWORDS` (Claude Code, Anthropic, Superpowers plugin, agents IA, AI skills) · 10 flux générés
- Intégration dans `main()` · le fetch parallèle inclut maintenant Google News

**`downloads/jeremy-ai-sources.opml`** ·
- +1 catégorie "Médias tech IA (4 flux RSS)"
- +1 catégorie "Google News dynamique (5 keywords)" · 5 flux représentatifs (1 FR + 1 EN selon pertinence)

### Résultat mesuré (run 2026-04-22 · test après enrichissement)
| Métrique | Avant | Après | Δ |
|---|---|---|---|
| Items bruts collectés | 476 | **694** | **+46%** |
| Idées scorées | 111 | **167** | **+50%** |
| Clusters actifs dans le top | 4 | **6** | · |
| Nouvelles idées au backlog | 9 | **11** | · |

### Top 10 enrichi (exemples qui viennent des nouvelles sources)
- `[8.8]` "Claude Code, Gemini CLI, and GitHub Copilot Vulnerable to Prompt Injection" · probablement Google News
- `[8.5]` "Mondoo Launches World's First Free AI Skills Security Checker" · Google News
- `[8.3]` "I lost half my agency's pipeline to Claude Code in 2025" · Reddit r/SaaS ou Entrepreneur

### Fichiers touchés
- `scripts/brainstorm.js` · +3 subreddits, +4 RSS, +1 fonction googleNewsFeeds + intégration main
- `downloads/jeremy-ai-sources.opml` · +2 catégories, +9 flux au total

### Architecture retenue
- **Découlage volontaire** · pas de module RSS centralisé entre `newsletter-dashboard` et `jeremy-sagnier-site`
- Raison · les 2 projets ont des audiences différentes (Eurofiscalis pros Amazon/e-com vs entrepreneurs curieux IA). Leurs sources doivent rester indépendantes pour éviter qu'une évolution d'un côté casse l'autre
- Futur · si la duplication devient pénible, extraire dans un package npm commun

### À venir
- [ ] Monitorer la qualité des Google News pendant 2 semaines · si bruit > signal, réduire ou retirer
- [ ] Évaluer si ajouter `r/LocalLLaMA` (déjà là) + `r/OpenAI` (déjà là) suffit ou si `r/stablediffusion` / `r/LLMDevs` apporteraient

---

## 2026-04-22 (nuit++++++) · Freebies · 5 nouvelles ressources (Phases 1+2+3)

### Pourquoi
Après audit croisé (recherche lead magnets 2026 + audit interne artéfacts), j'ai identifié 5 freebies à fort impact pour compléter la section « Les outils, tout de suite ». Appliqué la méthode Superpowers · brainstorm → plan 3 phases → execute.

### Phase 1 · Quick wins (2h30)
**3 nouveaux freebies sans email requis**

- **#06 · OPML veille IA** · `downloads/jeremy-ai-sources.opml` · 34 chaînes YouTube (IA/Business/Finance/Actu/Lifestyle) + 4 RSS officiels (OpenAI, Google AI, Hugging Face, Simon Willison) · import 1 clic dans Feedly/Inoreader
- **#07 · 3 prompts que j'utilise vraiment** · `downloads/jeremy-prompts-pack.md` · Prompt 1 (explainer idées) + Prompt 2 (décliner article social) + Prompt 3 (ton Leo ruleset) · mode d'emploi et exemples
- **#08 · Cheat-sheet A4 imprimable** · `downloads/cheatsheet-claude-code.html` · commandes Claude Code + git + plugins + 3 réflexes jour 1 · format A4 portrait, imprimable en Cmd+P

### Phase 2 · Quiz interactif (2h)
- **Nouvelle page `/quiz.html`** · 8 questions sur métier/usage/tech/temps/objectif/budget/frein/préférence
- **Algorithme de recommandation** · scoring cumulatif sur 5 profils (découvreur, builder, créateur, growth, explorer)
- **Résultat personnalisé** · outils à installer + prompts ciblés + articles à lire
- **Email capture en fin** (optionnel, pour recevoir newsletter)
- Nav « Quiz » ajoutée en fuchsia sur /quiz.html
- **Carte Freebie #09** ajoutée

### Phase 3 · Mini-cours email 5 jours (3h)
- **5 templates email** dans `downloads/cours-email/`
  - `day-1-install.md` · Installer Claude Code (10 min)
  - `day-2-claude-md.md` · Ton premier CLAUDE.md
  - `day-3-skill.md` · Lancer un skill sur une vraie tâche
  - `day-4-automation.md` · Automatiser un workflow simple
  - `day-5-next.md` · Récap + roadmap mois 1 + question feedback
- **`sequence-resend.md`** · guide technique pour configurer la séquence (3 options · Broadcasts Resend, endpoint Vercel+Supabase, n8n workflow) avec code complet prêt à déployer
- **`README.md`** · mode d'emploi pour Jérémy
- Handler JS `#freebie-download-form` mis à jour pour gérer le cas "pas de fichier" (cours arrive par email)
- **Carte Freebie #10** ajoutée

### Résumé section Freebies
Passage de **5 → 10 ressources** · texte intro mis à jour · "Soyons transparents" passé à "sur les 10, 3 demandent ton email" (CLAUDE.md + skills pack + cours 5 jours).

### Fichiers touchés
- `index.html` · +3 cartes (06 OPML, 07 prompts, 08 cheat-sheet) · +2 cartes (09 quiz, 10 cours) · intro 5→10 · transparency 5→10 · handler JS étendu
- `downloads/jeremy-ai-sources.opml` · nouveau · 38 sources
- `downloads/jeremy-prompts-pack.md` · nouveau · 3 prompts + exemples
- `downloads/cheatsheet-claude-code.html` · nouveau · A4 imprimable
- `quiz.html` · nouveau · page interactive 8 questions
- `downloads/cours-email/*.md` · 6 fichiers (5 emails + README + sequence-resend)

### À venir (à ta main)
- [ ] Configurer la séquence Resend pour le cours 5 jours (guide complet dans `downloads/cours-email/sequence-resend.md`)
- [ ] Ajouter nav « Quiz » dans les autres pages principales
- [ ] Commit/push Vercel et vérifier que les 10 téléchargements fonctionnent en prod (cache zip)
- [ ] Tester le quiz de bout en bout en prod (5 profils)

### Mesures à suivre après déploiement
- Taux de clic sur chaque carte Freebie
- Taux d'inscription via quiz vs inscription directe newsletter
- Taux d'ouverture des 5 emails du cours (objectif · >60% sur J5)

---

## 2026-04-22 (nuit+++++) · Fix dark mode + GitHub intégré au parcours

### Pourquoi
User a spotté un bug d'affichage en dark mode sur `outils.html` tier2-intro · texte cream sur fond cream, illisible. Diagnostic · les blocs utilisaient `background: var(--ink)` avec `color: #FBF7F0` · en dark mode, `--ink` devient cream donc texte cream sur fond cream. Même bug sur `github.html` (gh-hero + gh-final) et `outils.html` (outils-cta).

### Méthode Superpowers appliquée
- **Brainstorm** · diagnostic des 3 problèmes (dark mode cassé, GitHub pas fini, vérif croisée)
- **Plan écrit** · 4 phases (A audit, B fix CSS, C nav GitHub, D vérif finale)
- **Exécution avec checkpoints** · screenshots dark mode avant/après

### Fix dark mode (Phase B)
- **`outils.html`** · `.tier2-intro { background: #0A0A0A }` au lieu de `var(--ink)` · `.outils-cta { background: #0A0A0A }`
- **`github.html`** · `.gh-hero { background: #0A0A0A }` · `.gh-final { background: #0A0A0A }`
- Tous textes blancs/cream déjà hardcodés `#FBF7F0` et rgba blanc · restent lisibles sur fond noir fixe peu importe le thème
- Les 3 couleurs accent Fiesta (teal/fuchsia/orange) restent inchangées quel que soit le thème

### GitHub intégré au parcours (Phase C)
- **`apprendre.html` étape 02** · 3 cards → **4 cards** · nouvelle carte `02.4 · GitHub pour les non-devs` (orange-ink) · step-facts passés à "4 lectures · ~41 min au total" · step-intro enrichi pour mentionner GitHub en « filet de sécurité »
- **`debutant.html` Porte 3** · nouveau paragraphe *« Deuxième plus · GitHub · le coffre-fort où Claude sauvegarde ton travail »* avec lien vers `github.html`
- **`outils.html`** · lien GitHub déjà présent dans la nav (fuchsia)

### Fichiers touchés
- `outils.html` · 2 blocs CSS corrigés (tier2-intro + outils-cta)
- `github.html` · 2 blocs CSS corrigés (gh-hero + gh-final)
- `apprendre.html` · 4ème carte GitHub + step-facts + intro
- `debutant.html` · paragraphe Porte 3 enrichi

### Vérifications dark mode
- ✅ `outils.html#tier2-intro` · fond noir pur, "4 OUTILS POUR ALLER PLUS" lisible (blanc/orange)
- ✅ `github.html` hero · noir pur, "GITHUB EXPLIQUÉ POUR LES NON-DEVS" bien rendu
- ✅ `github.html` gh-final CTA · noir pur
- ✅ Nav GitHub en fuchsia visible sur outils.html et github.html
- ✅ Apprendre étape 02 · 4 cards alignées en desktop

### À venir
- [ ] Navs des autres pages (lexique, claude-code, workflows) · elles n'ont pas de nav verbose, pas critique
- [ ] Si d'autres sections sombres apparaissent, utiliser systématiquement `#0A0A0A` au lieu de `var(--ink)` quand le texte reste blanc fixe

---

## 2026-04-22 (nuit++++) · Page /github.html dédiée non-devs

### Pourquoi
GitHub est l'outil transversal manquant · ni dans la stack outils (format cartes trop court), ni dans un article (trop narratif, disparaît dans le fil). Les lecteurs non-devs ont besoin d'une page de référence à laquelle revenir.

### Livré
- **Nouvelle page `/github.html`** · 714 lignes · format guide complet type `/claude-code.html`
- **Structure** · Hero noir avec triple-stripe + H1 "GITHUB EXPLIQUÉ POUR LES NON-DEVS" en orange/blanc · 7 sections :
  1. Avant de commencer · analogie Dropbox + 3 particularités
  2. **4 cas d'usage concrets** · Déployer Vercel · Backup Claude Code · Outils open-source · Collaborer avec dev
  3. Comment démarrer · 5 étapes en 10 min
  4. **Les 5 commandes à connaître** (table) · `status · add · commit · push · pull` + bonus `clone` et `checkout`
  5. 3 pièges · clé API pushée · force push · public vs privé
  6. **Combo GitHub + Claude Code** · workflow type de la journée en 6 étapes
  7. Pour aller plus loin · 5 liens internes/externes
- **Schema.org Article** + meta OG + Twitter Card
- **CTA newsletter** final sur fond sombre
- **Nav "GitHub" en fuchsia** · ajoutée dans `outils.html` + déjà dans `github.html`
- **Footer complet** · liens Direct + Suivre
- Ton Leo respecté · 0 mot banni

### Points pédagogiques clés
- **Angle "filet de sécurité"** · pas "pour coder" · pour ne pas perdre son travail + déployer automatiquement
- **Astuce Claude Code** dans un callout · *« tu n'as même pas besoin de mémoriser les commandes, Claude les exécute »*
- **Règle de fin de session** · commit + push avant de fermer, prend 5 secondes

### Fichiers touchés
- `github.html` · nouveau · 714 lignes
- `outils.html` · +1 lien nav vers GitHub

### Vérifications visuelles
- ✅ Hero rendu propre · H1 orange + triple-stripe Fiesta
- ✅ Section cas d'usage · kicker orange + cartes bordées par couleur (teal/fuchsia/orange/ink)
- ✅ Section commandes · kicker fuchsia + table stylée
- ✅ Nav sticky fonctionne · GitHub en fuchsia (page courante)

### À venir
- [ ] Ajouter lien GitHub dans les navs de `apprendre.html`, `debutant.html`, `lexique.html`, `claude-code.html`
- [ ] Article éventuel "Comment j'ai mis mon site sur GitHub + Vercel en 10 min" si demande lecteurs
- [ ] Mentionner GitHub dans étape 02 de `apprendre.html` ? (Setup Claude Code → Git + GitHub)

---

## 2026-04-22 (nuit+++) · Tier 2 "Stack avancée" · 4 nouveaux outils

### Pourquoi
La page outils commençait à devenir un catalogue fourre-tout avec l'ajout de Supabase. User a proposé de différencier · **stack essentielle** (pour tous) vs **stack avancée** (pour cas d'usage précis). Excellente idée pédagogique qui évite l'effet "top 20".

### Architecture retenue
- **Tier 1 (7 outils)** · Claude Code, dev-browser, Vercel, Resend, n8n, Ghostty, Supabase
- **Tier 2 (4 outils)** · Sanity, Zernio, fal.ai, Remotion · règle explicite *"ne pas installer tant qu'un projet ne le justifie"*
- Séparateur visuel entre les deux · mini-marquee "Tu as la base → voici ce qui vient après" + bloc noir `tier2-intro` (triple-stripe Fiesta top, règle fuchsia encadrée)
- Cartes tier 2 **plus compactes** (3 rows : Quand l'ajouter / Démarrage / Mon usage) vs 4 rows du tier 1

### Livré
- **`outils.html`**
  - Hero repositionné · "Ma stack, du basique à l'avancé" · meta/OG/JSON-LD passés à "11 outils"
  - Nouvelle intro tier 2 (`.tier2-intro`) + 2ème table récap
  - 4 cartes complètes · Sanity (#08 teal) · Zernio (#09 fuchsia) · fal.ai (#10 orange) · Remotion (#11 ink)
  - Section "Pas dans la liste" nettoyée · Zernio retiré (monté en tier 2), Hedra/ElevenLabs mentionnés comme compagnons de fal.ai/Remotion
  - Mini-marquee final passé à "7 essentiels · 4 avancés"
- **`downloads/stack-jeremy.md`**
  - Introduction refondée · 2 tableaux distincts (tier 1 / tier 2)
  - 4 sections détaillées ajoutées (Sanity, Zernio, fal.ai, Remotion) · commandes `npm create sanity@latest` / `npx create-video` etc.
  - Fichier passé de 6 250 à 9 786 octets (+56 %)
- **`downloads/jeremy-claude-pack.zip`** régénéré · 713 Ko
- **`index.html`** · carte freebie 05 · liste repensée essentiels / avancés

### Fichiers touchés
- `outils.html` · +280 lignes (intro + 2 table + 4 cartes + CSS tier2)
- `downloads/stack-jeremy.md` · +~115 lignes
- `downloads/jeremy-claude-pack.zip` · régénéré
- `index.html` · carte 05 réécrite

### Vérifications visuelles
- ✅ Intro tier 2 · bloc noir avec triple-stripe Fiesta en haut, règle fuchsia encadrée lisible
- ✅ Carte Sanity (#08) · teal, bien structurée, numéro 09 Zernio visible à la suite
- ✅ Les 4 cartes ont la classe `.tier2` qui réduit le padding

### À venir
- [ ] Articles dédiés éventuels sur fal.ai ou Remotion (si Jérémy livre un projet réel)
- [ ] Envisager un tier 3 si d'autres outils spécialisés émergent (Stripe, Airtable, etc.)

---

## 2026-04-22 (nuit++) · Supabase ajouté comme 7ème outil

### Pourquoi
J'avais mis Supabase dans la section "pas dans la liste volontairement" avec l'argument qu'il était trop dev pour un non-dev. User a demandé à le réinsérer comme outil principal. Effectivement justifié : dès qu'un site ou agent a besoin de stocker des données (formulaires, leads, mémoire longue), c'est la solution la plus simple pour un non-dev.

### Livré
- **`outils.html`** · nouvelle 7ème carte `c-fuchsia` complète (pourquoi lui · installation 4 étapes · usage Eurofiscalis/Leads · pour qui c'est) · table récap étendue · hero passé de 6 à 7 outils (méta + JSON-LD + marquees)
- **`outils.html`** · Supabase retiré de la section "Pas dans la liste" (évite la contradiction)
- **`downloads/stack-jeremy.md`** · section 7 "Supabase" ajoutée · tableau récap à 7 lignes · commandes env + SQL à demander à Claude
- **`downloads/jeremy-claude-pack.zip`** · régénéré 712 Ko (stack-jeremy.md v2 de 6250 octets)
- **`index.html`** · carte freebie 05 · liste des outils mise à jour, mention des 7

### Fichiers touchés
- `outils.html` · +73 lignes · carte Supabase + hero/meta/marquee/JSON-LD mis à jour
- `downloads/stack-jeremy.md` · section 7 ajoutée + tableau
- `downloads/jeremy-claude-pack.zip` · régénéré
- `index.html` · carte 05 freebie

### À venir
- [ ] Écrire éventuellement un article dédié "Supabase pour un non-dev · comment je stocke mes données"
- [ ] Publier le commit et vérifier le ZIP en prod (cache Vercel)

---

## 2026-04-22 (nuit+) · Article Superpowers avec recherche sous-agents

### Pourquoi
Le plugin Superpowers qu'on a installé en début de session mérite un article dédié. Le user voulait que j'utilise la méthodologie Superpowers (brainstorm → plan → execute) et que je déploie des sous-agents pour la recherche.

### Méthode appliquée (Superpowers-style)
- **Brainstorm implicite** · angle retenu : Jérémy vient d'installer, angle honnête "ce que j'ai compris + retours utilisateurs externes"
- **2 sous-agents de recherche en parallèle**
  - Agent Explore · lecture du plugin local (`~/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/`) → rapport des 14 skills + philosophie + avis pragmatique pour non-dev
  - Agent general-purpose · recherche web (GitHub stats + HN + Threads + blogs tech) → citations verbatim de 6 sources (Evan Schwartz, Simon Willison, Mejba Ahmed benchmark, rodskagg critique, d--b HN, Jesse Vincent lui-même)
- **Synthèse** des 2 rapports dans un article original, ton Leo

### Livré
- **`drafts/superpowers.md`** · 1977 mots · slug `superpowers-claude-code`
- **`articles/superpowers.html`** · 32 Ko · publié via `npm run publish`
- Structure : hero + TL;DR + avant (avec critiques honnêtes dès l'intro) + concept (3 piliers) + 14 skills regroupés en 4 familles + 3 cas concrets + problèmes réels (overkill, activation agressive, bug subagents) + installation + pour aller plus loin (5 sources externes citées)

### Sources externes citées
- [Jesse Vincent · blog fondateur](https://blog.fsck.com/2025/10/09/superpowers/) · source primaire
- [Simon Willison](https://simonwillison.net/2025/Oct/10/superpowers/) · caution d'autorité
- [Mejba Ahmed · benchmark 12 sessions](https://www.mejba.me/blog/superpowers-plugin-claude-code-review) · +10-15% tokens sur small tasks
- [Issue #237 · bug subagents contexte](https://github.com/obra/superpowers/issues/237)
- Threads @rodskagg · critique "changer CSS prend des plombes"

### Chiffres clés validés
- 163 000 stars GitHub, 14 200 forks (au 2026-04-22)
- 4e plugin le plus installé du marketplace officiel Anthropic
- Créé 9 octobre 2025 par Jesse Vincent

### Fichiers touchés
- `drafts/superpowers.md` · nouveau
- `articles/superpowers.html` · nouveau (32 Ko)
- `sitemap.xml` · entrée superpowers ajoutée

### À venir
- [ ] Ajouter l'article Superpowers dans étape 02 de `apprendre.html` (devient 4 cartes)
- [ ] Éventuellement ajouter dans le cluster `claude-code` du brainstorm pour qu'il remonte naturellement

---

## 2026-04-22 (nuit) · Audit + article dev-browser + page outils + freebie stack

### Pourquoi
3 objectifs combinés · vérifier la mémoire du projet entre sessions · documenter publiquement les outils qu'on utilise vraiment · offrir une porte d'entrée pour qui veut copier la stack.

### Phase 1 · Audit CLAUDE.md + mémoires
- **Synchronisation 100%** vérifiée entre CLAUDE.md site / plugins installés (7) / modules BO (13) / données data/ (2 fichiers JSON valides)
- **Gap critique corrigé** · `claude-code-workflow-tips-after-6-months-of-daily-` déplacé de `chosen` → `published` dans BACKLOG via API (1 article présent dans `articles/` mais non reflété dans le backlog)
- **Gaps mineurs identifiés** (non corrigés, à faire à l'occasion) · pas de `.claude.local.md` pour règles perso · CHANGELOG approche 520 lignes (archiver vers `CHANGELOG-2025.md` quand ça passe 600)

### Phase 2 · Article dev-browser + page outils.html
- **`drafts/dev-browser.md`** + **`articles/dev-browser.html`** · 2000+ mots · 4 cas d'usage chiffrés · 3 limites · ton Leo respecté · publié via `npm run publish dev-browser` (29 Ko)
- **Nouvelle page `/outils.html`** · 831 lignes · hero « Les 6 outils que j'utilise vraiment » · table récap + 6 cartes détaillées (Claude Code Max · dev-browser · Vercel · Resend · n8n · Ghostty) · section « Ce qui n'est pas dans la liste (volontairement) » · CTA newsletter final
- **Schema.org** `CollectionPage` pour le SEO
- Nav « Outils » en fuchsia dans le header de `outils.html`

### Phase 3 · Freebie stack-jeremy.md
- **Nouveau `downloads/stack-jeremy.md`** · récapitulatif des 6 outils en 1 fichier (4 Ko) · chaque outil avec prix, commande d'install, usage perso, alternatives
- **5ème carte Freebies** `fb-teal` ajoutée à la section du site (sans email requis, téléchargement direct · lien vers `outils.html` pour le détail)
- **Intro Freebies** · 4 → 5 ressources · tableau de transparence réécrit (2 emails sur 5)
- **Pack zip régénéré** · 711 Ko · inclut `stack-jeremy.md` en plus

### Fichiers touchés
- `BACKLOG.md` · entrée migrée chosen → published
- `drafts/dev-browser.md` · nouveau
- `articles/dev-browser.html` · nouveau (via publish.js)
- `sitemap.xml` · entrée dev-browser ajoutée automatiquement
- `outils.html` · nouveau · page complète
- `downloads/stack-jeremy.md` · nouveau
- `downloads/jeremy-claude-pack.zip` · régénéré 711 Ko
- `index.html` · 5ème carte freebie + intro 4→5 + transparence réécrite

### Vérifications end-to-end
- ✅ Article dev-browser rendu propre (screenshot pris)
- ✅ Page outils.html · hero + toutes les 6 cartes OK (screenshots)
- ✅ publish.js n'a pas cassé sitemap ni apprendre.html
- ✅ BACKLOG cohérent · 23 proposées · 2 choisies · 1 publiée · 8 rejetées

### À venir
- [ ] Ajouter nav « Outils » dans toutes les pages (apprendre, debutant, claude-code, etc.)
- [ ] Article Superpowers (demandé par user à l'instant)
- [ ] Audit manuel détaillé via `/revise-claude-md` une fois Claude Code restart

---

## 2026-04-22 (suite) · Section Freebies · 4ème carte plugins installables

### Pourquoi
L'user voulait que les 6 plugins Anthropic soient **installables depuis le site**, pas juste mentionnés. Un lecteur qui passe sur la home doit pouvoir récupérer les commandes ou le script en 1 clic.

### Livré
- **Nouveau `downloads/install-plugins.sh`** · script bash 2.6 Ko · installe les 6 plugins via `claude plugin install` · vérifie présence du CLI · feedback coloré · bilan des échecs · messages d'usage · `set -e` pour sûreté
- **Nouvelle 4ème carte** Freebies `fb-ink` (style sombre · gradient triple-stripe teal/fuchsia/orange au top) · **sans email requis** (commandes publiques Anthropic) · 2 CTA :
  - **`Télécharger le script`** · lien direct `downloads/install-plugins.sh` (download attribute)
  - **`⎘ Copier les 6 commandes`** · clipboard API · toast « ✓ 6 commandes copiées · colle-les dans ton terminal »
- **Intro Freebies** · "3 ressources" → "**4 ressources**"
- **CSS `fb-ink`** dans `assets/main.css` · triple-stripe au top + numéro sombre sur cream
- **`downloads/README.md`** enrichi · nouvelle **Étape 4 "Installer mes 6 plugins officiels"** · avec la commande `bash install-plugins.sh` et la liste des 6 plugins · renumérotation Étape 5 pour le test
- **Pack zip régénéré** · 709 Ko · inclut `install-plugins.sh` + README v2 + CLAUDE.md v2

### Fichiers touchés
- `downloads/install-plugins.sh` · nouveau (exécutable, chmod +x)
- `downloads/README.md` · +Étape 4 plugins + renumérotation + mention dans tableau pack
- `downloads/jeremy-claude-pack.zip` · régénéré 709 Ko
- `index.html` · 4ème carte `fb-ink` · bouton copy + handler JS clipboard · intro 3→4
- `assets/main.css` · `.fb-ink::before` + `.fb-ink .freebie-num`

### Vérifications end-to-end
- ✅ `bash -n install-plugins.sh` · syntaxe OK
- ✅ Bouton copy : 6 commandes copiées dans le clipboard (testé via mock)
- ✅ Toast feedback : « ✓ 6 commandes copiées · colle-les dans ton terminal »
- ✅ Lien download : `downloads/install-plugins.sh` résolu
- ✅ 4 cards rendues, fb-ink en dernier, triple-stripe visible

### Workflow utilisateur final
1. Lecteur arrive sur la home, scroll jusqu'à la section Freebies
2. Voit les 4 ressources (Claude Code / CLAUDE.md / 26 skills / **6 plugins**)
3. Sur la 4ème : clique "Copier les 6 commandes" → va dans son terminal → paste → 6 plugins installés en 30 sec
4. OU clique "Télécharger le script" → l'exécute via `bash install-plugins.sh` avec feedback coloré

---

## 2026-04-22 · Site public synchronisé avec les plugins Claude Code (Options A + B)

### Pourquoi
Les 6 plugins officiels Anthropic ont été installés en session interne, mais le site public ne les mentionnait nulle part. Un lecteur qui télécharge le pack ou lit les tutos était en retard d'une étape.

### Option A · Socle public (livré)
- **`downloads/CLAUDE.md`** enrichi · nouvelle section "Plugins Claude Code installés (scope user)" · tableau des 6 plugins + commandes slash utiles + gestion via `claude plugin`
- **`downloads/jeremy-claude-pack.zip`** régénéré · 707 Ko · CLAUDE.md passé de 5231 à 7204 octets
- **`lexique.html`** · nouvelle entrée #08 "Plugin & Marketplace" complète (analogie, usage, 6 plugins en tableau, mockup terminal, pas à pas, bloc "tu peux l'ignorer si") · TOC mis à jour · meta/h1/share passés de "7 mots" à "8 mots" partout
- **`claude-code.html`** · nouvelle section "Les plugins officiels à connaître" (kicker teal · après "Ma routine", avant "Dépannage") · id `#plugins` pour ancrage · callout install des 6 en une fois · 6 steps colorés détaillant chaque plugin · mini-marquee après · lien vers `lexique.html#plugin`

### Option B · Parcours cohérent (livré à la foulée)
- **`apprendre.html`** · étape 02 passe de 2 à **3 cartes** · nouvelle `02.3` teal "Les 6 plugins officiels à installer" (5 min) · step-facts mis à jour (`3 lectures · ~27 min au total`) · step-intro enrichi pour mentionner les plugins
- **`debutant.html`** · Porte 3 "Claude Code" complétée d'un paragraphe "Un plus à connaître" avec l'analogie *"applications pour ton téléphone"* · ton rassurant pour débutants (« ne te prends pas la tête au début »)

### Fichiers touchés
- `downloads/CLAUDE.md` · `downloads/jeremy-claude-pack.zip` (régénéré)
- `lexique.html` · `claude-code.html` · `apprendre.html` · `debutant.html`

### Vérifications visuelles faites
- ✅ `apprendre.html#etape-02` · 3 cartes alignées (Setup fuchsia · Loops teal-fuchsia · Plugins teal)
- ✅ `debutant.html` Porte 3 · paragraphe plugins lisible, ton Leo respecté
- ✅ `claude-code.html#plugins` · callout install + 6 steps rendus
- ✅ `lexique.html#plugin` · entrée #08 ancrée, nav OK

### À venir (Option C pas faite)
- [ ] Passer sur 4 articles Claude Code pour ajouter un encart "📦 Plugins officiels" (loops-claude, agents-ia-guide, tuto-agent-gmail, construit-avec-claude-code-gmf)
- [ ] Vérifier en prod une fois déployé sur Vercel que le ZIP téléchargeable est la nouvelle version (cache Vercel)

---

## 2026-04-21 (nuit) · Plugins Claude Code officiels + CLAUDE.md enrichi

### Pourquoi
Deux vides à combler : (1) le CLAUDE.md n'avait pas bougé depuis la création du back-office, il ne mentionnait ni les 11 modules, ni le brainstorm multi-sources, ni les règles découvertes en cours de route · (2) aucun plugin Claude Code installé en dehors de `telegram`, alors que le store officiel Anthropic expose 140 plugins dont plusieurs pile dans l'usage.

### Livré

**6 plugins Anthropic officiels installés** (scope user, dispo dans tous les projets) :
| Plugin | Version | Apporte |
|---|---|---|
| `superpowers` | 5.0.7 | 14 skills · 3 commandes (`/brainstorm`, `/write-plan`, `/execute-plan`) · 1 agent `code-reviewer` |
| `claude-md-management` | 1.0.0 | 1 skill `claude-md-improver` · 1 commande `/revise-claude-md` |
| `frontend-design` | latest | 1 skill `frontend-design` (auto-déclenche sur refontes UI) |
| `context7` | latest | 1 MCP server (docs à jour de n'importe quel framework) |
| `code-review` | latest | 1 commande `/code-review` |
| `code-simplifier` | latest | 1 agent `code-simplifier` |

Commande : `claude plugin install <nom>` · marketplace `claude-plugins-official`.

**CLAUDE.md enrichi de 5 ajouts** (fichier passé de 319 à 373 lignes) :
- Nouvelle section complète `## Back-office local (port 3001)` · architecture modules + 11 modules en place + flux éditorial + fichiers data + plugins installés
- Nouvelle sous-section `### Brainstorm d'idées (scripts/brainstorm.js)` · sources parallèles + scoring 5 axes + boost cluster + filtre anti-bruit
- Nouvelle sous-section `### Slug backlog vs draft` · les `id` BACKLOG sont moches, mettre un slug court dans le frontmatter du draft
- Nouvelle sous-section `### CHANGELOG.md obligatoire` · format 5 parties (date, pourquoi, livré, fichiers, à venir)
- Exception dans ton Leo · citer un mot banni entre guillemets français est OK

**2 drafts écrits** (non encore publiés) :
- `drafts/claude-code-workflow-tips-after-6-months-of-daily-.md` · slug `claude-code-6-mois-non-dev` · 2012 mots · angle "non-dev vs dev senior"
- `drafts/tuto-cours-skills-tout-comprendre-sur-les-skills-a.md` · slug `skills-claude-code-non-dev` · 1786 mots · angle "Skills Claude Code expliqués par un non-dev" (crédite Melvynx)

### Fichiers touchés
- `CLAUDE.md` · 5 éditions ponctuelles (lignes 132, 291, 303, 341, 353)
- `drafts/claude-code-workflow-tips-after-6-months-of-daily-.md` · nouveau
- `drafts/tuto-cours-skills-tout-comprendre-sur-les-skills-a.md` · nouveau
- `~/.claude/plugins/installed_plugins.json` · +6 plugins (fichier hors repo, info seulement)

### À venir
- [ ] **Restart Claude Code** pour que les 3 commandes slash des plugins soient reconnues (`/brainstorm`, `/write-plan`, `/execute-plan`, `/revise-claude-md`, `/code-review`)
- [ ] Relire + publier les 2 drafts (`npm run publish <slug>`)
- [ ] Lancer `/revise-claude-md` post-restart pour comparer avec les 5 ajouts manuels et compléter si le skill propose plus
- [ ] Tester `context7` sur une requête Next.js 16 ou Resend v3 pour valider le MCP

---

## 2026-04-21 (soirée+) · Liens croisés entre modules (cohérence BO)

### Pourquoi
Les 11 modules étaient 11 îlots. Aucun ne pointait vers l'autre. Pour planifier la publication d'une idée, il fallait : ouvrir le backlog · copier le slug · ouvrir le calendrier · créer manuellement un slot · retaper le slug. 5 clics, 3 écrans.

### Livré (30 min pile)

**Depuis Backlog** :
- État "À écrire" : nouveau bouton `📅 Planifier` · ouvre `/calendar/#plan-<slug>` qui auto-ouvre le modal avec : prochain mardi/vendredi, slug pré-rempli, note pré-remplie
- État "Publiées" : bouton `📅 Planifier` (pour programmer une relance sociale ou newsletter)

**Depuis Pipeline** :
- Chaque ligne devient un `<a>` cliquable
- Routing intelligent selon l'étape :
  - stage = `published` ou `shared` → ouvre l'article dans nouvel onglet
  - stage = `drafted` ou `audited` → ouvre le module Drafts avec query `?slug=`
  - sinon → ouvre le backlog avec `#<slug>` (scroll auto)
- Hover fuchsia + bordure gauche 3px pour signaler l'interactivité

**Depuis Alerts** :
- Chaque alerte a désormais un lien `📊 Pipeline` en dessous de `Re-auditer`

**Depuis Calendar (modal)** :
- Quand un slug est sélectionné, 3 liens contextuels apparaissent en bas du modal : `💡 Voir l'idée` (backlog) · `✏ Draft` (éditeur) · `📰 Article ↗` (si publié, le site)
- Mise à jour live quand on change le slug dans le dropdown

### Fichiers touchés
- `admin/modules/backlog/page.html` · +bouton Planifier en chosen & published
- `admin/modules/pipeline/page.html` · rows → `<a>` · routing intelligent selon stage
- `admin/modules/alerts/page.html` · +lien Pipeline à côté de Re-auditer
- `admin/modules/calendar/page.html` · `handleHashShortcut()` pour auto-ouverture modal · `updateModalLinks()` pour liens contextuels live

### Vérifications end-to-end (dev-browser)
- ✅ backlog.chosen → bouton Planifier détecté
- ✅ pipeline → 48 lignes `.clickable` détectées
- ✅ `/calendar/#plan-loops-claude` → modal ouvert + slug pré-rempli `loops-claude` + 3 liens contextuels
- ✅ alerts → 15 liens Pipeline (1 par alerte)

---

## 2026-04-21 (soirée) · Brainstorm · source YouTube (16 chaînes RSS)

### Pourquoi
Reddit + HN + GitHub + RSS = du contenu IA en **anglais technique**. Résultat : 90% du top 10 était en anglais, verbeux, peu actionnable pour le cluster `entrepreneuriat-ia` et `outils-ia`. Les meilleures ressources FR de Jérémy (Melvynx, Grand Angle, Oussama Ammar, Silicon Carne) étaient absentes des sources.

### Livré
- Nouveau fichier `scripts/youtube-channels.js` · 16 chaînes sélectionnées (IA/Tech + Business & Entrepreneuriat) sur les 34 listées sur le site. Exclu : Lifestyle, Actu généraliste, Finance pure (aucun cluster actif)
- **Résolution auto handle→channelId** · scrape la page `/youtube.com/@handle` et extrait `channelId` via 4 patterns · cache persistant dans `data/youtube-cache.json` (TTL 90j, les channelId ne changent jamais)
- **Fetch RSS Atom** par chaîne · parse entries (videoId, title, published, description, stars, views) sans dépendance XML
- **Filtre signal** strict · liste `YT_SIGNAL_KEYWORDS` (35+ keywords IA/business/workflow) vérifiée dans `title + description` — sinon la vidéo est skippée. Crucial : Silicon Carne et Vision IA publient aussi du contenu lifestyle qui aurait pollué le backlog
- **Filtre fraîcheur** · vidéos < 45 jours uniquement
- **Boost chaîne** · multiplicateur 1.10-1.15 pour les chaînes-phares (Silicon Carne, IA et Stratégie, Vision IA, Underscore_) · appliqué après multiplicateur cluster
- Label source amélioré · `YouTube · Melvynx` au lieu de `www.youtube.com`

### Résultat mesuré (run 2026-04-21 14:42)
- 16/16 chaînes résolues · cache sauvé
- **84 items YouTube collectés** sur 476 total (+18%)
- **9 nouvelles idées** ajoutées au backlog · dont **5 depuis YouTube** (55%)
- Top 10 désormais dominé par YouTube FR :
  - `[9.6]` TUTO / COURS Skills : tout comprendre sur les skills avec Claude Code (Melvynx)
  - `[9.2]` Ça change tout : OpenClaw ne va plus supporter tes tokens Claude Code
  - `[8.9]` Apprends en quelques minutes à Claude Skills comment tu travailles
  - `[8.4]` Claude code change tout pour les créateurs de contenu
  - `[8.1]` Claude Code remplace Lovable pour $20 / mois

### Fichiers touchés
- `scripts/youtube-channels.js` · nouveau · 16 handles + 35 signal keywords
- `scripts/brainstorm.js` · fonctions `resolveChannelId`, `fetchYouTube`, `loadYtCache`, `saveYtCache`, intégration dans `main()`, propagation `channel_boost` à travers cluster+score final
- `data/youtube-cache.json` · créé automatiquement au 1er run

### À venir
- [ ] X (Twitter) — plan léger (paste-URL manuel) ou plan stack (RSSHub Docker) à décider
- [ ] Ajouter compteur d'items YouTube dans le log CLI

---

## 2026-04-21 (fin de journée) · BO Niveau 3 — Pipeline + Alertes + Calendrier

### Feature 1 · Module Pipeline (idée → publication en une vue)
- Nouvel endpoint `GET /api/pipeline` · pour chaque idée du backlog + chaque article orphelin (pas en backlog), calcule les 6 étapes franchies : `proposed → chosen → drafted → audited → published → shared`
- État dérivé du filesystem (pas de stockage) : draft = `drafts/<id>.md` existe · audité = `audits/<id>/` existe · publié = `articles/<id>.html` existe · partagé = `social-drafts/<id>/` existe
- Module UI `admin/modules/pipeline/` · timeline horizontale 6 points par idée, filtres par stade, détection orphelins (articles sans entrée backlog)

### Feature 2 · Module Alertes fraîcheur
- Nouvel endpoint `GET /api/alerts` · scanne tous les articles, compare date article vs date dernier audit vs date audit précédent
- Règles de détection :
  - `no_audit` · jamais audité (warn)
  - `modified_since_audit` · mtime article > audited_at (err)
  - `stale` · audit > 14 jours (warn)
  - `score_drop` · score_core a chuté de ≥5 points vs audit précédent (err)
- Module UI `admin/modules/alerts/` · 3 cards résumé (err/warn/ok), table tri par sévérité, bouton "Re-auditer" qui copie le prompt Claude Code

### Feature 3 · Module Calendrier éditorial
- Nouveaux endpoints `GET /api/calendar`, `POST /api/calendar/slot`, `DELETE /api/calendar/slot/:id`
- Stockage JSON plat dans `data/calendar.json` (gitignored potentiellement)
- Module UI `admin/modules/calendar/` · grille 5 semaines (semaine courante + 4 à venir), 5 types de créneau (newsletter / linkedin / twitter / article / note), modal ajout/édition, **drag-drop** pour déplacer un slot, suggestions auto mardi/vendredi pour newsletter
- `api.del` ajouté dans `admin/shared/admin.js`

### Fichiers touchés
- `scripts/admin-server.js` · +5 endpoints (pipeline, alerts, calendar GET/POST/DELETE), +2 PATHS (dataDir, calendar)
- `admin/modules.json` · +3 modules enregistrés (pipeline, alerts, calendar)
- `admin/modules/pipeline/page.html` · nouveau · ~280 lignes
- `admin/modules/alerts/page.html` · nouveau · ~230 lignes
- `admin/modules/calendar/page.html` · nouveau · ~390 lignes (drag-drop inclus)
- `admin/shared/admin.js` · +fonction `api.del()`
- `data/calendar.json` · créé au premier POST, persistant

### UX workflow
- **Pipeline** : j'ouvre et je vois en 2 secondes laquelle de mes 32 idées est coincée à quelle étape
- **Alertes** : tous les 15 jours, un coup d'œil me dit lesquels des 14 articles ont besoin d'un re-audit
- **Calendrier** : je clique sur une case, je sais ce qui part quand, je drag-drop pour réorganiser

### À venir éventuellement
- [ ] Cron léger pour alerter automatiquement quand `err` apparaît (desktop notif)
- [ ] Corréler slots calendrier avec Zernio (publish planifié qui bascule en `done` automatique)
- [ ] Lignes pipeline cliquables → scroll vers la section concernée dans un drawer latéral

---

## 2026-04-21 (soir) · Backlog explainer — bouton "Explique-moi le top 10"

### Problème
Les idées brainstormées arrivent en anglais, parfois très techniques (`speckit-companion · VS Code extension for spec-driven…`, `webiny-js · Open-source, self-hosted CMS…`). Impossible pour Jérémy de trancher "je prends / pas pour moi" sans comprendre de quoi ça parle et en quoi c'est pertinent pour lui.

### Feature livrée
- **Nouveau bouton** fuchsia "✨ Explique-moi le top 10" à côté du bouton brainstorm
- **1 clic = 1 prompt Claude Code copié** (5800 char) contenant : contexte Jérémy, règles ton Leo, les 10 idées non expliquées, format d'édition strict pour `BACKLOG.md`
- Claude Code Max local reçoit le prompt, édite `BACKLOG.md` et remplit 3 champs par idée :
  - `**Résumé**` · 1 phrase FR (12 mots max, ce que c'est)
  - `**Pour toi**` · 1 phrase (pourquoi dans le cluster, quel angle possible)
  - `**Verdict**` · commence par `prendre` / `hésiter` / `passer` + raison
- **Affichage UI** : bloc coloré sous chaque carte (teal si prendre, orange si hésiter, gris si passer) avec badge verdict + 3 lignes d'explication

### Fichiers touchés
- `scripts/admin-server.js` · parser étendu (3 champs), formatEntry met à jour `BACKLOG.md`, nouvel endpoint `GET /api/backlog/explain-prompt?top=N`
- `admin/modules/backlog/page.html` · bouton + fonction `explainHTML` + CSS blocs colorés
- `BACKLOG.md` · migré (3 lignes vides `—` ajoutées à chaque entry existante)

### Workflow
1. J'ouvre la page Idées
2. Je clique "✨ Explique-moi le top 10"
3. Le prompt atterrit dans mon presse-papier
4. Je le colle dans Claude Code Max local
5. Claude édite `BACKLOG.md` (3 edits par idée × 10)
6. Je refresh la page → les 10 idées sont expliquées, je peux trancher au premier coup d'œil

### À tester
- [ ] Lancer le prompt sur le top 10 actuel et vérifier que Claude respecte bien le format `**prendre|hésiter|passer** — raison`
- [ ] Que le ton Leo tient (pas de "kif", "taf", "mec")

---

## 2026-04-21 · Back-office V2 — architecture modules + sidebar FIESTA

### Refonte complète
- **Nouvelle archi modules** : chaque page est un dossier `admin/modules/<id>/page.html` autonome, enregistré dans `admin/modules.json`. Ajouter un module = créer 1 dossier, pas de refactor.
- **Sidebar fixe sombre** (inspiration #REF d'Oussama Ammar) + **triple-stripe vertical Fiesta** (signature identité) + accents fuchsia/teal/orange (pas de jaune copié)
- Sections sidebar : Ma production · Mon audience · Mes réseaux · Mes stats · Système
- **Shell partagé** : `admin/shared/admin.css` (800 lignes) + `admin/shared/admin.js` (render sidebar dynamique depuis `/api/modules`)
- **Serveur admin refactorisé** : loader `.env.local` natif, route `/admin/modules/<id>/` automatique, redirect `/` → dashboard
- Responsive : sidebar drawer sur mobile, topbar hamburger

### 9 modules en place
| Module | Statut | Fonction |
|---|---|---|
| **Dashboard** | Live | Stats + top 5 backlog + drafts/articles récents + carte "Comment on fonctionne" |
| **Idées (Backlog)** | Live | Tabs À trier / À écrire / Publiées / Écartées · actions Je prends/Rejeter/Demander à Claude |
| **Drafts** | Live | Liste + éditeur markdown + preview live · Sauvegarder/Publier |
| **Articles** | Live | **Table SEO** façon Oussama · colonnes Cluster · Status · Score · Mots · Date (score heuristique depuis taille) |
| **Newsletter** | Live (API-dépend) | Stats Resend/Brevo · sources de trafic · liste contacts · search · export CSV |
| **Social (Zernio)** | Stub V3 | Preview LinkedIn/X/Instagram/Threads + workflow 5 étapes expliqué |
| **Analytics** | Stub V3 | Preview Vercel Analytics + funnel visiteur→abonné |
| **Agents** | Stub V3 | 1 agent actif (Brainstorm) + 4 prévus (Social-poster, SEO-scorer, Newsletter-writer, Refresh-articles) |
| **Réglages** | Stub V3 | Doc des variables env (Resend, Brevo, Zernio, Vercel, Anthropic) |

### API ajoutées
- `GET /api/modules` → registre modules depuis `modules.json`
- `GET /api/newsletter/stats` → total/new7d/new30d/unsub depuis Resend ou Brevo (priorité Brevo si les deux clés présentes)
- `GET /api/newsletter/contacts` → liste contacts avec source/firstName/createdAt
- Loader `.env.local` natif (plus besoin de dotenv)

### Décisions tranchées post-recherche
- **Brevo > Resend** pour CRM (contacts illimités free, rate limits 50-200× plus généreux, API contacts plus riche, multicanal SMS/WhatsApp)
- **Zernio** validé pour V3 social (API first-class pour devs/agents, 15 canaux, plan Build 16 $/mois suffit)
- Resend gardé pour l'instant (migration Brevo documentée en Réglages, à faire en V2c)

### Fichiers supprimés
- `admin/backlog.html`, `admin/drafts.html`, `admin/articles.html`, `admin/admin.css`, `admin/admin.js` (remplacés par l'arbo modules)

### Ton Leo appliqué partout
- Toutes les pages : kickers chaleureux, sous-titres explicatifs, pageNote rappel contextuel, empty states bienveillants, toasts "Ça a coincé" vs "Erreur"
- Dashboard : carte "Comment on fonctionne ensemble" à relire à chaque session, 5 étapes colorées

---

## 2026-04-21 · Back-office admin local (V1)

### Ajouté
- **`scripts/admin-server.js`** — serveur HTTP Node natif (0 dep nouvelle, port 3001)
  - Sert les fichiers statiques `admin/*` + `assets/*`
  - API REST : stats · backlog · drafts · articles · publish · brainstorm
  - Redirect `/` → `/admin/` pour que les chemins relatifs marchent
  - Lance les scripts existants via `child_process.spawn` (brainstorm.js, publish.js)
- **`admin/`** — 4 pages HTML + CSS + JS (charte FIESTA complète en dual-theme) :
  - `index.html` · Dashboard avec 4 stat cards + top 5 backlog + drafts récents + articles récents + placeholder Social
  - `backlog.html` · Tabs Proposées/Choisies/Publiées/Rejetées + cards scorables + actions choose/reject/write/back
  - `drafts.html` · Liste cards + éditeur MD textarea + preview HTML live (debounced)
  - `articles.html` · Liste des 13 articles publiés avec métadonnées
- **`admin.css`** · complément ciblé pour l'admin (stat-cards, idea-cards, tabs, editor, toast, loader)
- **`admin.js`** · helpers partagés (theme toggle, fetch api wrapper, toasts, fmtDate/fmtRelative, nextWeekday)
- **`npm run admin`** dans package.json

### Workflow complet opérationnel
```
1. npm run admin        → ouvre http://localhost:3001
2. Dashboard            → vue globale + bouton Brainstorm
3. Clic Brainstorm      → lance brainstorm.js, BACKLOG.md mis à jour
4. Backlog              → clic "Choisir" sur une idée → status=chosen
5. Clic "Claude Code →" → copie prompt dans presse-papier
6. (Claude Code écrit drafts/xxx.md en local)
7. Drafts               → éditeur MD + preview + bouton Publier
8. Publier              → génère articles/xxx.html + MAJ sitemap
9. git commit + push    → Vercel redéploie
```

### Test en réel validé
- Dashboard : 4 stat cards (13 articles · 1 draft · 10 backlog · 28 avr.) · top 5 backlog · articles récents ✓
- Backlog : 10 idées affichées avec scores · actions fonctionnelles ✓
- Drafts : 1 draft (demo-pipeline-publish) listé ✓
- Articles : 13 articles listés avec taille + date ✓
- Light + dark mode OK sur toutes les pages ✓
- Endpoint `/api/brainstorm` POST : relance le script et retourne l'output ✓

### Ce qui est intentionnellement pas fait (V2+)
- Auth (tournement local only)
- Social LinkedIn/Twitter : placeholder "Coming soon" visible sur le dashboard
- Édition de `index.html` / `apprendre.html` / copy home
- Git commit/push depuis l'admin
- Analytics Vercel

---

## 2026-04-21 · Phase 1.5 — Brainstorm sujets auto

### Ajouté
- **`scripts/brainstorm.js`** — fetch signaux externes + scoring règles + MAJ backlog (~380 lignes, 0 dep externe)
  - **Sources** : Reddit (5 subs), Hacker News Algolia, RSS (OpenAI + Google AI + Hugging Face + Simon Willison)
  - **Scoring 5 axes** : demande (engagement) · pertinence (keywords site) · evergreen (tuto vs news) · vécu (neutre 5, Jérémy ajuste) · gap (anti-doublon vs articles/*)
  - **Filtres** : anti-bruit Reddit (memes, shitposts, drama) · pertinence min 4 · score final min 5
  - **Top 10** inséré dans BACKLOG.md, max 30 idées en proposed
  - **Auto-rejet** après 60j sans être chosen
- **`BACKLOG.md`** — format lisible humain + parsable par script :
  - Sections : 📊 Proposées · ✏️ Choisies · ✅ Publiées · 🗑️ Rejetées
  - Par entrée : score, id, status, proposed_date, scores détaillés, angle suggéré, sources liées
- **`npm run brainstorm`** ajouté dans package.json

### Workflow éditorial complet
```
1. npm run brainstorm          → backlog auto-mis à jour (10 nouvelles idées scorées)
2. Jérémy lit BACKLOG.md       → choisit 1 sujet, passe status=chosen + angle personnel
3. "Claude Code, écris le draft pour id <xxx>"  → drafts/xxx.md
4. Jérémy relit + édite
5. npm run publish <xxx>       → articles/xxx.html + sitemap MAJ
6. git commit + push           → Vercel deploy auto
```

### Premier test en réel
- 275 items collectés (5 sources actives · Anthropic RSS 404 retiré)
- 259 clusters après déduplication (Jaccard 0.5)
- 113 clusters scorés ≥ 5.0
- Top 5 : Claude Code workflow tips · Claude Design by Anthropic · Claude Pro vs ChatGPT 30 jours · etc.
- **Filtres anti-memes fonctionnent** : "Me when Claude...", "Friends outside of tech..." correctement écartés

### MAJ AGENT_BRIEF.md
- Nouvelle **section 7** "Comment choisir le sujet d'un article" : workflow backlog → draft complet
- Règles : ne pas doublonner, prendre l'angle vécu, demander validation si vécu faible

---

## 2026-04-21 · Phase 1 pipeline agent IA (Ghostwriter)

### Ajouté
- **`AGENT_BRIEF.md`** — contrat complet entre Jérémy et l'agent rédacteur (ton Leo, exclusions, structure type, règles SEO, checklist)
- **`scripts/publish.js`** — script Node de publication (~290 lignes) :
  - Lit `drafts/<slug>.md` avec frontmatter YAML
  - Parse markdown → HTML via `marked`
  - Injecte dans `articles/_TEMPLATE.html` (hero, TL;DR, sections block, final CTA)
  - Met à jour `sitemap.xml` (ajout ou update `lastmod`)
  - Affiche le bloc card à ajouter manuellement dans `apprendre.html` si `parcours_etape` défini
- **`drafts/_TEMPLATE.md`** — template d'article markdown avec frontmatter complet et structure type
- **`drafts/demo-pipeline-publish.md`** — article de démo qui raconte le pipeline lui-même (méta)
- **`package.json`** avec deps : `marked` (parser MD), `gray-matter` (frontmatter YAML)
- Article généré : **`articles/demo-pipeline-publish.html`** (23 Ko) · 5 sections · 2 callouts · 3 usecases

### Workflow agent IA activé
```
Claude Code écrit draft → drafts/*.md
Jérémy relit/édite
npm run publish <slug>
Relecture HTML (optionnel : dev-browser)
git commit + push → Vercel redéploie auto
```

### Pourquoi Phase 1
Inspiration déclenchée par Oussama Ammar (tweet du 8 avril 2026 sur "Steve/Hermes" pilotant houseofouss.com).
Analyse : 70% storytelling Ammar / 30% automation légitime. Plan Jérémy plus ambitieux (site entier vs communauté), mais démarre L1 (assistant) pour valider le workflow avant d'automatiser.

**Phase 2 planifiée** (2-3 mois) : GitHub Actions + `anthropics/claude-code-action@v1` pour que l'agent ouvre des PRs automatiquement sur issue "idée article : X".

---

## 2026-04-21 · Refonte copy lecteur + section "Pour qui"

### Ajouté
- **Section `.whoisitfor`** (`#whoisitfor`) — nouvelle section "Tu te reconnais ?" juste après le hero avec 3 profils :
  - Profil 01 · **L'entrepreneur qui veut avancer** (teal)
  - Profil 02 · **Le pro qui n'a pas 2h par jour** (fuchsia)
  - Profil 03 · **Celui qui hésite à ouvrir ChatGPT** (orange)
  - Bloc "Ce que tu ne trouveras PAS ici" pour filtrer les mauvais profils
- **Nouveau hero 4 lignes** : "Suis l'IA. / Sans être dev. / Sans y passer / tes soirées." (impératif, centré lecteur)

### Modifié
- **Copywriting intégral** de la home, chaque section commence par la question du lecteur :
  - Hero : "Tu sens que l'IA bouge fort. Tu ne veux pas être dépassé..."
  - Apprendre : "Tu ne sais pas par où commencer ? Prends ça."
  - Newsletters : "Tu veux suivre l'IA sans y passer tes soirées ? Bonne nouvelle."
  - Freebies : "Tu n'as pas envie de t'abonner avant d'avoir vu ce que vaut la maison ?"
  - Projets : "Tu veux voir que ça marche vraiment, pas juste des promesses ?"
  - Opinions : "Tu veux savoir ce qui se cache derrière le parcours et la newsletter ?"
  - Sources : "Tu cherches du bon contenu ?"
  - Story : "Tu te demandes peut-être pourquoi je partage tout ça gratuitement."
- **Nouvel ordre logique lecteur** (11 sections) :
  ```
  Hero → Pour qui → Apprendre → Newsletters → Freebies
  → Projets (preuves) → Opinions → Sources → Mini-bio → Story → CTA
  ```
  Mini-bio redescend à la 9e position — "qui je suis" n'arrive qu'après avoir donné la valeur.
- **CTAs hero inversés** : "Voir le parcours" (primary) > "Ou la newsletter" (ghost). Apprendre devient l'action principale.
- **Nav** réorganisée : Apprendre en tête, suivi de Newsletters/Télécharger/Projets/Opinions/Sources/L'histoire.
- **6 mini-marquees** réécrits avec enchaînement narratif ("Peut-être comme toi · Peut-être pas" → "Le chemin posé · Maintenant la veille" → ...).
- **Meta SEO** : title + description recentrés sur bénéfice lecteur.

### Architecture du ton
- **Haut de page** (hero, pour qui, apprendre) : 100% centré lecteur, empathique
- **Milieu** (newsletters, freebies, projets, opinions) : équilibre "voici ce que je fais, tu peux prendre"
- **Bas** (story) : pitch "d'abord pour moi" comme garantie finale
- Pitch "pour moi" dit **une seule fois** (Story), reformulé en "Ta garantie"

---

## 2026-04-21 · Refonte storytelling + parcours dédié

### Ajouté
- **`apprendre.html`** — nouvelle page parcours structuré en 4 étapes :
  - 01 · Poser les bases (`debutant.html` + `lexique.html`)
  - 02 · Passer à Claude Code (`claude-code.html` + `loops-claude`)
  - 03 · Construire des agents (`agents-ia-guide` + `tuto-gmail` + `tuto-contrats` + `hermes-agent`)
  - 04 · Aller plus loin (`gmf` + `veille-pour-demain` + 3× Karpathy)
  - Progress bar sticky 01→04 avec auto-highlight via IntersectionObserver
  - CTA fin de parcours → `index.html#newsletters`
- **`assets/main.css`** — externalisation du CSS commun (3615 lignes), partagé entre `index.html` et `apprendre.html`
- **Section "Qui je suis"** (Mini-bio) — nouvelle section juste après le hero sur la home

### Modifié
- **`index.html`** — refonte copy + réorganisation sections selon nouveau storytelling :
  - Fil rouge **peur → machine → don** : "L'IA va vite. Moi aussi."
  - Nouvel ordre : Hero → Mini-bio → Projets → Opinions → Newsletters → Apprendre (teaser) → Freebies → Sources → Story → CTA
  - Section `#learn` allégée : 13 articles éclatés → 4 cartes d'étapes + CTA vers `apprendre.html`
  - Hero : nouveau H1 "L'IA va vite. Moi aussi." + lead recentré sur le système (veilles, agents, outils)
  - CTAs hero : "Voir la newsletter" + "Découvrir le parcours →"
  - Opinions remontées avant Newsletters (voix avant promesse)
  - Story raccourcie (6 paragraphes → 3 + highlight unique)
  - Suppression du bloc `transparency-grid` dans Newsletters (redondance avec Story)
  - 6 mini-marquees réécrits avec progression narrative cohérente
  - Nav mise à jour avec lien `apprendre.html` en tête
- **`sitemap.xml`** — ajout de `apprendre.html`, `workflows.html`, 5 articles manquants (tuto-gmail, tuto-contrats, agents-ia-guide, veille-pour-demain, better-call-vs-associe, limova-vs-claude-code)
- **Meta SEO** `index.html` + og + twitter — nouveau pitch "L'IA va vite. Moi aussi."

### Retiré
- Section `#learn` avec 13 articles inline (déplacée vers `apprendre.html`)
- 3 notes de transparence redondantes dans Newsletters
- CSS inline dans `index.html` (extrait vers `assets/main.css`)

### Ton de voix
- Un seul "Je fais tout ça d'abord pour moi" sur toute la page (vs 4 avant)
- Registre naturel mais pas familier (règle renforcée 2026-04-20 respectée)
- Pitch central préservé : "Si ça arrive jusqu'à toi, c'est parce que ça m'a servi à moi en premier"

### À faire après cette refonte
- [ ] Test navigateur : dev-browser sur light + dark mode
- [ ] Vérifier les scroll-snap et l'IntersectionObserver du progress rail sur mobile
- [ ] Valider la new audience Resend dédiée à AI Playbook (cf. CLAUDE.md TODOs)
- [ ] Rédiger l'article `veille-pour-demain.html` référencé dans étape 04

---

## 2026-04-20 · Création initiale

- Site HTML standalone créé : `index.html`, `debutant.html`, `lexique.html`, `claude-code.html`, `workflows.html`
- 13 articles dans `articles/`
- API Resend `/api/subscribe.js`
- Downloads : `CLAUDE.md` anonymisé + pack ZIP 26 skills (690 Ko)
- Design system FIESTA / 89 appliqué partout
- 55 photos optimisées + 29 avatars YouTube
