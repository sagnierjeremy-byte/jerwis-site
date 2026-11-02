/* ============================================================
 * kzumi sur tout jerwis.fr (plans validés les 02-11-2026)
 * ------------------------------------------------------------
 * Un seul script pour toutes les pages FR. Selon la page :
 * - partout (P1) : une barre noire en tête de page, posée dans la
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

  const style = document.createElement('style');
  style.textContent = `
.bk-barre{display:flex;align-items:center;gap:10px;height:44px;box-sizing:border-box;background:#05090B;color:#F1F7FB;padding:0 max(16px,calc((100vw - 1240px) / 2));font:500 14px/1.2 Archivo,system-ui,sans-serif;position:relative;z-index:60}
.bk-barre a{display:flex;align-items:center;gap:12px;flex:1;min-width:0;color:inherit;text-decoration:none;border:0}
.bk-barre img{width:24px;height:24px;border-radius:6px;flex:none}
.bk-barre-t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bk-barre b{font-weight:800}.bk-barre em{font-style:normal;font-weight:700;color:#FFC800}
.bk-barre-cta{flex:none;background:#FFC800;color:#4A3800;font-weight:800;font-size:12.5px;padding:6px 12px;border-radius:999px}
.bk-barre button{flex:none;background:none;border:0;color:#8A9BA4;font-size:22px;line-height:1;padding:4px 6px;cursor:pointer}
.bk-barre a:focus-visible,.bk-barre button:focus-visible{outline:2px solid #FFC800;outline-offset:2px}
.bk-court{display:none}
@media (max-width:640px){.bk-long{display:none}.bk-court{display:inline}}
.mini-nav .links a.bk-nav{color:#FFC800;background:#05090B;border-radius:999px;padding:6px 12px}
.bk-etiquette{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;line-height:1.2;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-muted,#6E6E6E);margin:0 0 10px}
.bk-marge a,.bk-texte a,.bk-bloc a{display:block;border-radius:14px;border:0;text-decoration:none}
.bk-marge img,.bk-texte img,.bk-bloc img{display:block;width:100%;height:auto;border-radius:14px;box-shadow:0 0 0 1px color-mix(in srgb,var(--ink,#0A0A0A) 14%,transparent)}
.bk-marge a:focus-visible,.bk-texte a:focus-visible,.bk-bloc a:focus-visible{outline:3px solid var(--fuchsia,#EF426F);outline-offset:3px}
.bk-texte{max-width:360px;margin:8px auto 40px}
.bk-bloc{box-sizing:border-box;max-width:392px;padding:0 16px;margin:56px auto}
@media (min-width:768px){.bk-texte{max-width:970px}.bk-bloc{max-width:1010px;padding:0 20px}}
.bk-marge{display:none;position:fixed;top:110px;z-index:40;opacity:0;visibility:hidden;transform:translateY(8px);transition:opacity .25s,transform .25s,visibility 0s .25s}
.bk-marge.is-visible{opacity:1;visibility:visible;transform:none;transition:opacity .25s,transform .25s}
.bk-large .bk-marge{display:block}.bk-large .bk-texte{display:none}
@media (prefers-reduced-motion:reduce){.bk-marge,.bk-marge.is-visible{transition:none;transform:none}}
@media print{.bk-barre,.bk-barre-place,.bk-nav,.bk-marge,.bk-texte,.bk-bloc{display:none}}`;
  document.head.appendChild(style);

  // Un bandeau dans le flux : carré sous 768px, horizontal au-dessus.
  function bloc(classe, medium) {
    const aside = document.createElement('aside');
    aside.className = classe;
    aside.setAttribute('aria-label', 'kzumi, mon autre projet');
    aside.innerHTML = '<p class="bk-etiquette">Mon autre projet</p>' +
      '<a href="' + lien(medium) + '" target="_blank" rel="noopener">' +
      '<picture><source media="(min-width: 768px)" srcset="' + srcset('kzumi-horizontal-970x250') + '" width="970" height="250">' +
      '<img src="' + image('kzumi-carre-300x250.webp') + '" srcset="' + srcset('kzumi-carre-300x250') + '"' +
      ' width="300" height="250" loading="lazy" decoding="async" alt="' + ALT + '"></picture></a>';
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
      '<img src="' + image('kzumi-icone.svg') + '" width="24" height="24" alt="">' +
      '<span class="bk-barre-t"><span class="bk-long">J’ai créé <b>kzumi</b>, une app pour comprendre l’argent <em>en jouant.</em></span>' +
      '<span class="bk-court"><b>kzumi</b>, l’argent <em>en jouant.</em></span></span>' +
      '<span class="bk-barre-cta">kzumi.com →</span></a>' +
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
