// Endpoint Vercel serverless pour inscrire un email à une audience Resend.
// Déploiement : Vercel → ajoute RESEND_API_KEY et RESEND_AUDIENCE_ID en env vars.
// Pas de fallback d'audience pour éviter toute fuite vers une audience tierce.
// Envoie automatiquement un email de bienvenue transactionnel après inscription réussie.

import fs from "node:fs";
import path from "node:path";
import { MAILS as COURS_MAILS, SOURCE as COURS_SOURCE, rendre as rendreCours } from "../scripts/cours/mails.mjs";

const FROM_EMAIL = "Jérémy Sagnier <jeremy@jerwis.fr>";
const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "jeremy.sagnier@jerwis.fr";
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const rateLimitStore = new Map();

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const list = (rateLimitStore.get(ip) || []).filter((t) => t > cutoff);
  if (list.length >= RATE_LIMIT_MAX) {
    rateLimitStore.set(ip, list);
    return true;
  }
  list.push(now);
  rateLimitStore.set(ip, list);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, source, firstName, website } = req.body || {};

  // Honeypot · les bots remplissent tous les champs · les humains ne voient pas celui-ci
  // On répond 200 fake-success pour ne pas leur signaler que c'est filtré
  if (website && String(website).trim().length > 0) {
    console.warn("[subscribe] honeypot triggered", { ip: getClientIp(req), email });
    return res.status(200).json({ ok: true, alreadySubscribed: false });
  }

  // Rate limit par IP · 3 inscriptions max / 10 min · même comportement fake-success
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    console.warn("[subscribe] rate limit hit", { ip, email });
    return res.status(200).json({ ok: true, alreadySubscribed: false });
  }

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: "Email invalide" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "RESEND_API_KEY manquante dans les env vars Vercel" });
  }
  if (!audienceId) {
    return res
      .status(500)
      .json({ error: "RESEND_AUDIENCE_ID manquante dans les env vars Vercel" });
  }

  try {
    const resendRes = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          first_name: firstName || undefined,
          // Resend ne supporte pas les attributs custom · on stocke la source
          // dans last_name avec préfixe `src:` pour la retrouver côté admin
          last_name: source ? `src:${String(source).slice(0, 60)}` : undefined,
          unsubscribed: false,
        }),
      }
    );

    let alreadySubscribed = false;
    let contactId = null;
    if (!resendRes.ok) {
      const errText = await resendRes.text();
      if (errText.includes("already exists") || resendRes.status === 409) {
        alreadySubscribed = true;
      } else {
        return res
          .status(500)
          .json({ error: "Inscription échouée", details: errText });
      }
    } else {
      const data = await resendRes.json();
      contactId = data?.id || data?.data?.id || null;
    }

    // Envoi du welcome email + notif admin (best-effort · n'échoue pas si la notif rate)
    // On ne re-envoie PAS à un contact déjà inscrit (évite les doublons)
    if (!alreadySubscribed) {
      try {
        if (source === COURS_SOURCE) await sendCoursMail(apiKey, email.toLowerCase().trim());
        else await sendWelcomeEmail(apiKey, email.toLowerCase().trim());
      } catch (e) {
        console.error("[subscribe] welcome email failed:", e);
      }
      try {
        await sendAdminNotification(apiKey, email.toLowerCase().trim(), source, firstName);
      } catch (e) {
        console.error("[subscribe] admin notif failed:", e);
      }
    }

    return res.status(200).json({
      ok: true,
      contactId,
      source,
      alreadySubscribed,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Erreur serveur", details: String(err) });
  }
}

async function sendAdminNotification(apiKey, email, source, firstName) {
  const src = source || "(inconnu)";
  const fn = firstName || "(non renseigné)";
  const subject = `+1 newsletter · ${email}`;
  const html =
    `<h2>Nouvelle inscription</h2>` +
    `<p><strong>Email</strong> · ${escapeHtml(email)}</p>` +
    `<p><strong>Prénom</strong> · ${escapeHtml(fn)}</p>` +
    `<p><strong>Source</strong> · ${escapeHtml(src)}</p>` +
    `<p style="color:#888; font-size:12px;">Date · ${new Date().toISOString()}</p>` +
    `<p><a href="https://resend.com/audiences">Dashboard Resend →</a></p>`;
  const text =
    `Nouvelle inscription\n\n` +
    `Email · ${email}\n` +
    `Prénom · ${fn}\n` +
    `Source · ${src}\n` +
    `Date · ${new Date().toISOString()}\n`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject,
      text,
      html,
    }),
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Cours « Apprendre l'IA en 3 étapes » : le mail 1 tient lieu de bienvenue, les suivants partent chaque matin
// depuis GitHub Actions (scripts/cours/envoyer-cours.mjs).
async function sendCoursMail(apiKey, email) {
  const mail = COURS_MAILS[0];
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [email], subject: mail.sujet, html: rendreCours(mail, email, 1) }),
  });
}

async function sendWelcomeEmail(apiKey, email) {
  const templatePath = path.join(process.cwd(), "templates", "email-welcome.html");
  let html;
  try {
    html = fs.readFileSync(templatePath, "utf8");
  } catch (e) {
    // Si le template n'est pas trouvé, on ne bloque pas l'inscription
    console.error("[subscribe] template read failed:", e);
    return;
  }
  // Remplace les variables
  html = html.replace(/\{\{email\}\}/g, encodeURIComponent(email));

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: "Bienvenue dans AI Playbook · ta première édition vendredi 9h",
      html,
    }),
  });
}
