/**
 * notify-publish.mjs — envoie une notif email à Jérémy quand un article est publié par l'autopilot.
 * Appelé par le workflow GitHub Actions UNIQUEMENT si status == 'published'.
 *
 * Usage : node scripts/blog/notify-publish.mjs <slug> <url>
 * Env   : RESEND_API_KEY (secret GitHub à ajouter) · NOTIFY_EMAIL (destinataire, optionnel)
 *
 * Best-effort : si la clé manque ou que l'envoi échoue, on log et on sort en 0
 * (une notif ratée ne doit JAMAIS faire échouer la publication).
 */
import fs from 'node:fs';
import path from 'node:path';

const slug = process.argv[2] || '';
const url = process.argv[3] || (slug ? `https://jerwis.fr/articles/${slug}` : 'https://jerwis.fr/articles');

const FROM = 'Jerwis (blog auto) <jeremy@jerwis.fr>';
const TO = process.env.NOTIFY_EMAIL || 'jeremy.sagnier@jerwis.fr';
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.error('[notify] RESEND_API_KEY absente → notif email non envoyée (ajoute le secret GitHub pour activer).');
  process.exit(0);
}

// Récupère titre + description depuis l'article publié (pour un mail propre)
function meta() {
  try {
    const file = path.join(process.cwd(), 'articles', `${slug}.html`);
    const h = fs.readFileSync(file, 'utf8');
    const og = (h.match(/<meta property="og:title" content="([^"]*)"/) || [])[1];
    const title = (og || (h.match(/<title>([^<]*)<\/title>/) || [])[1] || slug)
      .replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/ ·.*$/, '').trim();
    const desc = ((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '')
      .replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
    return { title, desc };
  } catch {
    return { title: slug || 'Nouvel article', desc: '' };
  }
}

const { title, desc } = meta();
const today = new Date().toISOString().slice(0, 10);

// Post LinkedIn généré par linkedin-post.mjs (best-effort : absent = mail sans le bloc)
function linkedinBlock() {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'linkedin', `${slug}.md`), 'utf8');
    const post = (raw.match(/## Post\n\n([\s\S]*?)\n\n## 1er commentaire/) || [])[1];
    const comment = (raw.match(/## 1er commentaire\n\n([\s\S]*?)\s*$/) || [])[1];
    if (!post) return { html: '', text: '' };
    const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return {
      html: `
    <hr style="border:none;border-top:1px solid #eee;margin:26px 0">
    <p style="font:700 11px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#EF426F;margin:0 0 10px">${process.env.LINKEDIN_SCHEDULED === 'oui' ? '📣 Post LinkedIn — DÉJÀ PROGRAMMÉ demain 8h30 via Zernio (copie ci-dessous)' : process.env.LINKEDIN_SCHEDULED === 'off' ? '📣 Post LinkedIn prêt à coller (programmation automatique coupée)' : '📣 Post LinkedIn prêt à coller (programmation Zernio non faite)'}</p>
    <div style="background:#FBF7F0;border:1px solid #eee;border-radius:10px;padding:16px;font-size:14px;line-height:1.55;white-space:pre-wrap">${escHtml(post)}</div>
    <p style="font-size:12px;color:#888;margin:10px 0 4px">1er commentaire (à poster juste après, c'est lui qui porte le lien) :</p>
    <div style="background:#FBF7F0;border:1px solid #eee;border-radius:10px;padding:12px;font-size:13px;line-height:1.5;white-space:pre-wrap">${escHtml(comment || '')}</div>`,
      text: `\n\n--- POST LINKEDIN PRÊT À COLLER ---\n\n${post}\n\n--- 1ER COMMENTAIRE ---\n\n${comment || ''}`,
    };
  } catch { return { html: '', text: '' }; }
}
const li = linkedinBlock();

// Carrousel PDF (si généré) → pièce jointe + mention
function carouselAttachment() {
  try {
    const p = path.join(process.cwd(), 'linkedin', 'carousels', `${slug}.pdf`);
    const buf = fs.readFileSync(p);
    return {
      attachments: [{ filename: `carrousel-${slug}.pdf`, content: buf.toString('base64') }],
      html: process.env.LINKEDIN_SCHEDULED === 'oui'
        ? `<p style="font-size:13px;color:#555;margin:14px 0 0">🎠 <strong>Carrousel généré et déjà attaché au post programmé</strong> — copie en pièce jointe pour vérification.</p>`
        : process.env.LINKEDIN_SCHEDULED === 'off'
          ? `<p style="font-size:13px;color:#555;margin:14px 0 0">🎠 <strong>Carrousel PDF en pièce jointe</strong>, à ajouter au post si tu le publies.</p>`
          : `<p style="font-size:13px;color:#555;margin:14px 0 0">🎠 <strong>Carrousel PDF en pièce jointe</strong> — la programmation Zernio n'a pas abouti : ajoute-le au post à la main.</p>`,
      text: `\n\n(Carrousel PDF ${process.env.LINKEDIN_SCHEDULED === 'oui' ? 'déjà attaché au post programmé — copie jointe' : 'en pièce jointe — à ajouter au post à la main'}.)`,
    };
  } catch { return { attachments: [], html: '', text: '' }; }
}
const car = carouselAttachment();

const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#0A0A0A">
    <p style="font:700 11px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#00B2A9;margin:0 0 8px">📝 Blog auto · ${today}</p>
    <h1 style="font-size:22px;line-height:1.2;margin:0 0 6px">Nouvel article en ligne</h1>
    <p style="font-size:18px;font-weight:700;margin:14px 0 4px">${title}</p>
    ${desc ? `<p style="color:#555;font-size:14px;margin:0 0 18px">${desc}</p>` : ''}
    <p style="margin:18px 0"><a href="${url}" style="display:inline-block;background:#EF426F;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">Lire l'article →</a></p>
    ${li.html}
    ${car.html}
    <p style="color:#888;font-size:12px;margin-top:24px">Publié automatiquement par le pilote de blog (gate qualité ≥ 56/70). Tu reçois ce mail parce que tu as demandé une notif à chaque publication.</p>
  </div>`;

const text = `Nouvel article publié : ${title}\n${desc ? desc + '\n' : ''}\n${url}${li.text}${car.text}\n\n(Publié automatiquement par le pilote de blog, ${today}.)`;

try {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [TO], subject: `📝 Nouvel article : ${title}`, html, text, ...(car.attachments.length ? { attachments: car.attachments } : {}) }),
  });
  if (!res.ok) {
    // exit 1 (et non 0) pour que l'échec soit VISIBLE : l'étape du workflow est en
    // continue-on-error, donc la publication n'est jamais bloquée, mais le run
    // affiche l'étape en erreur au lieu de faire disparaître le problème.
    console.error(`[notify] ✗ échec Resend ${res.status} : ${await res.text()}`);
    console.error(`[notify]   (domaine d'envoi ${FROM} vérifié chez Resend ? clé valide ?)`);
    process.exit(1);
  }
  console.error(`[notify] ✓ email envoyé à ${TO} pour "${title}"`);
} catch (e) {
  console.error('[notify] ✗ erreur:', String(e));
  process.exit(1);
}
