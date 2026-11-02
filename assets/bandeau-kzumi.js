/* ============================================================
 * Bandeau kzumi dans les articles (plan validé le 02-11-2026)
 * ------------------------------------------------------------
 * - Écran ≥1460px de large et ≥760px de haut : le bandeau vertical
 *   fixé dans la marge gauche, face au sommaire (.article-toc, à droite).
 *   Il apparaît une fois le hero passé et s'efface quand .article-end
 *   arrive à l'écran.
 * - Plus petit : un bloc avant l'intertitre du milieu (carré sur
 *   téléphone, horizontal dès 768px), seulement s'il y a ≥3 intertitres.
 * - Lien, images et étiquette ne vivent qu'ici : changer une ligne
 *   change les 72 articles. Images dans assets/pub/.
 * Chargé en defer juste après ai-summarize.js (voir _TEMPLATE.html),
 * ajouté aux articles par scripts/ajouter-bandeau-kzumi.mjs.
 * ============================================================ */
(function () {
  'use strict';

  // La traduction EN (translate-article-en.mjs) recopie les scripts de l'article FR :
  // le bandeau est en français, il reste sur les pages FR.
  if (document.documentElement.lang !== 'fr') return;
  if (document.querySelector('.bk-marge, .bk-texte')) return;
  const tag = document.querySelector('script[src*="bandeau-kzumi.js"]');
  if (!tag) return;

  const LIEN = 'https://kzumi.com/?utm_source=jerwis&utm_medium=article&utm_campaign=bandeau';
  const ALT = 'kzumi, comprends l’argent en jouant. Budget, épargne, crédit, arnaques, puis la bourse. Sur kzumi.com, App Store et Google Play.';
  const image = (nom) => new URL('pub/' + nom, tag.src).href;
  const srcset = (nom) => image(nom + '.webp') + ' 1x, ' + image(nom + '@2x.webp') + ' 2x';

  const style = document.createElement('style');
  style.textContent = `
.bk-etiquette{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;line-height:1.2;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-muted,#6E6E6E);margin:0 0 10px}
.bk-marge a,.bk-texte a{display:block;border-radius:14px;border:0;text-decoration:none}
.bk-marge img,.bk-texte img{display:block;width:100%;height:auto;border-radius:14px;box-shadow:0 0 0 1px color-mix(in srgb,var(--ink,#0A0A0A) 14%,transparent)}
.bk-marge a:focus-visible,.bk-texte a:focus-visible{outline:3px solid var(--fuchsia,#EF426F);outline-offset:3px}
.bk-texte{max-width:360px;margin:8px auto 40px}
@media (min-width:768px){.bk-texte{max-width:970px}}
.bk-marge{--bk-l:clamp(240px,calc((100vw - 880px) / 2 - 56px),300px);display:none;position:fixed;top:110px;left:max(24px,calc((100vw - 880px) / 2 - var(--bk-l) - 32px));width:var(--bk-l);z-index:40;opacity:0;visibility:hidden;transform:translateY(8px);transition:opacity .25s,transform .25s,visibility 0s .25s}
.bk-marge.is-visible{opacity:1;visibility:visible;transform:none;transition:opacity .25s,transform .25s}
@media (min-width:1460px) and (min-height:760px){.bk-marge{display:block}.bk-texte{display:none}}
@media (prefers-reduced-motion:reduce){.bk-marge,.bk-marge.is-visible{transition:none;transform:none}}
@media print{.bk-marge,.bk-texte{display:none}}`;
  document.head.appendChild(style);

  function bloc(classe, contenu) {
    const aside = document.createElement('aside');
    aside.className = classe;
    aside.setAttribute('aria-label', 'kzumi, mon autre projet');
    aside.innerHTML = '<p class="bk-etiquette">Mon autre projet</p>' +
      '<a href="' + LIEN + '" target="_blank" rel="noopener">' + contenu + '</a>';
    return aside;
  }

  // ------------ marge gauche, grand écran ------------

  const marge = bloc('bk-marge',
    '<img src="' + image('kzumi-vertical-300x600.webp') + '" srcset="' + srcset('kzumi-vertical-300x600') + '"' +
    ' width="300" height="600" loading="lazy" decoding="async" alt="' + ALT + '">');
  document.body.appendChild(marge);

  const hero = document.querySelector('.hero');
  const fin = document.querySelector('.article-end') || document.querySelector('footer');
  let heroPasse = !hero;
  let finAtteinte = false;
  const maj = () => marge.classList.toggle('is-visible', heroPasse && !finAtteinte);
  if ('IntersectionObserver' in window) {
    if (hero) new IntersectionObserver(([e]) => {
      heroPasse = !e.isIntersecting && e.boundingClientRect.top < 0;
      maj();
    }).observe(hero);
    if (fin) new IntersectionObserver(([e]) => {
      finAtteinte = e.isIntersecting || e.boundingClientRect.top < 0;
      maj();
    }).observe(fin);
  } else {
    marge.classList.add('is-visible');
  }

  // ------------ dans le texte, téléphone et tablette ------------
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

  const h2s = intertitres();
  if (h2s.length >= 3) {
    let milieu = h2s[Math.floor(h2s.length / 2)];
    // Un « — Par où commencer » posé juste au-dessus appartient à l'intertitre : passer avant lui.
    const kicker = milieu.previousElementSibling;
    if (kicker && kicker.classList.contains('section-kicker')) milieu = kicker;
    milieu.parentNode.insertBefore(bloc('bk-texte',
      '<picture><source media="(min-width: 768px)" srcset="' + srcset('kzumi-horizontal-970x250') + '" width="970" height="250">' +
      '<img src="' + image('kzumi-carre-300x250.webp') + '" srcset="' + srcset('kzumi-carre-300x250') + '"' +
      ' width="300" height="250" loading="lazy" decoding="async" alt="' + ALT + '"></picture>'), milieu);
  }
})();
