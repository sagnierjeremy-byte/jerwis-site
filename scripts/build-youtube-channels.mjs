#!/usr/bin/env node
// Build data/youtube-channels.json from:
//   - downloads/jeremy-ai-sources.opml  (source of truth: 34 channels with channel_id)
//   - index.html YouTube panel          (subset: category + tag + avatar)
//
// Strategy:
//   1. Parse OPML → handle, name, channel_id (already resolved historically)
//   2. Parse index.html visible panel → handle → { category, tag, avatar }
//   3. For OPML channels not in index.html, infer category from OPML section heading
//      and assign the avatar matching the order in the OPML section.
//   4. Resolve handles → channel_id via YouTube fetch to verify / update.
//   5. Sort by category, then alphabetical name.
//   6. Write JSON.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

const OPML_PATH = join(ROOT, "downloads", "jeremy-ai-sources.opml");
// Le panneau YouTube a quitté l'accueil avec la refonte « revue » (novembre 2026) :
// on lit la dernière version de index.html qui le contient.
const INDEX_HTML_REV = "6bdc034:index.html";
const OUTPUT_PATH = join(ROOT, "data", "youtube-channels.json");

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ----- 1. Parse OPML -----
function parseOPML(xml) {
  // groups: outline blocks containing YouTube channels (4 of the 6 outline groups)
  // We only want YouTube channels, which have htmlUrl starting with youtube.com/@
  const sections = [];
  const sectionRegex = /<outline\s+text="([^"]+)"\s+title="([^"]+)"\s*>([\s\S]*?)<\/outline>/g;
  let m;
  while ((m = sectionRegex.exec(xml))) {
    const [, sectionText, sectionTitle, inner] = m;
    const channelRegex = /<outline\s+type="rss"\s+text="([^"]+)"\s+title="([^"]+)"\s+xmlUrl="([^"]+)"\s+htmlUrl="([^"]+)"\s*\/>/g;
    const channels = [];
    let c;
    while ((c = channelRegex.exec(inner))) {
      const [, text, title, xmlUrl, htmlUrl] = c;
      // only youtube channels
      const ytMatch = htmlUrl.match(/youtube\.com\/(@[\w%\-.]+)/i);
      if (!ytMatch) continue;
      const handle = decodeURIComponent(ytMatch[1]);
      const idMatch = xmlUrl.match(/channel_id=(UC[\w-]{22})/);
      const channel_id = idMatch ? idMatch[1] : null;
      // decode HTML entities in name
      const name = text.replace(/&amp;/g, "&").replace(/&#39;/g, "'");
      channels.push({ handle, name, channel_id_opml: channel_id, htmlUrl });
    }
    if (channels.length) {
      sections.push({ section: sectionText, channels });
    }
  }
  return sections;
}

// Map OPML section heading → site category
// IMPORTANT: order matters. "Entrepreneuriat" contains "ia" so we must check
// Business first. We match on the most specific tokens.
function sectionToCategory(sectionText) {
  const t = sectionText.toLowerCase();
  if (t.includes("business") || t.includes("entrepreneuriat")) return "Business";
  if (t.includes("finance") || t.includes("marché")) return "Finance";
  if (t.includes("actu") || t.includes("géopolitique") || t.includes("geopolitique")) return "Actu";
  if (t.includes("lifestyle") || t.includes("inspiration")) return "Lifestyle";
  if (t.includes("tech") || t.match(/\bia\b/)) return "IA";
  return "IA";
}

// ----- 2. Parse index.html YouTube panel -----
function parseIndexHTMLChannels(html) {
  // Find the YouTube panel
  const panelMatch = html.match(/<div[^>]*data-src-panel="youtube"[^>]*>([\s\S]*?)<!-- Panel X/);
  if (!panelMatch) return new Map();
  const panel = panelMatch[1];

  const map = new Map();
  // <a class="channel-card c-XXX" href="https://www.youtube.com/@handle" ...> ... </a>
  const cardRegex = /<a class="channel-card\s+(c-[a-z]+)"\s+href="https:\/\/www\.youtube\.com\/(@[\w%\-.]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = cardRegex.exec(panel))) {
    const [, classCat, handleRaw, inner] = m;
    const handle = decodeURIComponent(handleRaw);

    // Extract avatar
    const avatarMatch = inner.match(/src="(photos\/channels\/c\d+\.jpg)"/);
    const avatar = avatarMatch ? "/" + avatarMatch[1] : null;

    // Extract name
    const nameMatch = inner.match(/<div class="channel-name">([^<]+)<\/div>/);
    const name = nameMatch ? nameMatch[1].trim() : null;

    // Extract tag
    const tagMatch = inner.match(/<div class="channel-tag">([^<]+)<\/div>/);
    const tag = tagMatch ? tagMatch[1].trim() : null;

    // Map class to category
    const categoryMap = {
      "c-ia": "IA",
      "c-biz": "Business",
      "c-finance": "Finance",
      "c-actu": "Actu",
      "c-life": "Lifestyle",
      "c-lifestyle": "Lifestyle",
    };
    const category = categoryMap[classCat] || "IA";

    map.set(handle.toLowerCase(), { handle, name, tag, avatar, category });
  }
  return map;
}

// ----- 3. Resolve handle → channel_id via YouTube fetch -----
// We must use the CANONICAL URL — the "channelId" / "externalId" tokens elsewhere
// in the HTML are often references to other channels (related videos, featured channels)
// and pick up the WRONG id. The canonical link is unambiguous.
async function resolveChannelId(handle) {
  const url = `https://www.youtube.com/${encodeURIComponent(handle)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const html = await res.text();

    // Primary: canonical URL — points to the page owner unambiguously
    const canonical = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/);
    if (canonical) return { ok: true, channel_id: canonical[1], source: "canonical" };

    // Fallback 1: og:url
    const ogUrl = html.match(/<meta property="og:url" content="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/);
    if (ogUrl) return { ok: true, channel_id: ogUrl[1], source: "og:url" };

    // Fallback 2: browseEndpoint inside metadata (still less reliable but better than channelId)
    const browse = html.match(/"browseEndpoint":\s*\{"browseId":"(UC[a-zA-Z0-9_-]{22})"/);
    if (browse) return { ok: true, channel_id: browse[1], source: "browseEndpoint" };

    return { ok: false, error: "no canonical/og:url found in HTML" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Validate the channel_id by fetching its RSS feed and parsing the title
async function validateChannelId(channelId, expectedName) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return { ok: false, error: `RSS HTTP ${res.status}` };
    const xml = await res.text();
    const titleMatch = xml.match(/<title>([^<]+)<\/title>/);
    return { ok: true, rss_title: titleMatch?.[1] || null };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ----- Default tags for channels not in index.html -----
const DEFAULT_TAGS = {
  // IA & Tech
  "@SamouraiDansant": "IA · Stratégie",
  "@VisionIA-FR": "IA · Vulgarisation",
  "@GrandAnglePodcast": "Podcast · Tech",
  // Business
  "@leilahormozi": "Leadership · Business",
  "@ImanGadzhi": "Agency · Mindset",
  "@GrantCardone": "Sales · Mindset",
  "@legendmedia": "Podcast · Business",
  "@Hasheur": "Crypto · Business",
  "@PodcastLeDéclic": "Podcast · Entrepreneurs",
  "@antoineblanco99": "Entrepreneur · Mindset",
  "@YomiDenzel": "E-commerce · Mindset",
  "@TheiCollection": "Lifestyle · Business",
  // Finance
  "@InteractivTrading": "Trading · Marchés",
  "@thamikabbaj1": "Trading · Patrimoine",
  // Actu
  "@7jourssurTerre": "Géopolitique · Actu",
  "@Geopolitis": "Géopolitique · Analyse",
  "@BrutFR": "Actu · Format court",
  "@CHAQUEJOURSURTERRE": "Géopolitique · Actu",
  // Lifestyle
  "@Najbfit": "Fitness · Lifestyle",
  "@taylorchiche": "Lifestyle · Inspiration",
  "@margo_cunego": "Lifestyle · Wellness",
  "@RomainLanéry": "Inspiration · Mindset",
};

// ----- Avatar mapping by handle (from index.html visible + OPML order) -----
// We deduce the avatar from index.html where available, and use the next available
// avatar slot in OPML order for the rest.
function buildAvatarMap(opmlSections, indexHTMLMap) {
  const map = new Map();
  const usedAvatars = new Set();

  // Pass 1: take from index.html (which we trust)
  for (const [handleLower, data] of indexHTMLMap) {
    if (data.avatar) {
      map.set(handleLower, data.avatar);
      usedAvatars.add(data.avatar);
    }
  }

  // Pass 2: assign remaining avatars to remaining channels in OPML order
  let nextAvatarNum = 1;
  for (const section of opmlSections) {
    for (const ch of section.channels) {
      const handleLower = ch.handle.toLowerCase();
      if (map.has(handleLower)) continue;
      // find next available avatar number
      while (nextAvatarNum <= 34) {
        const candidate = `/photos/channels/c${String(nextAvatarNum).padStart(2, "0")}.jpg`;
        nextAvatarNum++;
        if (!usedAvatars.has(candidate)) {
          map.set(handleLower, candidate);
          usedAvatars.add(candidate);
          break;
        }
      }
    }
  }
  return map;
}

// ----- Main -----
async function main() {
  console.log("Reading OPML and index.html…");
  const opmlXML = readFileSync(OPML_PATH, "utf8");
  const indexHTML = execSync(`git show ${INDEX_HTML_REV}`, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });

  const opmlSections = parseOPML(opmlXML);
  const indexHTMLMap = parseIndexHTMLChannels(indexHTML);

  console.log(`OPML: ${opmlSections.length} sections, ${opmlSections.reduce((a, s) => a + s.channels.length, 0)} channels`);
  console.log(`index.html: ${indexHTMLMap.size} visible channels`);

  const avatarMap = buildAvatarMap(opmlSections, indexHTMLMap);

  // Build full channel list
  const channels = [];
  const skipped = [];

  for (const section of opmlSections) {
    const sectionCategory = sectionToCategory(section.section);
    for (const ch of section.channels) {
      const handleLower = ch.handle.toLowerCase();
      const indexData = indexHTMLMap.get(handleLower);

      const category = indexData?.category || sectionCategory;
      const tag = indexData?.tag || DEFAULT_TAGS[ch.handle] || `${category} · Veille`;
      const avatar = avatarMap.get(handleLower) || `/photos/channels/c01.jpg`;
      const name = indexData?.name || ch.name;

      channels.push({
        handle: ch.handle,
        name,
        category,
        tag,
        avatar,
        channel_id_opml: ch.channel_id_opml,
      });
    }
  }

  // Resolve / verify channel_ids
  console.log(`\nResolving ${channels.length} handles via YouTube fetch (canonical URL)…`);
  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    process.stdout.write(`  [${i + 1}/${channels.length}] ${ch.handle} … `);
    const res = await resolveChannelId(ch.handle);
    if (res.ok) {
      ch.channel_id_resolved = res.channel_id;
      const opmlMatch = ch.channel_id_opml === res.channel_id ? "OPML match" : (ch.channel_id_opml ? `OPML mismatch (was ${ch.channel_id_opml})` : "no OPML");
      console.log(`OK ${res.channel_id} via ${res.source} — ${opmlMatch}`);
    } else {
      console.log(`FAIL ${res.error}`);
    }
    // throttle
    await new Promise((r) => setTimeout(r, 400));
  }

  // Validate each resolved channel_id by fetching its RSS
  console.log(`\nValidating channel_ids via RSS…`);
  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    const id = ch.channel_id_resolved || ch.channel_id_opml;
    if (!id) continue;
    process.stdout.write(`  [${i + 1}/${channels.length}] ${ch.handle} (${id}) … `);
    const v = await validateChannelId(id, ch.name);
    if (v.ok) {
      ch.rss_title = v.rss_title;
      console.log(`OK rss_title="${v.rss_title}"`);
    } else {
      console.log(`FAIL ${v.error}`);
      ch.rss_invalid = true;
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  // Decide final channel_id: prefer resolved, fall back to OPML
  const final = [];
  for (const ch of channels) {
    const id = ch.channel_id_resolved || ch.channel_id_opml;
    if (!id) {
      skipped.push({ handle: ch.handle, name: ch.name, reason: "no channel_id (OPML missing + fetch failed)" });
      continue;
    }
    if (ch.rss_invalid) {
      skipped.push({ handle: ch.handle, name: ch.name, reason: `RSS validation failed for id ${id}` });
      continue;
    }
    final.push({
      id,
      handle: ch.handle,
      name: ch.name,
      category: ch.category,
      tag: ch.tag,
      avatar: ch.avatar,
    });
  }

  // Dedupe by id
  const seen = new Set();
  const deduped = [];
  for (const ch of final) {
    if (seen.has(ch.id)) {
      skipped.push({ handle: ch.handle, name: ch.name, reason: `duplicate id ${ch.id}` });
      continue;
    }
    seen.add(ch.id);
    deduped.push(ch);
  }

  // Sort by category, then name
  const CAT_ORDER = ["IA", "Business", "Finance", "Actu", "Lifestyle"];
  deduped.sort((a, b) => {
    const ca = CAT_ORDER.indexOf(a.category);
    const cb = CAT_ORDER.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
  });

  // Write JSON
  const output = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    channels: deduped,
  };
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");

  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`Total channels resolved: ${deduped.length}`);
  const byCat = deduped.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {});
  console.log(`By category:`, byCat);
  if (skipped.length) {
    console.log(`\nSkipped ${skipped.length} channel(s):`);
    skipped.forEach((s) => console.log(`  - ${s.handle} (${s.name}): ${s.reason}`));
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
