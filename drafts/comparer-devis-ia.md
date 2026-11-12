---
slug: comparer-devis-ia
titre: Comment comparer des devis avec l'IA en tant qu'entrepreneur
titre_seo: 'Comparateur devis IA : ma méthode pas à pas'
description: 'Comment j''utilise ChatGPT et Claude pour comparer des devis complexes : tableau prix, délais, garanties et exclusions. Sans coder, sans perdre le contrôle.'
numero: '55'
categorie: Décryptage
hero_ligne_1: Tes devis
hero_ligne_2: sous contrôle
hero_ligne_3: avec l'IA
lead: 'Tu as reçu trois devis pour le même projet et tu ne sais plus où donner de la tête ? Moi aussi, j''ai passé des heures à recopier des montants dans des tableurs pour comparer. Aujourd''hui, j''utilise ChatGPT et Claude pour faire le tri à ma place. Je te montre comment je construis un tableau comparatif rigoureux, sans écrire une ligne de code et sans jamais déléguer la décision finale.'
duree: 8 min
niveau: Débutant
outils: 'ChatGPT, Claude'
published: '2026-11-12'
tldr:
  - 'L''IA lit les <strong>formats hétérogènes</strong> (PDF, photo, Excel) sans structure préalable'
  - 'ChatGPT et Claude extraient prix, délais, garanties et exclusions dans un tableau'
  - 'Le bon prompt demande à l''IA de noter ce qui est <strong>non précisé</strong>, pas de deviner'
  - 'La décision finale reste humaine : l''IA structure, tu négocies et tu choisis'
---

<!-- section k-orange -->

## L'IA m'aide à y voir clair

Je fais tout ça d'abord pour moi. Il y a six mois, j'ai failli signer un devis de rénovation sans voir que la garantie décennale était exclue. J'ai relu trois fois le document. Rien. C'est un ami qui l'a repéré en dix secondes. J'ai compris que mes yeux se fatiguent vite face à des pages de chiffres et de clauses.

Depuis, j'envoie mes devis à l'IA avant de signer quoi que ce soit. Je ne suis pas développeur. Je n'utilise pas de terminal, ni de script. J'ouvre l'application Claude sur mon bureau ou je bascule ChatGPT en [mode Work](/lexique/chatgpt-work). Je télécharge mes fichiers. Je demande un tableau comparatif. Prix, délais, garanties et exclusions. En deux minutes, j'ai une vue d'ensemble que je peux relire calmement.

Toi aussi tu peux faire ça. Cet article te montre la méthode que j'ai construite pas à pas.

<!-- section k-teal -->

## Des formats différents, un seul interlocuteur

Les devis n'arrivent jamais normalisés. L'un est un PDF scanné, l'autre un Word mal formaté, le troisième une photo d'écran envoyée par email. Avant, je passais une heure à recopier des montants dans un tableur. Je faisais des erreurs de frappe. Je mélangeais les prestations.

Aujourd'hui, l'IA traite ces formats hétérogènes sans que j'aie besoin de tout ressaisir. Elle lit le sens du document plutôt que de chercher des cases préremplies. PDF, photo, Word ou Excel, elle s'adapte à la mise en page. C'est un avantage immense quand tu compares des prestataires qui n'utilisent aucun logiciel commun.

Moi, je télécharge directement mes fichiers dans le chat. ChatGPT, via sa fonction Advanced Data Analysis, accepte les CSV, Excel, PDF et fichiers texte. Il résume les données, crée des tableaux et fait des calculs. Claude, de son côté, embarque une [fenêtre de contexte](/lexique/context-window) énorme. Jusqu'à un million de tokens pour certains modèles en bêta. En clair, tu peux lui coller plusieurs devis longs dans la même conversation sans qu'il oublie le début. Tu poses une question sur la page 12 du deuxième document, il sait de quoi tu parles.

## ChatGPT et Claude : ce qui change tout

À la date de cet article, plusieurs modèles coexistent. ChatGPT 6 Astra est sorti le 3 septembre 2026, suivi de GPT-6.1 Terra le 26 octobre. Chez Anthropic, Claude Fable 5.2 est arrivé le 9 novembre 2026, tandis que la famille 5.5 (Opus, Sonnet, Haiku) s'est déployée entre septembre et octobre. Google déploie Gemini 4 Argon pour ses abonnés Pro et Ultra depuis le 13 octobre.

Je ne vais pas te dire lequel choisir. Pour comparer des devis, j'alterne selon le besoin. Quand je veux des tableaux et des calculs rapides, je pars sur ChatGPT en mode Work. Quand les documents font vingt pages chacun et que la conversation s'étire sur plusieurs allers-retours, je préfère Claude pour sa mémoire longue.

L'important, c'est de [savoir écrire un bon prompt](/articles/ecrire-bon-prompt-non-dev). Sans consigne claire, même le modèle le plus récent te renvoie une salade.

<div class="callout tip"><h4>Mon conseil</h4><p>Avant d'envoyer tes devis, vérifie que tu es dans une session privée et que tu comprends où vont tes données. Les devis contiennent souvent des montants, des adresses, des descriptions de projet. Jette un œil à mon article sur les <a href="/articles/donnees-perso-ia-confidentialite">données personnelles et la confidentialité</a> pour ne pas prendre de risque évitable.</p></div>

## Mon tableau comparatif pas à pas

Voici exactement comment je procède. J'ouvre un nouveau chat. J'upload mes fichiers. Et je donne cette trame à l'IA.

Première étape, je demande l'extraction brute. Je veux que l'IA identifie les parties, les dates, les valeurs, les garanties, les délais et les exclusions. Elle catégorise chaque clause et range les informations dans des colonnes claires. C'est ce qu'elle fait le mieux : transformer un fouillis de paragraphes en données structurées.

Deuxième étape, je demande un tableau comparatif. Trois colonnes minimum : le critère, le prestataire A, le prestataire B. Parfois j'ajoute une colonne "Mon commentaire" que je remplis moi-même après lecture.

Troisième étape, je demande à l'IA de signaler les écarts. Elle compare ce qu'elle a trouvé avec une grille que je lui donne. Par exemple, je veux absolument une garantie d'un an sur les pièces. Si un devis ne la mentionne pas, elle doit me le dire. Pas supposer qu'elle est incluse par habitude.

Quatrième étape, je relis moi-même. L'IA a fait le tri. Je prends la décision. Je n'ai pas besoin de comprendre Python ni de toucher à une ligne de code. ChatGPT fait les calculs en arrière-plan. Moi, je regarde le résultat.

## Les bonnes questions à poser

Le résultat dépend de ta consigne initiale. Si tu demandes "compare ces devis", tu obtiendras un avis général flou. Si tu demandes "liste chaque exclusion dans un tableau séparé", tu auras un outil de travail concret.

Voici ce qui fonctionne chez moi. Je commence par décrire mon projet en une phrase. Puis je précise le format de sortie. Ensuite, j'ajoute une règle d'or : si une information n'est pas précisée dans le devis, note-le explicitement. Ne devine pas.

Cette dernière consigne change tout. Elle évite que l'IA invente une garantie parce qu'elle l'a vue dans le document précédent. Elle t'oblige à revenir vers le prestataire pour clarifier. C'est exactement ce que tu veux. Un devis flou est un devis dangereux.

Tu peux aussi demander à l'IA de reformuler les délais en nombre de jours ouvrés, de convertir les montants hors taxe en TTC, ou de classer les prestations par ordre de prix décroissant. Plus ta demande est précise, plus le tableau est utilisable.

<div class="callout tip"><h4>Le piège à éviter</h4><p>Ne demande jamais à l'IA de choisir pour toi. Demande-lui de structurer. La décision reste entre tes mains. Si un devis est moins cher mais exclut la maintenance, seul toi peux savoir si tu as les ressources pour gérer ça en interne.</p></div>

## Ce que l'IA débusque mieux que moi

Quand je lis un devis seul, je zappe des lignes. C'est humain. L'IA relit chaque page avec la même attention. Elle repère les clauses manquantes, les formulations à risque, les délais flous et les garanties implicites. Elle m'aide à voir ce que je préférerais ignorer parce que le document est ennuyeux.

Les outils spécialisés dans la révision de contrats vont encore plus loin que les modèles généralistes. Ils identifient des clauses non-standard que l'on peut passer à la relecture manuelle. Pour ma part, avec ChatGPT ou Claude, je reste sur une analyse structurée mais je garde en tête cette limite.

Ce que je demande toujours : un inventaire des garanties, un calendrier des délais, une liste rouge des exclusions et une colonne sur les pénalités de retard. Si un point est flou, je le surligne. L'IA m'aide à voir les choses. Elle ne me dit pas ce que je dois faire.

## Pourquoi je garde la main

L'IA peut comparer, calculer, signaler et synthétiser. Elle ne peut pas négocier à ta place. Elle ne connaît pas la relation que tu as avec ton fournisseur. Elle ignore si tu préfères payer un peu plus pour dormir tranquille. Elle ne sait pas non plus si tu as déjà eu un problème avec une clause similaire l'année dernière.

Les outils spécialisés surpassent les IA généralistes sur la détection de clauses complexes. Ils s'appuient sur des playbooks juridiques prédéfinis et signalent les écarts par rapport à des normes. Mais pour un entrepreneur non-juriste qui compare des devis de rénovation, de marketing, de conseil ou d'informatique, ChatGPT et Claude font déjà un travail remarquable.

Je garde la décision finale. Je relis les points sensibles. Parfois je demande un avis externe. L'IA m'a fait gagner du temps sur le tri. Elle ne m'a pas transformé en expert. Et c'est tant mieux.

Tu peux aussi lire mon article sur [comment lire un contrat avec l'IA sans se tromper](/articles/lire-contrat-ia-sans-se-tromper) pour approfondir la supervision humaine.

## Questions fréquentes

### L'IA peut-elle analyser des devis dans n'importe quel format (PDF, photo, Word, Excel) ?

Oui. L'IA traite des formats hétérogènes et s'adapte à des mises en page variées. Elle cherche le sens plutôt que des champs fixes. ChatGPT, via Advanced Data Analysis, prend en charge les CSV, Excel, PDF et fichiers texte. Tu peux aussi lui envoyer une photo.

### Comment garantir la confidentialité de mes devis sensibles lorsque j'utilise l'IA ?

Vérifie les conditions de la plateforme. Ne télécharge pas de données stratégiques dans une version gratuite dont tu ne maîtrises pas l'hébergement. Si ton devis contient des montants confidentiels ou des données clients, anonymise ou utilise un service entreprise. J'ai détaillé la démarche dans mon article sur les [données personnelles et la confidentialité](/articles/donnees-perso-ia-confidentialite).

### Est-ce que l'IA peut détecter les clauses cachées ou les exclusions importantes dans un devis ?

Elle peut identifier les exclusions et signaler les formulations à risque. Les outils spécialisés vont plus loin que les modèles généralistes. Mais l'œil humain reste nécessaire pour juger de l'impact réel d'une clause sur ton activité.

### Quel est le meilleur outil (ChatGPT, Claude, Gemini) pour m'aider à comparer des devis ?

À la date de cet article, ChatGPT 6 Astra est disponible depuis le 3 septembre 2026, Claude Fable 5.2 depuis le 9 novembre, et Gemini 4 Argon est en cours de déploiement depuis le 13 octobre. ChatGPT excelle pour les tableaux et calculs. Claude tient mieux les longs documents. Gemini est pertinent si tu es déjà dans l'écosystème Google. Teste les trois avec le même prompt et garde celui qui te parle le plus.

### Dois-je systématiquement vérifier les résultats fournis par l'IA pour mes comparaisons de devis ?

Oui. Demande à l'IA de noter explicitement ce qui n'est pas précisé plutôt que de supposer. Relis chaque point sensible. L'IA structure. Tu décides.

### L'IA peut-elle aller jusqu'à m'aider à négocier les devis avec mes fournisseurs ?

Elle peut te préparer des arguments en te montrant les écarts entre plusieurs propositions. Elle peut rédiger un email de négociation. Mais elle ne connaît pas la valeur de ta relation avec le prestataire. La négociation reste humaine.

## Ce que je retiens

Je compare mes devis avec l'IA depuis plusieurs mois. Je gagne du temps. Je zappe moins de détails. Et surtout, je me sens moins seul face à des documents de vingt pages.

Je n'ai pas besoin d'être développeur pour ça. J'ai besoin d'un bon prompt, de fichiers propres, et de garder la tête froide. L'IA construit le tableau. Je garde le stylo rouge. C'est exactement l'équilibre que je cherchais.
