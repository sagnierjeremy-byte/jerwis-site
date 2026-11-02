/*
  Article TOC sidebar + back-to-top + mobile bottom-sheet
  --------------------------------------------------------
  Zéro dépendance. S'auto-active si on trouve ≥3 H2 dans le contenu.
  - Desktop ≥1280px : sidebar fixed à droite
  - Mobile/tablette : bottom-sheet drawer + FAB allongé "Sommaire" bas-gauche
  - Back-to-top : bouton rond bas-droite
  - Mobile friendly : touch targets ≥44px, swipe-down close, safe-area iOS
*/

(function () {
  if (typeof window === 'undefined') return;

  // Libellés lang-aware (page EN sous /en/ → <html lang="en">)
  var isEN = document.documentElement.lang === 'en';
  var TOC_OPEN = isEN ? 'Open the contents' : 'Ouvrir le sommaire';
  var TOC_LABEL = isEN ? 'Contents' : 'Sommaire';
  var TOC_CLOSE = isEN ? 'Close the contents' : 'Fermer le sommaire';

  // ------------ helpers ------------

  function slugify(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'section';
  }

  function cleanTitle(el) {
    return el.textContent.trim().replace(/\s+/g, ' ');
  }

  function throttle(fn, ms) {
    let last = 0;
    let timeout = null;
    return function () {
      const now = Date.now();
      const remaining = ms - (now - last);
      if (remaining <= 0) {
        if (timeout) { clearTimeout(timeout); timeout = null; }
        last = now;
        fn();
      } else if (!timeout) {
        timeout = setTimeout(() => {
          last = Date.now();
          timeout = null;
          fn();
        }, remaining);
      }
    };
  }

  // ------------ collect headings ------------

  function collectHeadings() {
    const selectors = [
      'section.block h2',
      'main section h2',
      'main h2',
      'body > section h2',
    ];
    const excludeClosest = ['header', 'footer', '.hero', '.pod-hero', '.tldr', '.final-cta', '.mini-nav'];
    let h2s = [];
    for (const sel of selectors) {
      try {
        const found = Array.from(document.querySelectorAll(sel)).filter(el => {
          for (const ex of excludeClosest) if (el.closest(ex)) return false;
          return true;
        });
        if (found.length >= 3) { h2s = found; break; }
      } catch (e) { /* skip */ }
    }
    return h2s;
  }

  function ensureIds(h2s) {
    h2s.forEach((h, i) => {
      if (!h.id) {
        const base = slugify(cleanTitle(h));
        let id = base || ('section-' + (i + 1));
        let n = 1;
        while (document.getElementById(id) && document.getElementById(id) !== h) {
          id = base + '-' + (++n);
        }
        h.id = id;
      }
    });
  }

  function collectItems(h2s) {
    // items: [{ el, text, level }]
    const items = [];
    h2s.forEach((h2, idx) => {
      items.push({ el: h2, text: cleanTitle(h2), level: 2 });
      // récupère les h3 dans la même section parent
      const parent = h2.parentElement;
      if (!parent) return;
      const subH3s = parent.querySelectorAll(':scope h3');
      subH3s.forEach(h3 => {
        if (!h3.id) {
          const base = slugify(cleanTitle(h3));
          let id = (base || 'sub') + '-' + idx;
          let n = 1;
          while (document.getElementById(id)) id = base + '-' + idx + '-' + (++n);
          h3.id = id;
        }
        items.push({ el: h3, text: cleanTitle(h3), level: 3 });
      });
    });
    return items;
  }

  // ------------ DOM builders ------------

  function buildListItems(items, onClick) {
    const frag = document.createDocumentFragment();
    items.forEach(it => {
      const li = document.createElement('li');
      li.className = 'article-toc-item' + (it.level === 3 ? ' is-h3' : '');
      const a = document.createElement('a');
      a.href = '#' + it.el.id;
      a.textContent = it.text;
      if (onClick) a.addEventListener('click', e => onClick(e, it));
      li.appendChild(a);
      frag.appendChild(li);
    });
    return frag;
  }

  function smoothScrollTo(el, offset) {
    const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: 'smooth' });
    if (history.replaceState) history.replaceState(null, '', '#' + el.id);
  }

  function buildSidebar(items) {
    const aside = document.createElement('aside');
    aside.className = 'article-toc is-ready';
    aside.setAttribute('aria-label', 'Sommaire de l\'article');

    const label = document.createElement('div');
    label.className = 'article-toc-label';
    label.textContent = TOC_LABEL;
    aside.appendChild(label);

    // Barre de lecture et pourcentage lu (affichés sur les pages « revue », cachés ailleurs en CSS)
    const lu = document.createElement('div');
    lu.className = 'article-toc-lu';
    lu.innerHTML = '<span class="article-toc-lu-barre"><span></span></span><span class="article-toc-lu-pct">0 %</span>';
    aside.appendChild(lu);
    const barre = lu.querySelector('.article-toc-lu-barre span');
    const pct = lu.querySelector('.article-toc-lu-pct');
    let attente = false;
    const majLu = () => {
      attente = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.round(Math.min(100, Math.max(0, scrollY / max * 100))) : 0;
      barre.style.width = p + '%';
      pct.textContent = isEN ? p + '% read' : p + ' % lu';
    };
    addEventListener('scroll', () => { if (!attente) { attente = true; requestAnimationFrame(majLu); } }, { passive: true });
    majLu();

    const ol = document.createElement('ol');
    ol.className = 'article-toc-list';
    ol.appendChild(buildListItems(items, (e, it) => {
      e.preventDefault();
      smoothScrollTo(it.el, 90);
    }));
    aside.appendChild(ol);
    return aside;
  }

  function buildMobile(items) {
    // FAB
    const fab = document.createElement('button');
    fab.className = 'article-toc-fab is-ready';
    fab.type = 'button';
    fab.setAttribute('aria-label', TOC_OPEN);
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg><span>' + TOC_LABEL + '</span>';

    // Drawer (bottom sheet)
    const drawer = document.createElement('div');
    drawer.className = 'article-toc-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <div class="article-toc-drawer-backdrop" data-toc-close></div>
      <div class="article-toc-drawer-panel" role="dialog" aria-label="${TOC_LABEL}">
        <div class="article-toc-drawer-grab" aria-hidden="true"></div>
        <div class="article-toc-drawer-header">
          <div class="article-toc-label">${TOC_LABEL}</div>
          <button class="article-toc-drawer-close" type="button" aria-label="${TOC_CLOSE}" data-toc-close>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <ol class="article-toc-list"></ol>
      </div>
    `;

    const drawerList = drawer.querySelector('.article-toc-list');
    drawerList.appendChild(buildListItems(items, (e, it) => {
      e.preventDefault();
      closeDrawer();
      // Attendre que le drawer se ferme (animation 350ms) avant de scroller
      setTimeout(() => smoothScrollTo(it.el, 80), 320);
    }));

    function openDrawer() {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('article-toc-open');
    }
    function closeDrawer() {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('article-toc-open');
    }

    fab.addEventListener('click', openDrawer);
    drawer.addEventListener('click', e => {
      if (e.target.closest('[data-toc-close]')) closeDrawer();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
        fab.focus();
      }
    });

    // Swipe-down sur le panel pour fermer (mobile natif)
    const panel = drawer.querySelector('.article-toc-drawer-panel');
    let touchStartY = 0;
    let touchCurrentY = 0;
    let touchActive = false;
    panel.addEventListener('touchstart', e => {
      // Démarre le swipe seulement depuis le grab handle ou le header
      const target = e.target;
      if (target.closest('.article-toc-list') && panel.querySelector('.article-toc-list').scrollTop > 0) {
        return;
      }
      touchStartY = e.touches[0].clientY;
      touchCurrentY = touchStartY;
      touchActive = true;
    }, { passive: true });
    panel.addEventListener('touchmove', e => {
      if (!touchActive) return;
      touchCurrentY = e.touches[0].clientY;
      const dy = touchCurrentY - touchStartY;
      if (dy > 0) {
        panel.style.transform = `translateY(${dy}px)`;
        panel.style.transition = 'none';
      }
    }, { passive: true });
    panel.addEventListener('touchend', () => {
      if (!touchActive) return;
      touchActive = false;
      const dy = touchCurrentY - touchStartY;
      panel.style.transition = '';
      panel.style.transform = '';
      if (dy > 80) closeDrawer();
    });

    return { fab, drawer };
  }

  function buildBackToTop() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Remonter en haut de page');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return btn;
  }

  // ------------ Scroll spy via IntersectionObserver (zéro forced reflow) ------------

  function setupScrollSpy(items, sidebar, drawer) {
    const sidebarLis = sidebar.querySelectorAll('.article-toc-item');
    const drawerLis = drawer.querySelectorAll('.article-toc-item');
    const refs = items.map((it, i) => ({
      el: it.el,
      idx: i,
      lis: [sidebarLis[i], drawerLis[i]].filter(Boolean),
      passedAbove: false,
    }));
    const visible = new Set();

    let currentIdx = -1;
    function setActive(idx) {
      if (idx === currentIdx) return;
      if (currentIdx >= 0 && refs[currentIdx]) {
        refs[currentIdx].lis.forEach(l => l.classList.remove('is-active'));
      }
      if (idx >= 0 && refs[idx]) {
        refs[idx].lis.forEach(l => l.classList.add('is-active'));
      }
      currentIdx = idx;
    }

    // IO mesure les entrées/sorties sans forcer de reflow. Les `entry` exposent déjà
    // boundingClientRect → pas besoin d'appeler getBoundingClientRect (qui forcerait un reflow).
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        const idx = parseInt(e.target.dataset.tocIdx, 10);
        if (e.isIntersecting) {
          visible.add(idx);
          refs[idx].passedAbove = false;
        } else {
          visible.delete(idx);
          // Si sorti vers le haut (top négatif), marqué comme "déjà passé"
          refs[idx].passedAbove = e.boundingClientRect.top < 0;
        }
      });
      // Item actif = celui le plus haut parmi les visibles
      let best = -1;
      visible.forEach(i => { if (best < 0 || i < best) best = i; });
      // Si aucun visible : prendre le dernier "passé au-dessus"
      if (best < 0) {
        for (let i = refs.length - 1; i >= 0; i--) {
          if (refs[i].passedAbove) { best = i; break; }
        }
      }
      setActive(best);
    }, {
      rootMargin: '-110px 0px -65% 0px',
      threshold: 0,
    });

    refs.forEach((r) => {
      r.el.dataset.tocIdx = r.idx;
      io.observe(r.el);
    });
  }

  // FAB + back-to-top visibility via IntersectionObserver sur un sentinel
  function setupVisibility(fab, backToTop) {
    if (!fab && !backToTop) return;
    // Crée un sentinel invisible à 400px du haut. Quand il sort du viewport (scroll vers le bas),
    // on affiche les boutons. Pas de scroll listener, pas de reflow.
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:400px;left:0;width:1px;height:1px;pointer-events:none';
    document.body.appendChild(sentinel);

    const io = new IntersectionObserver((entries) => {
      const above = !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0;
      if (backToTop) backToTop.classList.toggle('is-visible', above);
    }, { threshold: 0 });
    io.observe(sentinel);

    // FAB Sommaire : seuil 600px → sentinel séparé
    if (fab) {
      const fabSentinel = document.createElement('div');
      fabSentinel.setAttribute('aria-hidden', 'true');
      fabSentinel.style.cssText = 'position:absolute;top:600px;left:0;width:1px;height:1px;pointer-events:none';
      document.body.appendChild(fabSentinel);
      const io2 = new IntersectionObserver((entries) => {
        const above = !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0;
        fab.classList.toggle('is-visible', above);
      }, { threshold: 0 });
      io2.observe(fabSentinel);
    }
  }

  // ------------ init ------------

  function init() {
    const h2s = collectHeadings();

    // Toujours installer le back-to-top, même si pas de TOC
    const backToTop = buildBackToTop();
    document.body.appendChild(backToTop);

    if (h2s.length < 3) {
      setupVisibility(null, backToTop);
      return;
    }

    ensureIds(h2s);
    const items = collectItems(h2s);

    const sidebar = buildSidebar(items);
    document.body.appendChild(sidebar);

    const { fab, drawer } = buildMobile(items);
    document.body.appendChild(fab);
    document.body.appendChild(drawer);

    setupScrollSpy(items, sidebar, drawer);
    setupVisibility(fab, backToTop);
  }

  // Différer l'init après le first paint pour libérer le main-thread.
  // requestIdleCallback si dispo (Chrome, Firefox, Edge), sinon setTimeout(0) fallback (Safari).
  function deferredInit() {
    const ric = window.requestIdleCallback || function (cb) { return setTimeout(cb, 1); };
    ric(init, { timeout: 2000 });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', deferredInit);
  } else {
    deferredInit();
  }
})();
