/**
 * build-lexique-en.js — équivalent EN de scripts/build-lexique.js.
 *
 * Génère la version anglaise du lexique depuis data/lexique-en.json (mêmes slugs,
 * structure et champs que lexique.json, seuls les champs texte traduits) :
 *   - écrit en/lexique/<slug>.html pour chaque terme page:true (marqueur generated)
 *   - injecte la liste A-Z + les cartes express + le schema DefinedTermSet dans
 *     en/lexique.html (entre les mêmes markers) SI ce shell existe déjà
 *
 * Les URLs pointent /en/... . Le sitemap EN est géré séparément par build-sitemaps.mjs
 * (qui parcourt en/*.html). Après génération, lancer gen-en-page.mjs sur chaque fiche
 * pour hreflang + lang-toggle (canonical/lang/locale sont déjà posés ici).
 *
 * Usage : node scripts/i18n/build-lexique-en.js [--check]
 */
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SITE_URL = "https://jerwis.fr";
const TODAY = "2026-05-22";
const DATA_PATH = join(ROOT, "data", "lexique-en.json");
const MODELS_PATH = join(ROOT, "data", "lexique-models-en.json");
const HUB_PATH = join(ROOT, "en", "lexique.html");
const OUT_DIR = join(ROOT, "en", "lexique");
const HUB_START = "<!-- LEXIQUE_AZ_GENERATED_START -->";
const HUB_END = "<!-- LEXIQUE_AZ_GENERATED_END -->";
const EXPRESS_START = "<!-- LEXIQUE_EXPRESS_GENERATED_START -->";
const EXPRESS_END = "<!-- LEXIQUE_EXPRESS_GENERATED_END -->";
const GENERATED_MARKER = "<!-- generated:lexique-term -->";
const ESSENTIALS_ANCHORS = new Set(["cli", "plugin"]);

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function slugFirstLetter(title) {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .charAt(0)
    .toUpperCase();
}

function publicUrl(term) {
  if (ESSENTIALS_ANCHORS.has(term.slug)) return `${SITE_URL}/en/lexique-essentiels#${term.slug}`;
  return term.page ? `${SITE_URL}/en/lexique/${term.slug}` : `${SITE_URL}/en/lexique#${term.slug}`;
}

function hubHref(term) {
  if (ESSENTIALS_ANCHORS.has(term.slug)) return `lexique-essentiels.html#${term.slug}`;
  return term.page ? `lexique/${term.slug}.html` : `lexique.html#${term.slug}`;
}

function termPageHref(term) {
  if (ESSENTIALS_ANCHORS.has(term.slug)) return `../lexique-essentiels.html#${term.slug}`;
  return term.page ? `${term.slug}.html` : `../lexique.html#${term.slug}`;
}

function compactDescription(term) {
  const raw = `${term.summary} Concrete example, common mistakes, and related words.`;
  if (raw.length <= 145) return raw;
  const truncated = raw.slice(0, 142);
  return `${truncated.slice(0, truncated.lastIndexOf(" "))}...`;
}

function normalizeSearch(term) {
  return [term.title, term.category, term.summary, term.where, ...(term.aliases || [])]
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[./_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validate(data) {
  const errors = [];
  const slugs = new Set();
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!Array.isArray(data.terms)) errors.push("data.terms doit être un tableau.");

  for (const term of data.terms || []) {
    if (!term.slug || !slugPattern.test(term.slug)) errors.push(`Slug invalide: ${term.slug}`);
    if (slugs.has(term.slug)) errors.push(`Slug dupliqué: ${term.slug}`);
    slugs.add(term.slug);
    for (const key of ["title", "category", "summary", "where"]) {
      if (!term[key]) errors.push(`${term.slug}: champ manquant ${key}`);
    }
    if (term.page) {
      for (const key of ["intent", "angle", "example", "why"]) {
        if (!term[key]) errors.push(`${term.slug}: champ SEO manquant ${key}`);
      }
      if (!Array.isArray(term.mistakes) || term.mistakes.length < 3) {
        errors.push(`${term.slug}: au moins 3 erreurs fréquentes attendues`);
      }
      if (!Array.isArray(term.related) || term.related.length < 3) {
        errors.push(`${term.slug}: au moins 3 termes liés attendus`);
      }
    }
  }

  for (const term of data.terms || []) {
    for (const related of term.related || []) {
      if (!slugs.has(related)) errors.push(`${term.slug}: related introuvable ${related}`);
    }
  }

  if (errors.length) {
    throw new Error(errors.map((error) => `- ${error}`).join("\n"));
  }
}

function groupByLetter(terms) {
  return terms
    .toSorted((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }))
    .reduce((groups, term) => {
      const letter = slugFirstLetter(term.title);
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter).push(term);
      return groups;
    }, new Map());
}

function renderAzList(terms) {
  const groups = groupByLetter(terms);
  const blocks = Array.from(groups.entries()).map(([letter, termsForLetter]) => {
    const rows = termsForLetter.map((term) => {
      const badge = term.page ? "Detailed page" : "Express definition";
      const href = hubHref(term);
      const groupsAttr = ["all", ...(term.page ? ["pages"] : []), ...(term.groups || [])].join(" ");
      return `          <li class="lex-az-term" data-term-id="${escapeAttr(term.slug)}" data-term-letter="${escapeAttr(letter)}" data-term-groups="${escapeAttr(groupsAttr)}" data-term-search="${escapeAttr(normalizeSearch(term))}">
            <a href="${escapeAttr(href)}">
              <span>
                <strong>${escapeHtml(term.title)}</strong>
                <small>${escapeHtml(term.summary)}</small>
              </span>
              <em>${escapeHtml(badge)}</em>
            </a>
          </li>`;
    }).join("\n");
    return `      <section class="lex-letter-group" data-lex-az-group="${escapeAttr(letter)}" aria-labelledby="lex-letter-${escapeAttr(letter.toLowerCase())}">
        <h3 id="lex-letter-${escapeAttr(letter.toLowerCase())}">${escapeHtml(letter)}</h3>
        <ul class="lex-term-list">
${rows}
        </ul>
      </section>`;
  }).join("\n");

  return `${HUB_START}
      <div class="lex-az-list" id="lexAzList" aria-label="Full alphabetical glossary list">
${blocks}
      </div>
${HUB_END}`;
}

function renderExpressCards(terms) {
  const cards = terms
    .filter((term) => !(term.groups || []).includes("essentials"))
    .map((term) => `      <article class="lex-card" id="${escapeAttr(term.slug)}">
        <div class="lex-card-cat">— ${escapeHtml(term.category)}</div>
        <h3>${escapeHtml(term.title)}</h3>
        <p>${escapeHtml(term.summary)}</p>
        <p class="lex-card-where"><strong>Where you'll run into it</strong>: ${escapeHtml(term.where)}</p>
      </article>`)
    .join("\n\n");

  return `${EXPRESS_START}
${cards}
${EXPRESS_END}`;
}

function renderDefinedTermSet(data) {
  const hasDefinedTerm = data.terms.map((term) => ({
    "@type": "DefinedTerm",
    "name": term.title,
    "url": publicUrl(term),
    "description": term.summary,
    "inDefinedTermSet": `${SITE_URL}/en/lexique#termset`,
  }));

  const schema = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${SITE_URL}/en/lexique#termset`,
    "name": "AI glossary for non-devs",
    "description": `${data.terms.length} AI, agent and tool words explained in plain English, with search, an A-Z index, filters and detailed pages for the key concepts.`,
    "inLanguage": "en-US",
    "url": `${SITE_URL}/en/lexique`,
    "author": {
      "@type": "Person",
      "name": "Jérémy Sagnier",
      "url": `${SITE_URL}/en`,
    },
    hasDefinedTerm,
  };

  return `<!-- Schema.org : DefinedTermSet (glossaire) -->
<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>`;
}

function renderRelatedLink(current, related) {
  const href = termPageHref(related);
  return `<a href="${escapeAttr(href)}">${escapeHtml(related.title)}</a>`;
}

function renderTermPage(term, allTerms) {
  const related = (term.related || [])
    .map((slug) => allTerms.find((candidate) => candidate.slug === slug))
    .filter(Boolean);
  const relatedLinks = related.map((item) => renderRelatedLink(term, item)).join("");
  const compareLinks = related.slice(0, 2);
  const canonical = `${SITE_URL}/en/lexique/${term.slug}`;
  const title = `${term.title}: a simple AI definition · Jerwis glossary`;
  const description = compactDescription(term);
  const faq = [
    {
      q: `What is ${term.title} in AI?`,
      a: term.summary,
    },
    {
      q: `Where will I run into ${term.title}?`,
      a: term.where,
    },
    {
      q: `Which word should I read next?`,
      a: related.length ? `Start with ${related.slice(0, 3).map((item) => item.title).join(", ")}.` : "Head back to the A-Z glossary to keep going.",
    },
  ];
  const graphItems = [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/en` },
        { "@type": "ListItem", "position": 2, "name": "AI glossary", "item": `${SITE_URL}/en/lexique` },
        { "@type": "ListItem", "position": 3, "name": term.title, "item": canonical },
      ],
    },
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      "url": canonical,
      "name": title,
      "description": description,
      "inLanguage": "en-US",
      "isPartOf": { "@id": `${SITE_URL}/en/lexique#termset` },
      "mainEntity": { "@id": `${canonical}#term` },
    },
    {
      "@type": "DefinedTerm",
      "@id": `${canonical}#term`,
      "name": term.title,
      "description": term.summary,
      "url": canonical,
      "inDefinedTermSet": `${SITE_URL}/en/lexique#termset`,
    },
  ];

  if (faq.length > 0) {
    graphItems.push({
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      "mainEntity": faq.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a,
        },
      })),
    });
  }

  const definedTerm = {
    "@context": "https://schema.org",
    "@graph": graphItems,
  };

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(description)}">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${escapeAttr(description)}">
<meta property="og:url" content="${escapeAttr(canonical)}">
<meta property="og:type" content="article">
<meta property="og:locale" content="en_US">
<meta property="og:image" content="${SITE_URL}/photos/og-jerwis.jpg">
<meta property="og:image:height" content="630">
<meta property="og:image:width" content="1200">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@JeremySagnier">
<meta name="twitter:creator" content="@JeremySagnier">
<meta name="twitter:title" content="${escapeAttr(title)}">
<meta name="twitter:description" content="${escapeAttr(description)}">
<meta name="twitter:image" content="${SITE_URL}/photos/og-jerwis.jpg">
<link rel="canonical" href="${escapeAttr(canonical)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0A0A0A">
<link rel="stylesheet" href="/assets/fonts.css">
<link rel="stylesheet" href="/assets/lexique-pages.css">
<script type="application/ld+json">
${JSON.stringify(definedTerm, null, 2)}
</script>
</head>
<body>
${GENERATED_MARKER}
<div class="triple-stripe" aria-hidden="true"><span style="background:#00B2A9"></span><span style="background:#EF426F"></span><span style="background:#FF8200"></span></div>
<header class="term-header">
  <a class="term-logo" href="../index.html"><span></span>Jerwis</a>
  <nav aria-label="Navigation">
    <a href="../apprendre.html">Learn</a>
    <a href="../lexique.html">AI glossary</a>
    <a href="../index.html#newsletters">Newsletters</a>
  </nav>
</header>

<main>
  <section class="term-hero">
    <div class="term-container">
      <a class="term-back" href="../lexique.html">← Back to the A-Z glossary</a>
      <div class="term-kicker">AI glossary · ${escapeHtml(term.priority || "Definition")}</div>
      <h1>${escapeHtml(term.title)}</h1>
      <p class="term-lead">${escapeHtml(term.summary)}</p>
      <div class="term-meta">
        <span>${escapeHtml(term.category)}</span>
        <span>4 min read</span>
        <span>Updated ${term.lastmod || TODAY}</span>
      </div>
    </div>
  </section>

  <div class="mini-marquee" aria-hidden="true">
    <div class="mini-marquee-track">
      <span>Simple definition</span><span>Concrete example</span><span>Common mistakes</span><span>Related words</span><span>Back to the glossary</span>
      <span>Simple definition</span><span>Concrete example</span><span>Common mistakes</span><span>Related words</span><span>Back to the glossary</span>
    </div>
  </div>

  <section class="term-definition">
    <div class="term-container">
      <span class="section-kicker">— Definition</span>
      <h2>${escapeHtml(term.title)}, in plain words</h2>
      <p>${escapeHtml(term.summary)}</p>
      <p>${escapeHtml(term.angle)}</p>
    </div>
  </section>

  <div class="term-container term-layout">
    <article class="term-content">
      <section>
        <h2>A concrete example</h2>
        <p>${escapeHtml(term.example)}</p>
      </section>

      <section>
        <h2>Why it matters</h2>
        <p>${escapeHtml(term.why)}</p>
        <p>${escapeHtml(term.where)}</p>
      </section>

      <section>
        <h2>Don't mix it up with</h2>
        ${compareLinks.map((item) => `<p><strong>${escapeHtml(item.title)}</strong>: ${escapeHtml(item.summary)}</p>`).join("\n        ")}
      </section>

      <section>
        <h2>Common mistakes</h2>
        <ul>
          ${(term.mistakes || []).map((mistake) => `<li>${escapeHtml(mistake)}</li>`).join("\n          ")}
        </ul>
      </section>

      <section>
        <h2>Quick checklist</h2>
        <ul>
          <li>First I check whether the word names a concept, a tool, a risk, or a metric.</li>
          <li>I tie it to a concrete case: ${escapeHtml(term.example)}</li>
          <li>I keep the main trap in mind: ${escapeHtml((term.mistakes || [])[0] || "don't use the word out of context.")}</li>
        </ul>
      </section>

      <section class="term-faq">
        <h2>Quick questions</h2>
        ${faq.map((item) => `<details><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`).join("\n        ")}
      </section>
    </article>

    <aside class="term-side" aria-label="Related navigation">
      <div class="term-side-card">
        <h2>Related words</h2>
        <div class="term-related-links">
          ${relatedLinks}
        </div>
      </div>
      <div class="term-side-card">
        <h2>In the glossary</h2>
        <p>The short version stays in the A-Z list, alongside the other words from the same world.</p>
        <a class="term-side-cta" href="../lexique.html">See the A-Z hub</a>
      </div>
    </aside>
  </div>

  <div class="mini-marquee" aria-hidden="true">
    <div class="mini-marquee-track">
      <span>Understand without jargon</span><span>Connect the words</span><span>Keep your sources</span><span>Test gently</span><span>Reply if you spot a mistake</span>
      <span>Understand without jargon</span><span>Connect the words</span><span>Keep your sources</span><span>Test gently</span><span>Reply if you spot a mistake</span>
    </div>
  </div>

  <section class="term-final">
    <div class="term-container">
      <h2>Want to keep going in order?</h2>
      <p>Head back to the full glossary, search a word, then open only the pages that deserve more than a short definition.</p>
      <a href="../lexique.html">Open the AI glossary</a>
    </div>
  </section>
</main>

<footer class="term-footer">
  <p>© 2026 · Jérémy Sagnier · Jerwis</p>
</footer>
</body>
</html>
`;
}

async function updateHub(data) {
  let html;
  try {
    html = await readFile(HUB_PATH, "utf8");
  } catch {
    console.log(`⏭ ${HUB_PATH} absent (shell EN pas encore traduit) → hub non généré, fiches OK`);
    return false;
  }
  const az = renderAzList(data.terms);
  const expressCards = renderExpressCards(data.terms);
  if (!html.includes(HUB_START) || !html.includes(HUB_END)) {
    throw new Error(`Markers ${HUB_START} / ${HUB_END} absents de ${HUB_PATH}`);
  }
  html = html.replace(new RegExp(`${HUB_START}[\\s\\S]*?${HUB_END}`), az);
  if (html.includes(EXPRESS_START) && html.includes(EXPRESS_END)) {
    html = html.replace(new RegExp(`${EXPRESS_START}[\\s\\S]*?${EXPRESS_END}`), expressCards);
  }
  if (/<!-- Schema\.org : DefinedTermSet \(glossaire\) -->\n<script type="application\/ld\+json">[\s\S]*?<\/script>/.test(html)) {
    html = html.replace(
      /<!-- Schema\.org : DefinedTermSet \(glossaire\) -->\n<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      renderDefinedTermSet(data),
    );
  }
  await writeFile(HUB_PATH, html);
  return true;
}

async function cleanupGeneratedPages() {
  await mkdir(OUT_DIR, { recursive: true });
  const files = await readdir(OUT_DIR).catch(() => []);
  await Promise.all(files.map(async (file) => {
    if (!file.endsWith(".html")) return;
    const fullPath = join(OUT_DIR, file);
    const content = await readFile(fullPath, "utf8");
    if (content.includes(GENERATED_MARKER)) await unlink(fullPath);
  }));
}

async function writeTermPages(data) {
  await cleanupGeneratedPages();
  const pageTerms = data.terms.filter((term) => term.page);
  await Promise.all(pageTerms.map((term) => (
    writeFile(join(OUT_DIR, `${term.slug}.html`), renderTermPage(term, data.terms))
  )));
  return pageTerms;
}

// Fiches modèles IA (pages dédiées hand-made hors lexique.json) : incluses dans
// l'A-Z + express du hub (badge "Detailed page", lien vers la fiche), mais PAS
// générées par writeTermPages (elles existent déjà, traduites).
async function loadModels() {
  try {
    const models = JSON.parse(await readFile(MODELS_PATH, "utf8"));
    return models.map((m) => ({
      slug: m.slug,
      title: m.title,
      summary: m.summary,
      category: "AI model",
      where: "",
      aliases: [],
      page: true, // → badge "Detailed page" + hubHref lexique/<slug>.html
      groups: m.groups || [],
    }));
  } catch {
    return [];
  }
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const data = JSON.parse(await readFile(DATA_PATH, "utf8"));
  validate(data);
  const pageTerms = data.terms.filter((term) => term.page);
  const modelTerms = await loadModels();
  // Liste pour le HUB (A-Z + express + schema) = termes du glossaire + fiches modèles
  const hubData = { ...data, terms: [...data.terms, ...modelTerms] };

  let hubDone = false;
  if (!checkOnly) {
    await writeTermPages(data); // fiches : uniquement les termes page:true du glossaire
    hubDone = await updateHub(hubData); // hub : glossaire + modèles
  }

  console.log(`Lexique EN OK · ${data.terms.length} termes + ${modelTerms.length} modèles · ${pageTerms.length} fiches générées · hub ${hubDone ? "généré" : "en attente de shell"}${checkOnly ? " · check only" : ""}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
