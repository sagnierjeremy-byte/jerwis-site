---
slug: ia-qui-travaille-sur-ton-ordinateur
titre: "L'IA qui travaille sur ton ordinateur, le guide"
titre_seo: "L'IA qui travaille sur ton ordinateur : app Claude ou ChatGPT"
description: "Donner un dossier à Claude ou passer ChatGPT en mode Work : installer l'app, cinq premières tâches, les réglages de sécurité. Le guide débutant, sans code."
numero: "100"
categorie: "Guide"
hero_ligne_1: "L'IA qui travaille"
hero_ligne_2: "sur ton"
hero_ligne_3: "ordinateur."
lead: "Tu sais poser une question à ChatGPT ou à Claude. Mais tu recopies encore toi-même la réponse dans un tableau, un document, un dossier. Depuis 2026, leurs apps de bureau peuvent faire ce travail pour toi, directement sur tes fichiers. Tu leur ouvres un dossier, tu écris ce que tu veux, et tu récupères un document fini. Voici comment t'y mettre, avec cinq premières tâches et les réglages qui évitent les mauvaises surprises."
duree: "10 min"
niveau: "Débutant"
outils: "App Claude, ChatGPT Work"
published: "2026-11-02"
tldr:
  - "Le chat <strong>te répond</strong>. L'app de bureau, avec un dossier ouvert, <strong>fait le travail</strong> et te rend des fichiers finis."
  - "Chez Claude, tu ouvres un dossier à l'app. Chez ChatGPT, tu passes en <strong>mode Work</strong>. Il faut un abonnement payant, autour de 20 $ par mois."
  - "Commence par un <strong>dossier d'essai</strong>, relis avant tout ce qui ne se défait pas, et ne lui ouvre jamais un dossier qui contient des mots de passe."
parcours_etape: 3
---

<!-- section k-fuchsia -->

## Avant de commencer

Pendant des mois, mon usage de l'IA ressemblait à ça : je posais une question, je copiais la réponse, je la collais dans un tableur, je reformatais, je rangeais. L'IA faisait la partie intéressante, et moi la partie pénible.

Ce qui a changé en 2026, c'est que les apps de bureau de Claude et de ChatGPT peuvent maintenant faire la partie pénible aussi. Tu leur confies un dossier et une consigne en français, et elles lisent tes fichiers, en créent de nouveaux, et te rendent un résultat que tu n'as plus qu'à relire.

<div class="callout tip">
  <h4>Mon avis en 5 secondes</h4>
  <p>C'est le plus gros gain de temps que j'ai vu pour un non-développeur depuis ChatGPT. Mais c'est aussi la première fois que l'IA touche à tes vrais fichiers, alors on commence petit, dans un dossier d'essai.</p>
</div>

<!-- section k-teal -->

## Ce qui change par rapport au chat

Dans le chat, l'IA te donne une réponse. Tu dois ensuite l'appliquer toi-même. Avec l'app de bureau, tu lui donnes un but, elle découpe le travail en étapes et le fait. C'est ce qu'on appelle le [mode agent](../lexique/mode-agent).

Les deux grands outils ont chacun leur façon de faire :

- **Chez Claude**, tout se passe dans l'app Claude de bureau. Tu lui ouvres un dossier de ton ordinateur, et elle travaille dedans. Ce mode s'appelait [Cowork](../lexique/cowork). Fin 2026, il se fond dans la conversation normale : tu demandes, et Claude choisit seul s'il répond ou s'il travaille.
- **Chez ChatGPT**, l'app de bureau a deux modes, Chat et [Work](../lexique/chatgpt-work). Work prend une tâche entière et rend un document, un tableau, une présentation, un rapport ou un site. Dans l'app de bureau, il peut aussi utiliser tes fichiers et tes applications, avec ton autorisation.

Dans les deux cas, tu n'écris pas une ligne de code et tu n'ouvres aucun écran technique.

<!-- section k-orange -->

## Installer l'app et l'ouvrir

Il te faut un abonnement payant. Claude Pro coûte 20 $ par mois hors taxes, ChatGPT Plus aussi environ 20 $ par mois, sans engagement dans les deux cas. Les versions gratuites suffisent pour discuter, pas pour ce mode de travail.

1. **Télécharge l'app.** Claude sur [claude.com/download](https://claude.com/download), ChatGPT sur [chatgpt.com/download](https://chatgpt.com/download/). Les deux existent pour Mac et Windows.
2. **Installe-la** comme n'importe quelle application, puis connecte-toi avec ton compte.
3. **Crée un dossier d'essai** sur ton bureau, par exemple « essai-ia », et mets-y deux ou trois fichiers sans importance.
4. **Ouvre ce dossier à l'IA.** Dans Claude, donne-lui accès à ce dossier. Si tu vois encore deux boutons « Chat » et « Cowork », choisis Cowork. Dans ChatGPT, choisis ChatGPT dans le menu, puis Work avec le sélecteur.

Les écrans changent vite chez les deux éditeurs. Si un bouton n'est pas exactement là où je le dis, demande directement à l'IA : « comment je te donne accès à un dossier de mon ordinateur ? ». Elle te guidera.

<!-- section k-fuchsia -->

## Cinq premières tâches à essayer

Chaque message se colle tel quel. Remplace seulement ce qui est entre crochets.

<div class="usecase">
  <div class="usecase-label">Tâche 01 · Ranger un dossier</div>
  <h4>Ton dossier Téléchargements, enfin trié</h4>
  <p>Ouvre ton dossier Téléchargements à l'IA, ou une copie si tu préfères être prudent.</p>
  <pre>Range ce dossier par type de fichier : documents, images, tableurs, autres.
Mets dans un sous-dossier Archive tout ce qui date de plus de 6 mois.
Ne supprime rien. Montre-moi ce que tu as déplacé.</pre>
  <p>Tu récupères un dossier rangé et la liste de ce qui a bougé.</p>
</div>

<div class="usecase">
  <div class="usecase-label">Tâche 02 · Tableau de dépenses</div>
  <h4>Des factures PDF à un tableau propre</h4>
  <p>Mets tes factures du mois dans le dossier.</p>
  <pre>Lis toutes les factures PDF de ce dossier.
Crée un tableau avec la date, le fournisseur, le montant HT, la TVA et le montant TTC.
Ajoute une ligne de total. Si une information manque, laisse la case vide et dis-le moi.</pre>
  <p>Tu obtiens un tableur prêt à ouvrir. Vérifie deux ou trois lignes au hasard avant de t'en servir.</p>
</div>

<div class="usecase">
  <div class="usecase-label">Tâche 03 · Comparer des devis</div>
  <h4>Trois devis, un choix argumenté</h4>
  <pre>À partir des devis de ce dossier, fais un tableau comparatif : prix, délais, garanties, ce qui est inclus et ce qui ne l'est pas.
Dis-moi lequel tu choisirais pour [ton critère principal] et pourquoi, en 5 lignes.</pre>
  <p>Le tableau t'évite de relire trois PDF côte à côte. La décision reste la tienne.</p>
</div>

<div class="usecase">
  <div class="usecase-label">Tâche 04 · Une présentation</div>
  <h4>Tes notes deviennent 10 slides</h4>
  <pre>À partir de mes notes dans ce dossier, crée une présentation de 10 slides pour [ton public].
Une idée par slide, des titres courts, pas plus de 4 lignes de texte par slide.</pre>
  <p>Tu récupères un fichier que tu ouvres dans PowerPoint, Keynote ou Google Slides pour l'ajuster.</p>
</div>

<div class="usecase">
  <div class="usecase-label">Tâche 05 · Une page web</div>
  <h4>La page de ton activité</h4>
  <pre>Dans ce dossier, crée une page web simple qui présente mon activité : [ton métier et ta ville].
Explique-moi en mots simples ce que tu fais.
Quand c'est prêt, montre-moi le résultat.</pre>
  <p>C'est l'exercice de l'<a href="../apprendre#etape-03">étape 3 du parcours Apprendre</a>. Tu viens de faire construire quelque chose sans une ligne de code.</p>
</div>

<!-- section k-teal -->

## Les réglages de sécurité

Ces apps agissent pour de vrai sur tes fichiers. Trois choses à connaître avant de leur confier plus qu'un dossier d'essai.

### Chez Claude, le réglage Auto ou Manuel

Dans la zone de message, un réglage décide à quel point Claude travaille seul. **Auto**, le réglage par défaut sur les abonnements Pro, le laisse avancer sans te demander à chaque étape, avec des vérifications automatiques avant d'agir. **Manuel** lui fait demander ton accord avant chaque action. Pour tes premières tâches, passe en Manuel : tu verras exactement ce qu'il fait.

Claude ne touche à tes fichiers que tant que l'app est ouverte, et il demande avant de supprimer définitivement un fichier.

### Chez ChatGPT, les autorisations

Dans l'app de bureau, Work n'utilise tes fichiers et tes applications qu'avec ton autorisation. Le travail peut tourner sur ton ordinateur, mais les messages et le contexte de la tâche peuvent être enregistrés dans le cloud. Garde-le en tête pour les documents sensibles.

### La règle qui vaut pour les deux

Tout ce que l'IA lit pour faire la tâche part chez l'éditeur pour être traité, comme dans le chat. Pour aller plus loin sur ce sujet, lis [ce que les IA font de tes données](donnees-perso-ia-confidentialite).

<!-- section k-orange -->

## Ce qu'il ne faut pas lui confier

- **Un dossier qui contient des mots de passe**, des codes d'accès ou des données médicales.
- **Tout ton disque** au lieu d'un seul dossier. Un dossier précis, c'est un travail précis.
- **Un envoi ou un paiement sans relecture.** Tout ce qui ne se défait pas, tu le relis avant.
- **Des fichiers importants sans copie.** Travaille sur une copie tant que tu découvres l'outil.
- **Des documents clients confidentiels**, sans avoir vérifié ce que ton contrat et ton abonnement autorisent.

<div class="callout ok">
  <h4>Ma check-list avant chaque tâche</h4>
  <p>(1) Un seul dossier ouvert, et j'ai une copie. (2) Ma consigne dit ce qu'il ne doit pas faire, par exemple « ne supprime rien ». (3) Je relis le résultat avant de l'envoyer à qui que ce soit.</p>
</div>

<!-- section k-fuchsia -->

## Et maintenant ?

Fais la tâche 05 tout de suite, c'est dix minutes. Ensuite, reprends une tâche répétitive de ta semaine et confie-la, dans un dossier d'essai. Si tu veux aller plus loin et enchaîner des actions tout seul, lis [comment automatiser tes tâches sans coder](automatiser-taches-ia-sans-coder).

## Sources

- Aide Claude, « Claude Cowork and chat are one Claude », consultée le 2 novembre 2026 : [support.claude.com](https://support.claude.com/en/articles/16761823-claude-cowork-and-chat-are-one-claude)
- Aide OpenAI, « ChatGPT Work et Codex », consultée le 2 novembre 2026 : [help.openai.com](https://help.openai.com/fr-fr/articles/20001275-chatgpt-work-and-codex)
- Aide OpenAI, « Moving to the new ChatGPT desktop app », consultée le 2 novembre 2026 : [help.openai.com](https://help.openai.com/en/articles/20001276-moving-to-the-new-chatgpt-desktop-app)

Ces apps évoluent chaque mois. Si un écran a changé, écris-moi, je mets le guide à jour.
