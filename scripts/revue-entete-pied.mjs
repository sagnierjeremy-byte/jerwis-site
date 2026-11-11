#!/usr/bin/env node
/**
 * revue-entete-pied.mjs — refonte « revue » (P3, novembre 2026).
 * Pose sur chaque page FR et EN le nouvel en-tête (ligne d'édition + menu habillé)
 * et le nouveau pied de page, et charge assets/revue.css.
 *
 * - Pages avec le menu commun (<!-- NAV-UNIFIED-START/END -->) : le bloc est habillé
 *   sur place (sceau + nom, bouton S'abonner, ligne d'édition), le reste du menu ne bouge pas.
 * - Articles générés (<header class="header">) et fiches du lexique (<header class="term-header">) :
 *   l'en-tête court est remplacé par le menu commun (pris dans index.html ou en/index.html),
 *   avec nav-v2.css, nav-v2.js et nav-dropdown.js.
 * - Pied de page (.footer#contact ou .term-footer) : remplacé par le pied « revue »,
 *   avec son formulaire d'inscription (/api/subscribe, source "footer").
 *   Un pied « revue » qui diffère de PIED est remis à la référence. Le formulaire porte
 *   la classe rv-pied-form, jamais newsletter-form : les scripts de plusieurs pages
 *   écoutent tous les .newsletter-form et l'inscription partait deux fois (vu le 02-11).
 * Idempotent : une page déjà à jour n'est pas réécrite.
 *
 * Usage : node scripts/revue-entete-pied.mjs [--dry] [--racine=<dossier>] [fichier.html …]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const racineArg = args.find((a) => a.startsWith('--racine='));
const ROOT = racineArg ? path.resolve(racineArg.slice(9)) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cibles = args.filter((a) => !a.startsWith('--'));
const DOSSIERS = ['.', 'articles', 'lexique', 'en', 'en/articles', 'en/lexique'];
// Pages autonomes, sans en-tête ni pied du site (liens.html : la page de liens de l'Instagram de Kévin et Jérémy).
const AUTONOMES = new Set(['liens.html']);
const VERSION = '20261102';

const SCEAU = '<svg class="rv-sceau-mini" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="49" fill="#141414"/>' +
  '<g transform="translate(50 50) scale(.72) translate(-50 -50)" fill="#EF426F"><circle cx="50" cy="50" r="14"/>' +
  '<polygon points="50,0 55,40 45,40"/><polygon points="100,50 60,55 60,45"/><polygon points="50,100 45,60 55,60"/><polygon points="0,50 40,45 40,55"/>' +
  '<polygon points="85,15 62,42 58,38"/><polygon points="85,85 58,62 62,58"/><polygon points="15,85 38,58 42,62"/><polygon points="15,15 42,38 38,42"/></g>' +
  '<circle cx="50" cy="50" r="4.5" fill="#141414"/></svg>';

const DATE_JS = '<script>(function(){var en=document.documentElement.lang==="en",d=new Date().toLocaleDateString(en?"en-US":"fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});' +
  'document.querySelectorAll("[data-rv-date]").forEach(function(e){e.textContent=(en?"Edition of ":"Édition du ")+d;});})();</script>';

const T = {
  fr: {
    edition: '<div class="rv-edition"><div class="rv-edition-in"><span data-rv-date>Édition de la semaine</span><span class="rv-edition-mid">IA · business · fait à Mougins</span><span>La lettre part vendredi à 9 h</span></div></div>',
    marque: `<a class="brand rv-marque" href="/" aria-label="Accueil, Jérémy Sagnier">${SCEAU}<span class="rv-nom">Jérémy Sagnier</span></a>`,
    sabonner: '<a href="/#newsletters" class="rv-sabonner">S\'abonner →</a>',
    reference: 'index.html',
  },
  en: {
    edition: '<div class="rv-edition"><div class="rv-edition-in"><span data-rv-date>This week\'s edition</span><span class="rv-edition-mid">AI · business · made in Mougins</span><span>The letter goes out Friday at 9 am</span></div></div>',
    marque: `<a class="brand rv-marque" href="/en" aria-label="Home, Jérémy Sagnier">${SCEAU}<span class="rv-nom">Jérémy Sagnier</span></a>`,
    sabonner: '<a href="/en#newsletters" class="rv-sabonner">Subscribe →</a>',
    reference: 'en/index.html',
  },
};

const FORM_JS = `<script>
    document.querySelectorAll('.rv-pied .rv-pied-form').forEach(function(form) {
      if (form.dataset.attached === '1') return;
      form.dataset.attached = '1';
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (form.querySelector('input[name="website"]').value) return;
        var emailEl = form.querySelector('input[name="email"]');
        var btn = form.querySelector('button[type="submit"]');
        var email = (emailEl.value || '').trim();
        var originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '...';
        try {
          var res = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, source: form.dataset.source || 'footer' }),
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          btn.textContent = btn.dataset.ok;
          setTimeout(function() { btn.textContent = originalText; btn.disabled = false; form.reset(); }, 2500);
        } catch (err) {
          btn.textContent = btn.dataset.ko;
          setTimeout(function() { btn.textContent = originalText; btn.disabled = false; }, 2500);
        }
      });
    });
  </script>`;

const PIED = {
  fr: `<footer class="rv-pied" id="contact">
  <div class="rv-pied-in">
    <div class="rv-pied-lettre">
      <div>
        <h2>La lettre du <em>vendredi.</em></h2>
        <p>Mes vrais usages de l'IA et mes articles dès qu'ils sortent. Gratuit, désinscription en 1 clic.</p>
      </div>
      <form class="rv-pied-form" data-source="footer">
        <input type="email" name="email" placeholder="prenom@exemple.fr" required inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" aria-label="Ton adresse e-mail">
        <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
        <button type="submit" data-ok="Inscrit ✓" data-ko="Réessaie">M'inscrire →</button>
      </form>
    </div>
    <nav class="rv-pied-cols" aria-label="Plan du site">
      <div><h3>Lire</h3><a href="/apprendre">Parcours débutant</a><a href="/articles">Tous les articles</a><a href="/lexique">Lexique de l'IA</a><a href="/modeles-ia">Guide des modèles IA</a></div>
      <div><h3>Produits et outils</h3><a href="/precommande-photos-personal-branding">Générateur photos · 39 €</a><a href="/outils">Ma stack outils</a><a href="/claude-code">Guide Claude Code</a><a href="/podcast">Podcast Guerres d'IA</a><a href="/github">Mon GitHub</a></div>
      <div><h3>Me suivre</h3><a href="https://www.linkedin.com/in/j%C3%A9r%C3%A9my-sagnier/" target="_blank" rel="noopener">LinkedIn</a><a href="https://www.youtube.com/@kevinetjeremysagnier" target="_blank" rel="noopener">YouTube · Frères Sagnier</a><a href="https://www.youtube.com/@jeremy-sagnier" target="_blank" rel="noopener">YouTube · Jérémy</a><a href="https://www.instagram.com/jeremy.sagnier/" target="_blank" rel="noopener">Instagram</a></div>
      <div><h3>Direct et légal</h3><a href="/preferences">Préférences</a><a href="/mentions-legales">Mentions légales</a><a href="/politique-confidentialite">Confidentialité</a><a href="/cgv">CGV</a><a href="/suppression-donnees">Supprimer mes données</a></div>
    </nav>
    <div class="rv-pied-bas"><span>© 2026 Jérémy Sagnier · fait à Mougins</span><a href="mailto:jeremy.sagnier@jerwis.fr">Écris-moi, je lis tout</a></div>
    <div class="rv-pied-mot" aria-hidden="true">jerwis<span>.</span></div>
    <div class="rv-bandes" aria-hidden="true"><span></span><span></span><span></span></div>
  </div>
  ${FORM_JS}
</footer>`,
  en: `<footer class="rv-pied" id="contact">
  <div class="rv-pied-in">
    <div class="rv-pied-lettre">
      <div>
        <h2>The <em>Friday letter.</em></h2>
        <p>How I really use AI, and my articles as soon as they are out. Free, one-click unsubscribe.</p>
      </div>
      <form class="rv-pied-form" data-source="footer-en">
        <input type="email" name="email" placeholder="name@example.com" required inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" aria-label="Your email address">
        <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
        <button type="submit" data-ok="Subscribed ✓" data-ko="Try again">Subscribe →</button>
      </form>
    </div>
    <nav class="rv-pied-cols" aria-label="Site map">
      <div><h3>Read</h3><a href="/en/apprendre">Beginner path</a><a href="/en/articles">All articles</a><a href="/en/lexique">AI glossary</a><a href="/en/modeles-ia">AI models guide</a></div>
      <div><h3>Products and tools</h3><a href="/en/precommande-photos-personal-branding">Photo generator · €39</a><a href="/en/outils">My tool stack</a><a href="/en/claude-code">Claude Code guide</a><a href="/podcast">AI Wars podcast</a><a href="/en/github">My GitHub</a></div>
      <div><h3>Follow me</h3><a href="https://www.linkedin.com/in/j%C3%A9r%C3%A9my-sagnier/" target="_blank" rel="noopener">LinkedIn</a><a href="https://www.youtube.com/@kevinetjeremysagnier" target="_blank" rel="noopener">YouTube · Sagnier brothers</a><a href="https://www.youtube.com/@jeremy-sagnier" target="_blank" rel="noopener">YouTube · Jérémy</a><a href="https://www.instagram.com/jeremy.sagnier/" target="_blank" rel="noopener">Instagram</a></div>
      <div><h3>Contact and legal</h3><a href="/en/preferences">Preferences</a><a href="/en/mentions-legales">Legal notice</a><a href="/en/politique-confidentialite">Privacy</a><a href="/en/cgv">Terms of sale</a><a href="/en/suppression-donnees">Delete my data</a></div>
    </nav>
    <div class="rv-pied-bas"><span>© 2026 Jérémy Sagnier · made in Mougins</span><a href="mailto:jeremy.sagnier@jerwis.fr">Write to me, I read everything</a></div>
    <div class="rv-pied-mot" aria-hidden="true">jerwis<span>.</span></div>
    <div class="rv-bandes" aria-hidden="true"><span></span><span></span><span></span></div>
  </div>
  ${FORM_JS}
</footer>`,
};

function compter(texte, re) { return (texte.match(re) || []).length; }

function habillerBloc(bloc, l) {
  if (bloc.includes('rv-nav')) return bloc;
  let b = bloc.replace('<!-- NAV-UNIFIED-START -->', '<!-- NAV-UNIFIED-START -->\n' + T[l].edition + '\n' + DATE_JS);
  const avant = b;
  b = b.replace(/<nav class="mini-nav"/, '<nav class="mini-nav rv-nav"');
  b = b.replace(/<a class="brand brand-stamp"[^>]*>[\s\S]*?<\/a>/, T[l].marque);
  b = b.replace(/<a href="(?:\/en)?\/?(?:index)?#newsletters">[^<]*<\/a>/, T[l].sabonner);
  if (avant === b || !b.includes('rv-marque') || !b.includes('rv-sabonner')) throw new Error('menu commun non reconnu');
  return b;
}

const BLOC_RE = /<!-- NAV-UNIFIED-START -->[\s\S]*?<!-- NAV-UNIFIED-END -->/;
const references = {};
function blocReference(l) {
  if (!references[l]) {
    const t = fs.readFileSync(path.join(ROOT, T[l].reference), 'utf8');
    const m = t.match(BLOC_RE);
    if (!m) throw new Error('menu commun introuvable dans ' + T[l].reference);
    references[l] = habillerBloc(m[0], l).replace(/ aria-current="page"/g, '');
  }
  return references[l];
}

function prefixe(t, fichier) {
  const m = t.match(/<link rel="stylesheet" href="([^"]*)assets\/fonts\.css">/);
  if (m) return m[1];
  return fichier.includes('/') ? '/' : '';
}

// Habille une page déjà en mémoire (utilisé aussi par build-lexique.js et build-podcast-page.js).
// rel : chemin de la page depuis la racine du site (sert seulement au préfixe des feuilles de style).
export function habillerHtml(t, rel) {
  const l = /<html[^>]*\blang="en"/.test(t) ? 'en' : 'fr';
  const p = prefixe(t, rel);
  const notes = [];

  if (!t.includes('assets/revue.css')) {
    const lienFonts = t.match(/<link rel="stylesheet" href="[^"]*assets\/fonts\.css">/);
    const lien = `<link rel="stylesheet" href="${p}assets/revue.css?v=${VERSION}">`;
    t = lienFonts ? t.replace(lienFonts[0], lienFonts[0] + '\n' + lien) : t.replace('</head>', lien + '\n</head>');
    notes.push('revue.css');
  }

  // Une page anglaise traduite depuis le français peut arriver avec l'en-tête ou le pied
  // français (la traduction reprend toute la page) : on les remet en anglais.
  // Une page anglaise traduite depuis le français arrive avec un en-tête et un pied traduits
  // à la main par le modèle (ou restés en français) : on remet toujours ceux de référence.
  if (l === 'en' && rel !== T.en.reference && BLOC_RE.test(t) && /rv-nav/.test(t.match(BLOC_RE)[0]) && t.match(BLOC_RE)[0] !== blocReference('en')) {
    t = t.replace(BLOC_RE, () => blocReference('en'));
    notes.push('menu anglais de référence');
  }
  // Pied déjà « revue » mais différent de la référence (traduction, ou PIED modifié ici) : on le remet.
  const piedActuel = t.match(/<footer class="rv-pied"[^>]*>[\s\S]*?<\/footer>/);
  if (piedActuel && piedActuel[0] !== PIED[l]) {
    t = t.replace(piedActuel[0], () => PIED[l]);
    notes.push('pied de référence');
  }

  if (BLOC_RE.test(t)) {
    const bloc = t.match(BLOC_RE)[0];
    const neuf = habillerBloc(bloc, l);
    if (neuf !== bloc) { t = t.replace(bloc, () => neuf); notes.push('menu habillé'); }
  } else {
    const entete = t.match(/<header class="(?:header|term-header)"[^>]*>[\s\S]*?<\/header>/);
    if (entete) {
      t = t.replace(entete[0], () => blocReference(l));
      if (!t.includes('assets/nav-v2.css')) t = t.replace(`assets/revue.css?v=${VERSION}">`, `assets/revue.css?v=${VERSION}">\n<link rel="stylesheet" href="${p}assets/nav-v2.css?v=20260520-dropdown">`);
      const scripts = [];
      if (!t.includes('assets/nav-v2.js')) scripts.push(`<script src="${p}assets/nav-v2.js" defer></script>`);
      if (!t.includes('assets/nav-dropdown.js')) scripts.push(`<script src="${p}assets/nav-dropdown.js?v=20260520-dropdown" defer></script>`);
      if (scripts.length) t = t.replace(/<\/body>(?![\s\S]*<\/body>)/, scripts.join('\n') + '\n</body>');
      notes.push('en-tête remplacé');
    } else if (!t.includes('rv-nav')) {
      notes.push('AUCUN EN-TÊTE');
    }
  }

  if (!t.includes('class="rv-pied"')) {
    const pied = t.match(/<footer class="(?:footer|term-footer)"[^>]*>[\s\S]*?<\/footer>/);
    if (pied) { t = t.replace(pied[0], () => PIED[l]); notes.push('pied remplacé'); }
    else if (t.includes('</main>')) { t = t.replace(/<\/main>(?![\s\S]*<\/main>)/, () => '</main>\n' + PIED[l]); notes.push('pied ajouté'); }
    else notes.push('AUCUN PIED');
  }
  return { t, l, notes };
}

function traiter(rel) {
  const fichier = path.join(ROOT, rel);
  const avant = fs.readFileSync(fichier, 'utf8');
  const { t, l, notes } = habillerHtml(avant, rel);
  if (t !== avant && !DRY) fs.writeFileSync(fichier, t);
  return { rel, l, change: t !== avant, notes };
}

function lister() {
  if (cibles.length) return cibles;
  const out = [];
  for (const d of DOSSIERS) {
    const dir = path.join(ROOT, d);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      if (!f.endsWith('.html')) continue;
      if (f.startsWith('_') && f !== '_TEMPLATE.html') continue;
      if (d === '.' && AUTONOMES.has(f)) continue;
      out.push(d === '.' ? f : d + '/' + f);
    }
  }
  return out;
}

const lanceEnDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (lanceEnDirect) {
  const bilan = { changes: 0, inchanges: 0, alertes: [] };
  for (const rel of lister()) {
    try {
      const r = traiter(rel);
      if (r.change) bilan.changes++; else bilan.inchanges++;
      if (r.notes.some((n) => n.startsWith('AUCUN'))) bilan.alertes.push(`${rel} : ${r.notes.join(', ')}`);
      if (args.includes('--detail')) console.log(`${r.change ? '✎' : '·'} ${rel} [${r.l}] ${r.notes.join(', ')}`);
    } catch (e) {
      bilan.alertes.push(`${rel} : ERREUR ${e.message}`);
    }
  }
  console.log(`${DRY ? '(à blanc) ' : ''}${bilan.changes} page(s) modifiée(s), ${bilan.inchanges} déjà à jour.`);
  if (bilan.alertes.length) console.log('À regarder :\n  ' + bilan.alertes.join('\n  '));
}
