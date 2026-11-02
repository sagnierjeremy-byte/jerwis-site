// Cours par mail « Apprendre l'IA en 3 étapes » : 6 mails sur 12 jours (P10, plan du 2026-11-02).
// Le mail 1 part à l'inscription (api/subscribe.js, source « cours-3-etapes »), les suivants via
// scripts/cours/envoyer-cours.mjs (GitHub Actions, chaque matin) selon le jour depuis l'inscription.
export const SOURCE = 'cours-3-etapes';
export const FROM = 'Jérémy Sagnier <jeremy@jerwis.fr>';
export const SITE = 'https://jerwis.fr';

export const MAILS = [
  {
    jour: 0, sujet: 'Ton premier prompt, en 2 minutes', apercu: "Étape 1 du cours : un vrai prompt, tout de suite.",
    titre: 'Bienvenue. On commence tout de suite.',
    corps: [
      "Salut, moi c'est Jérémy. Je ne suis pas développeur, et c'est l'IA qui m'a appris à faire ce que je fais aujourd'hui. Pendant douze jours, je t'envoie six mails courts, chacun avec un exercice de quelques minutes.",
      "Le premier, maintenant. Ouvre ChatGPT, Claude, Gemini ou Le Chat (tous gratuits), colle ce message et remplace ce qui est entre crochets :",
    ],
    prompt: "Tu es un prof patient qui explique sans jargon.\nExplique-moi simplement [ce que tu veux comprendre].\nDonne-moi : 1) une définition en une phrase, 2) un exemple de la vie courante, 3) la seule chose à retenir.",
    apres: "Tu viens d'écrire un vrai prompt : un rôle, une demande précise, un format. C'est tout le métier. Le reste, c'est affiner ça.",
    lien: { href: '/apprendre#etape-01', label: "Voir l'étape 1 du parcours" },
  },
  {
    jour: 2, sujet: "L'IA invente. Voici comment la prendre la main dans le sac", apercu: 'Le réflexe qui change tout : vérifier en 30 secondes.',
    titre: "L'IA se trompe avec aplomb.",
    corps: [
      "C'est le piège numéro un : une réponse fausse ressemble exactement à une réponse juste. Même ton assuré, même mise en page.",
      "Le réflexe à prendre dès aujourd'hui, après n'importe quelle réponse importante :",
    ],
    prompt: "Sur quoi t'appuies-tu pour cette réponse ?\nDonne-moi tes sources, et dis-moi clairement ce dont tu n'es pas sûr.",
    apres: "Ensuite, vérifie toi-même deux informations au hasard. Si l'une des deux est fausse, ne garde rien sans contrôle.",
    lien: { href: '/articles/verifier-info-ia', label: "Les réflexes de vérification, en 9 minutes" },
  },
  {
    jour: 4, sujet: 'Fais résumer un vrai document', apercu: "Étape 2 : un PDF à toi, résumé avec les pages citées.",
    titre: 'Un document de 30 pages, lu en 2 minutes.',
    corps: [
      "On passe à l'étape 2 : l'utiliser pour de vrai. Prends un PDF à toi (un contrat, une facture, un compte rendu), dépose-le dans l'outil de ton choix et colle ça :",
    ],
    prompt: "Résume ce document en 5 points simples.\nDis-moi ensuite les 3 choses auxquelles je dois faire attention, avec la page où tu les as trouvées.\nSi une information n'est pas dans le document, dis-le au lieu de l'inventer.",
    apres: "Les pages citées te permettent de vérifier en 10 secondes, comme dans le mail d'avant. Évite les documents confidentiels dans une version gratuite.",
    lien: { href: '/apprendre#etape-02', label: "Voir l'étape 2 du parcours" },
  },
  {
    jour: 7, sujet: 'Tes mails, sans sonner robot', apercu: 'Une relance délicate, rédigée avec ton ton à toi.',
    titre: 'Le mail que tu repousses depuis trois jours.',
    corps: [
      "Tout le monde en a un : la relance d'une facture, la réponse à un client mécontent, le refus poli. Colle le mail reçu dans ChatGPT ou Claude, puis ça :",
    ],
    prompt: "Aide-moi à répondre à ce mail.\nTon : [cordial et ferme], en tutoyant / vouvoyant [à choisir].\nMoins de 8 lignes. Propose-moi deux versions, une plus directe et une plus douce.",
    apres: "Relis toujours avant d'envoyer, et change au moins une phrase avec tes mots. C'est ce qui fait que ça ne sonne pas robot.",
    lien: { href: '/articles/ecrire-mails-avec-ia', label: 'Écrire tes mails avec l’IA, le guide' },
  },
  {
    jour: 9, sujet: "L'IA qui travaille sur ton ordinateur", apercu: "Étape 3 : l'app Claude ou ChatGPT, un dossier, une vraie page web.",
    titre: "Cette fois, c'est l'IA qui fait le travail.",
    corps: [
      "Étape 3. Avec un abonnement Claude Pro ou ChatGPT Plus (environ 20 $ par mois, sans engagement), leurs apps de bureau travaillent directement sur tes fichiers.",
      "Installe l'app Claude ou l'app ChatGPT, crée sur ton bureau un dossier vide « essai-ia », ouvre-le à Claude (ou passe ChatGPT en mode Work), puis colle ça :",
    ],
    prompt: "Dans le dossier essai-ia, crée une page web simple qui présente mon activité : [ton métier et ta ville].\nExplique-moi en mots simples ce que tu fais.\nQuand c'est prêt, montre-moi le résultat.",
    apres: "Tu viens de faire construire quelque chose sur ton ordinateur, sans une ligne de code. Commence toujours par un dossier d'essai.",
    lien: { href: '/articles/ia-qui-travaille-sur-ton-ordinateur', label: "Le guide complet, avec 5 premières tâches" },
  },
  {
    jour: 11, sujet: 'Et maintenant ?', apercu: 'Trois habitudes à garder, et la suite si tu veux creuser.',
    titre: 'Tu as fait le parcours. Voilà ce qu’il faut garder.',
    corps: [
      "En douze jours, tu as écrit un vrai prompt, vérifié une réponse, résumé un document, rédigé un mail et fait travailler l'IA sur ton ordinateur. Trois habitudes valent plus que tout le reste : donner du contexte, vérifier, et relire avant d'envoyer.",
      "Pour creuser, j'ai rangé dix lectures courtes au bas du parcours. Et chaque vendredi, ma veille AI Playbook continue d'arriver : tu peux la garder, ou te désabonner en un clic plus bas.",
    ],
    prompt: null,
    apres: "Une question, un blocage, une réussite ? Réponds à ce mail. Je lis tout, et je réponds.",
    lien: { href: '/apprendre#plus-loin', label: 'Les lectures pour aller plus loin' },
  },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function rendre(mail, email, numero) {
  const pref = `${SITE}/preferences?email=${encodeURIComponent(email)}`;
  const p = (t) => `<p style="margin:0 0 16px;font:16px/1.6 Arial,Helvetica,sans-serif;color:#1A1A1A">${esc(t)}</p>`;
  const prompt = mail.prompt ? `<pre style="margin:0 0 16px;padding:16px 18px;background:#0A0A0A;color:#F4EFE6;border-radius:12px;white-space:pre-wrap;font:14px/1.6 'Courier New',Courier,monospace">${esc(mail.prompt)}</pre>` : '';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(mail.sujet)}</title></head>
<body style="margin:0;padding:0;background:#FBF7F0">
<div style="display:none;max-height:0;overflow:hidden">${esc(mail.apercu)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden">
<tr><td style="height:6px;background:linear-gradient(90deg,#00B2A9 0 33%,#EF426F 33% 66%,#FF8200 66%);font-size:0">&nbsp;</td></tr>
<tr><td style="padding:28px 28px 8px">
<p style="margin:0 0 10px;font:700 11px/1.3 'Courier New',Courier,monospace;letter-spacing:.16em;text-transform:uppercase;color:#EF426F">Cours · mail ${numero} sur 6</p>
<h1 style="margin:0 0 18px;font:900 26px/1.15 Arial,Helvetica,sans-serif;color:#0A0A0A">${esc(mail.titre)}</h1>
${mail.corps.map(p).join('\n')}
${prompt}
${p(mail.apres)}
<p style="margin:8px 0 24px"><a href="${SITE}${mail.lien.href}" style="display:inline-block;padding:13px 22px;background:#0A0A0A;color:#FFFFFF;border-radius:999px;text-decoration:none;font:700 14px Arial,Helvetica,sans-serif">${esc(mail.lien.label)} →</a></p>
<p style="margin:0 0 6px;font:16px/1.5 Arial,Helvetica,sans-serif;color:#1A1A1A">Jérémy</p>
</td></tr>
<tr><td style="padding:16px 28px 26px;border-top:1px solid #EEE7DA;font:12px/1.6 Arial,Helvetica,sans-serif;color:#6E6E6E">
Tu reçois ce mail parce que tu t'es inscrit au cours en 3 étapes sur jerwis.fr. <a href="${pref}" style="color:#6E6E6E">Me désabonner en 1 clic</a>
</td></tr></table></td></tr></table></body></html>`;
}
