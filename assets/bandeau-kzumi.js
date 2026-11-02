/* ============================================================
 * kzumi sur tout jerwis.fr (plans validés les 02-11-2026)
 * ------------------------------------------------------------
 * Habillage « revue » depuis la refonte de novembre 2026 : barre jaune,
 * autocollant jaune pour les blocs, image seulement dans la marge.
 * Un seul script pour toutes les pages FR. Selon la page :
 * - partout (P1) : une barre en tête de page, posée dans la
 *   réserve .bk-barre-place (44 px, rien ne saute au chargement),
 *   masquable 30 jours par le lecteur ;
 * - menu .mini-nav (P2) : un lien « kzumi ↗ » en tête ;
 * - articles et fiches du lexique : le vertical fixé dans la marge
 *   gauche quand la place libre réelle le permet (bord gauche du texte
 *   mesuré, pas supposé), sinon un bloc avant l'intertitre du milieu ;
 * - articles (P5) : un bloc avant « On continue ensemble ? » ;
 * - pages principales (P3) : un bloc entre deux sections ;
 * - pages principales et fiches (P6) : un bloc avant le pied de page ;
 * - 404 (P7) : un bloc dans la page.
 * L'accueil a son bandeau statique (.bk-accueil, main.css) : ici,
 * seulement la barre et le menu. Pages légales et précommande exclues.
 * Chaque emplacement a son utm_medium, lisible dans la console kzumi.
 * Ligne ajoutée par scripts/ajouter-bandeau-kzumi.mjs (et les modèles :
 * _TEMPLATE.html, build-lexique.js, build-podcast-page.js).
 * ============================================================ */
(function () {
  'use strict';

  // La traduction EN (translate-article-en.mjs) recopie les scripts de l'article FR :
  // tout ici est en français, cela reste sur les pages FR.
  if (document.documentElement.lang !== 'fr' || window.__bkKzumi) return;
  window.__bkKzumi = true;
  const tag = document.querySelector('script[src*="bandeau-kzumi.js"]');
  if (!tag) return;

  // ------------ type de page ------------

  const segments = location.pathname.split('/').filter(Boolean);
  const nom = (segments.pop() || 'index').replace(/\.html$/, '');
  const dossier = segments.pop() || '';
  const EXCLUES = ['cgv', 'mentions-legales', 'politique-confidentialite', 'suppression-donnees', 'preferences',
    'precommande-merci', 'precommande-photos-personal-branding'];
  const PRINCIPALES = ['apprendre', 'articles', 'outils', 'claude-code', 'mcp', 'agents-ia', 'workflows', 'debutant',
    'modeles-ia', 'modeles-ia-monde', 'modeles-image-ia', 'lexique', 'lexique-essentiels', 'podcast', 'news',
    'videos', 'quiz', 'github', 'jeremy-sagnier', 'presse'];
  if (nom.startsWith('_') || EXCLUES.includes(nom) || dossier === 'app') return;
  const introuvable = !!document.querySelector('main.notfound');
  const article = !introuvable && dossier === 'articles' && !!document.querySelector('.article-end');
  const fiche = !introuvable && dossier === 'lexique';
  const principale = !introuvable && !article && !fiche && PRINCIPALES.includes(nom);

  const lien = (medium) => 'https://kzumi.com/?utm_source=jerwis&utm_medium=' + medium + '&utm_campaign=bandeau';
  const ALT = 'kzumi, comprends l’argent en jouant. Budget, épargne, crédit, arnaques, puis la bourse. Sur kzumi.com, App Store et Google Play.';
  const image = (nom) => new URL('pub/' + nom, tag.src).href;
  const srcset = (nom) => image(nom + '.webp') + ' 1x, ' + image(nom + '@2x.webp') + ' 2x';

  // Style « revue » (refonte de novembre 2026) : barre jaune bordée d'encre, autocollant
  // jaune penché pour les blocs. Couleurs fixes : lisibles aussi sur les pages en sombre.
  const style = document.createElement('style');
  style.textContent = `
.bk-barre{display:flex;align-items:center;gap:10px;height:44px;box-sizing:border-box;background:#FFC800;color:#141414;border-bottom:2px solid #141414;padding:0 max(16px,calc((100vw - 1240px) / 2));font:700 12.5px/1.2 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;position:relative;z-index:60}
.bk-barre a{display:flex;align-items:center;justify-content:center;gap:14px;flex:1;min-width:0;color:inherit;text-decoration:none;border:0}
.bk-barre-mot{flex:none;font:900 18px/1 Nunito,system-ui,sans-serif;letter-spacing:-.01em;text-transform:none}
.bk-barre-t{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bk-barre-cta{flex:none;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:2px}
.bk-barre button{flex:none;background:none;border:0;color:#141414;font-size:22px;line-height:1;padding:4px 6px;cursor:pointer}
.bk-barre a:focus-visible,.bk-barre button:focus-visible{outline:2px solid #141414;outline-offset:2px}
.bk-court{display:none}
@media (max-width:640px){.bk-long{display:none}.bk-court{display:inline}}
.mini-nav .links a.bk-nav{color:#141414;background:#FFC800;border:2px solid #141414;border-radius:999px;padding:5px 12px}
.bk-etiquette{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;line-height:1.2;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-muted,#6E6E6E);margin:0 0 10px}
.bk-marge a{display:block;border-radius:14px;border:0;text-decoration:none}
.bk-marge img{display:block;width:100%;height:auto;border-radius:14px;border:2px solid #141414;box-sizing:border-box}
.bk-marge a:focus-visible,.bk-sticker:focus-visible{outline:3px solid #EF426F;outline-offset:4px}
.bk-texte{max-width:640px;margin:24px auto 48px;padding:0 8px}
.bk-bloc{box-sizing:border-box;max-width:960px;padding:0 20px;margin:64px auto}
.bk-sticker{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px 28px;padding:26px 30px;border:2px solid #141414;border-radius:24px;background:#FFC800;color:#141414;text-decoration:none;box-shadow:8px 8px 0 #141414;transform:rotate(-1.2deg);transition:transform .2s}
.bk-sticker:hover{transform:rotate(0deg)}
.bk-sticker-g{flex:1 1 240px;min-width:0;display:flex;flex-direction:column;gap:6px}
.bk-sticker-e{font:700 11.5px/1.2 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase}
.bk-sticker-m{font:900 clamp(46px,6vw,76px)/.88 Nunito,system-ui,sans-serif;letter-spacing:-.01em}
.bk-sticker-t{font:500 19px/1.4 'Instrument Sans',system-ui,sans-serif}
.bk-sticker-b{flex:none;display:inline-flex;align-items:center;min-height:48px;padding:0 20px;border-radius:12px;background:#141414;color:#FFC800;font:700 13px/1 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase}
@media (prefers-reduced-motion:reduce){.bk-sticker{transition:none}}
.bk-marge{display:none;position:fixed;top:110px;z-index:40;opacity:0;visibility:hidden;transform:translateY(8px);transition:opacity .25s,transform .25s,visibility 0s .25s}
.bk-marge.is-visible{opacity:1;visibility:visible;transform:none;transition:opacity .25s,transform .25s}
.bk-large .bk-marge{display:block}.bk-large .bk-texte{display:none}
@media (prefers-reduced-motion:reduce){.bk-marge,.bk-marge.is-visible{transition:none;transform:none}}
@media print{.bk-barre,.bk-barre-place,.bk-nav,.bk-marge,.bk-texte,.bk-bloc{display:none}}`;
  document.head.appendChild(style);

  // Un autocollant jaune dans le flux, le même à toutes les tailles d'écran.
  function bloc(classe, medium) {
    const aside = document.createElement('aside');
    aside.className = classe;
    aside.setAttribute('aria-label', 'kzumi, mon autre projet');
    aside.innerHTML = '<a class="bk-sticker" href="' + lien(medium) + '" target="_blank" rel="noopener">' +
      '<span class="bk-sticker-g"><span class="bk-sticker-e">Mon autre projet</span>' +
      '<span class="bk-sticker-m">kzumi</span>' +
      '<span class="bk-sticker-t">Une app pour comprendre l’argent en jouant.</span></span>' +
      '<span class="bk-sticker-b">kzumi.com ↗</span></a>';
    return aside;
  }

  // ------------ P1 · la barre ------------

  const reserve = document.querySelector('.bk-barre-place');
  let masquee = false;
  try {
    const le = Number(localStorage.getItem('bk-barre-masquee'));
    masquee = le > 0 && Date.now() - le < 30 * 864e5;
  } catch (e) { /* stockage bloqué : la barre s'affiche */ }
  if (masquee) {
    if (reserve) reserve.remove();
  } else {
    const barre = document.createElement('aside');
    barre.className = 'bk-barre';
    barre.setAttribute('aria-label', 'kzumi, mon autre projet');
    barre.innerHTML = '<a href="' + lien('barre') + '" target="_blank" rel="noopener">' +
      '<span class="bk-barre-mot">kzumi</span>' +
      '<span class="bk-barre-t"><span class="bk-long">L’app pour comprendre l’argent en jouant</span>' +
      '<span class="bk-court">L’argent en jouant</span></span>' +
      '<span class="bk-barre-cta">kzumi.com ↗</span></a>' +
      '<button type="button" aria-label="Masquer la barre kzumi">×</button>';
    barre.querySelector('button').addEventListener('click', () => {
      try { localStorage.setItem('bk-barre-masquee', String(Date.now())); } catch (e) { /* masquée pour cette visite seulement */ }
      barre.remove();
    });
    if (reserve) reserve.replaceWith(barre); else document.body.prepend(barre);
  }

  // ------------ P2 · le menu ------------

  const menu = document.querySelector('.mini-nav .links');
  if (menu) menu.insertAdjacentHTML('afterbegin', '<a class="bk-nav" href="' + lien('menu') + '" target="_blank" rel="noopener">kzumi ↗</a>');

  // ------------ articles et fiches : marge ou milieu du texte ------------
  // Mêmes intertitres que le sommaire (collectHeadings d'article-toc.js).

  function intertitres() {
    const selecteurs = ['section.block h2', 'main section h2', 'main h2', 'body > section h2'];
    const exclus = ['header', 'footer', '.hero', '.pod-hero', '.tldr', '.final-cta', '.mini-nav', '.article-end'];
    for (const sel of selecteurs) {
      const trouves = Array.from(document.querySelectorAll(sel)).filter((el) => !exclus.some((ex) => el.closest(ex)));
      if (trouves.length >= 3) return trouves;
    }
    return [];
  }

  if (article || fiche) {
    const medium = article ? 'article' : 'lexique';
    const h2s = intertitres();

    const marge = document.createElement('aside');
    marge.className = 'bk-marge';
    marge.setAttribute('aria-label', 'kzumi, mon autre projet');
    marge.innerHTML = '<p class="bk-etiquette">Mon autre projet</p><a href="' + lien(medium) + '" target="_blank" rel="noopener">' +
      '<img src="' + image('kzumi-vertical-300x600.webp') + '" srcset="' + srcset('kzumi-vertical-300x600') + '"' +
      ' width="300" height="600" loading="lazy" decoding="async" alt="' + ALT + '"></a>';
    document.body.appendChild(marge);

    // La marge n'est prise que si elle est vraiment libre : bord gauche du texte mesuré,
    // 24px du bord de l'écran, 32px avant le texte, 240px de large au moins (le texte des
    // fiches est plus large que celui des articles, vécu le 02-11).
    const reperes = h2s.length ? h2s : Array.from(document.querySelectorAll('main h2, main p'));
    function placerMarge() {
      const bords = reperes.map((e) => e.getBoundingClientRect().left).filter((x) => x > 0);
      const gauche = bords.length ? Math.min.apply(null, bords) : 0;
      const largeur = Math.min(300, gauche - 56);
      const libre = largeur >= 240 && innerHeight >= 140 + largeur * 2;
      document.documentElement.classList.toggle('bk-large', libre);
      if (libre) { marge.style.width = largeur + 'px'; marge.style.left = (gauche - 32 - largeur) + 'px'; }
    }
    placerMarge();
    let attente;
    addEventListener('resize', () => { clearTimeout(attente); attente = setTimeout(placerMarge, 150); });

    const hero = document.querySelector('.hero, .term-hero, .pod-hero');
    const fin = document.querySelector('.article-end') || Array.from(document.querySelectorAll('footer')).pop();
    let heroPasse = !hero;
    let finAtteinte = false;
    const maj = () => marge.classList.toggle('is-visible', heroPasse && !finAtteinte);
    if ('IntersectionObserver' in window) {
      if (hero) new IntersectionObserver(([e]) => { heroPasse = !e.isIntersecting && e.boundingClientRect.top < 0; maj(); }).observe(hero);
      if (fin) new IntersectionObserver(([e]) => { finAtteinte = e.isIntersecting || e.boundingClientRect.top < 0; maj(); }).observe(fin);
    } else {
      marge.classList.add('is-visible');
    }

    if (h2s.length >= 3) {
      let milieu = h2s[Math.floor(h2s.length / 2)];
      // Un « — Par où commencer » posé juste au-dessus appartient à l'intertitre : passer avant lui.
      const kicker = milieu.previousElementSibling;
      if (kicker && kicker.classList.contains('section-kicker')) milieu = kicker;
      milieu.parentNode.insertBefore(bloc('bk-texte', medium), milieu);
    }
  }

  // ------------ P5 · fin d'article ------------

  if (article) {
    const finArticle = document.querySelector('.article-end');
    finArticle.parentNode.insertBefore(bloc('bk-bloc', 'article-fin'), finArticle);
  }

  // ------------ P3 · milieu des pages principales ------------
  // Sections de premier niveau, où qu'elles soient rangées (Outils les met dans un .container).
  // Seulement sur une page d'au moins quatre écrans : sur News, Vidéos ou Quiz, ce bloc
  // collerait celui du pied de page.

  if (principale) {
    const sections = Array.from(document.querySelectorAll('section'))
      .filter((s) => !s.parentElement.closest('section') && !/hero/i.test(s.className) && !s.closest('footer') && s.offsetHeight > 0);
    if (sections.length >= 2 && document.documentElement.scrollHeight > 4 * innerHeight) {
      const milieu = sections[Math.max(1, Math.floor(sections.length / 2))];
      milieu.parentNode.insertBefore(bloc('bk-bloc', 'page'), milieu);
    }
  }

  // ------------ P6 · avant le pied de page ------------

  if (principale || fiche) {
    const pied = Array.from(document.querySelectorAll('footer')).pop();
    if (pied) pied.parentNode.insertBefore(bloc('bk-bloc', 'pied'), pied);
  }

  // ------------ P7 · page 404 ------------
  // Grand écran : dans la colonne vide de droite. Téléphone : la grille garde ses deux
  // colonnes, le bandeau y serait minuscule, il passe sous la page.

  if (introuvable) {
    const page404 = document.querySelector('main.notfound');
    if (innerWidth >= 768) page404.appendChild(bloc('bk-bloc', '404'));
    else page404.after(bloc('bk-bloc', '404'));
  }
})();
