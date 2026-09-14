---
slug: ia-et-ecologie
titre: L'IA pollue-t-elle vraiment ? Les vrais chiffres
titre_seo: L'IA pollue-t-elle vraiment ? Ce que consomme ChatGPT
description: 'Électricité, eau, carbone : ce que consomme vraiment une requête ChatGPT. Les vrais chiffres, sans alarmisme ni déni, pour entrepreneurs curieux.'
numero: '50'
categorie: Décryptage
hero_ligne_1: L'IA pollue
hero_ligne_2: vraiment ?
hero_ligne_3: Les chiffres sans filtre
lead: 'Tu utilises ChatGPT tous les jours pour ton business. Et tu te demandes, parfois, ce que ça coûte vraiment à la planète. Les gros titres parlent de catastrophe hydrique, de centres de données voraces, d''un internet qui chauffe. Mais entre l''alarmisme et le déni, où est la réalité ? Je me suis posé la même question. J''ai cherché les chiffres sourcés, les nuances que les articles grand public oublient, et les gestes qui changent quelque chose. Voilà ce que j''ai trouvé.'
duree: 9 min
niveau: Débutant
outils: ChatGPT
published: '2026-09-14'
tldr:
  - 'Une requête courte sur ChatGPT consomme environ <strong>0,3 Wh</strong>, soit 10 fois plus qu''une recherche Google, mais ça reste faible à l''échelle individuelle.'
  - 'L''eau est le chiffre qui m''a le plus surpris : <strong>0,3 mL par requête</strong> selon OpenAI, mais certains modèles montent bien plus haut.'
  - 'Le vrai problème, c''est <strong>l''échelle</strong> : des millions d''utilisateurs, des centres de données qui doublent, des puces GPU dont la fabrication explose.'
  - 'Tu peux agir concrètement : <strong>choisir le bon modèle, écrire des prompts plus courts</strong>, et éviter les tâches inutilement lourdes.'
---

```

<!-- section k-fuchsia -->

## L'IA, immatérielle ? Pas vraiment

On parle de "cloud", de "modèles", de "requêtes". Tout ça semble flotter quelque part dans l'air, sans poids, sans friction. Sauf que derrière chaque réponse de ChatGPT, il y a des serveurs physiques, des circuits qui chauffent, de l'eau qui refroidit, et de l'électricité qui circule en permanence.

Je ne dis pas ça pour culpabiliser qui que ce soit. Je l'utilise moi-même tous les jours. Mais j'ai voulu savoir ce que ça représente vraiment, en chiffres, pas en métaphores.

La bonne nouvelle : les chiffres à l'échelle d'un usage individuel sont moins catastrophiques que les gros titres le laissent entendre. La mauvaise : à l'échelle collective, la trajectoire est préoccupante. Et la nuance entre les deux, c'est précisément ce que cet article essaie de tenir.

---

## Ce que consomme une question à ChatGPT

Commençons par le plus concret. Tu tapes une question courte dans ChatGPT. Combien d'électricité ça consomme ?

Selon les données disponibles, une requête courte sur ChatGPT coûte environ **0,3 Wh** (watt-heure). C'est environ 10 fois plus qu'une recherche classique sur Google [F1][F4]. Dit comme ça, ça fait peur. Mais pour mettre ça en perspective : 0,3 Wh, c'est à peu près ce que consomme une ampoule LED pendant 2 minutes.

Là où ça se complique, c'est avec les requêtes longues ou les modes de raisonnement avancés. Un prompt complexe, une conversation qui s'étire, un modèle qui "réfléchit" en plusieurs étapes... et la consommation peut grimper jusqu'à **plusieurs dizaines de Wh** pour une seule interaction [F4]. C'est un facteur multiplicateur qui mérite attention.

Ce que ça signifie concrètement pour toi : la façon dont tu formules tes prompts a un impact direct sur la consommation. Un prompt précis et court consomme moins qu'un prompt vague qui oblige le modèle à itérer. J'en parle plus en détail dans mon article sur [comment écrire un bon prompt quand on n'est pas développeur](/articles/ecrire-bon-prompt-non-dev).

<div class="callout tip"><h4>Ce que je retiens sur l'électricité</h4><p>Le facteur 10 par rapport à Google est réel, mais il ne dit pas tout. Ce qui compte vraiment, c'est la nature de la tâche. Une requête de raisonnement ou un long échange consomme bien plus qu'une question simple. Avant de lancer une session de travail intensive avec une IA, vaut mieux savoir ce qu'on cherche.</p></div>

---

## La soif cachée des data centers

L'eau, c'est le chiffre qui m'a le plus surpris quand j'ai commencé à creuser.

Les serveurs qui font tourner les modèles d'IA chauffent énormément. Pour les refroidir, les data centers utilisent de l'eau, parfois en circuit fermé, parfois en évaporation directe. Résultat : chaque requête a une empreinte hydrique, même si tu n'y penses jamais.

Google a mesuré une consommation de **0,26 mL d'eau par requête Gemini**. Sam Altman, le patron d'OpenAI, a cité environ **0,3 mL pour ChatGPT** [F5]. Ces chiffres ne comptent que le refroidissement sur site, pas l'eau nécessaire à la production d'électricité en amont.

Pour comparer : Mistral, l'entreprise française, a publié des données sur son modèle Large 2. Sur 18 mois d'entraînement, il a consommé 281 000 m³ d'eau. Et à l'usage, on parle d'environ **45 mL par requête** [F11], soit 150 fois plus que ChatGPT. La différence est énorme et illustre bien que tous les modèles ne se valent pas.

À l'échelle mondiale, les systèmes d'IA auraient consommé environ **765 milliards de litres d'eau en 2025**, soit davantage que la consommation mondiale totale d'eau en bouteille sur la même période [S2]. Et selon les projections, d'ici 2027, l'IA pourrait consommer autant d'eau que la moitié du Royaume-Uni [S3].

Ces chiffres globaux donnent le vertige. Mais ils résultent de milliards d'interactions quotidiennes, pas de ton usage personnel.

<!-- section k-teal -->

## L'entraînement, les puces, le reste

Quand on parle de l'impact de l'IA, on pense souvent à l'usage quotidien. Mais il y a deux autres dimensions qui pèsent lourd.

**L'entraînement d'abord.** Former un modèle de pointe comme ceux de la famille GPT peut générer plusieurs milliers de tonnes de CO₂ et nécessiter des millions de litres d'eau [F2]. C'est un coût ponctuel, mais massif. La bonne nouvelle : une fois le modèle entraîné, cet investissement est "amorti" sur toutes les requêtes qui suivent.

Et justement, à partir d'un certain volume d'utilisation, l'inférence (c'est-à-dire l'usage quotidien du modèle) devient plus consommatrice que l'entraînement lui-même. Ce seuil se situe autour de 200 à 600 millions d'utilisations [F3]. Les modèles populaires comme ChatGPT le franchissent rapidement. Ce qui veut dire que nos habitudes d'usage pèsent collectivement plus lourd que la phase de création du modèle.

**Les puces GPU ensuite.** Les processeurs graphiques qui font tourner l'IA ne tombent pas du ciel. Leur fabrication est extrêmement énergivore. Selon des projections publiées en 2025, les émissions de CO₂ liées à la fabrication de ces puces pourraient être multipliées par 16 entre 2024 et 2030, pour atteindre 19,2 millions de tonnes de CO₂ équivalent [F10]. C'est une partie de l'empreinte que les entreprises tech mentionnent rarement.

**L'espace au sol, enfin.** Les centres de données occupent de la surface physique. Beaucoup. L'empreinte foncière mondiale devrait passer de 6 900 km² en 2025 à plus de 14 500 km² d'ici 2030 [F12]. C'est une pression supplémentaire sur les territoires, souvent dans des zones déjà tendues en eau ou en énergie.

---

## Les chiffres qui donnent le vertige

Quelques ordres de grandeur pour mettre tout ça en perspective.

La consommation électrique mondiale des centres de données a atteint **787,8 TWh en 2025**, soit une hausse de près de 20 % en un an. Elle pourrait doubler d'ici 2030, tirée en grande partie par l'IA [S1].

Pour comprendre ce que représente un TWh : c'est environ la consommation annuelle de 300 000 foyers français. Multiplié par 787. Et potentiellement par deux d'ici 2030.

Ces chiffres ne sont pas là pour te décourager d'utiliser l'IA. Ils sont là pour comprendre que la question de l'impact n'est pas individuelle. Elle est systémique. Et que les décisions qui comptent vraiment se prennent au niveau des entreprises tech, des gouvernements et des régulateurs, pas uniquement dans ta façon de formuler tes prompts. J'en parle dans mon article sur [l'AI Act et ce qu'il change pour ton business](/articles/ai-act-pour-ton-business).

<!-- section k-orange -->

## Pourquoi les chiffres varient autant

Tu as peut-être remarqué que les données qu'on lit sur l'impact de l'IA varient énormément selon les sources. Il y a plusieurs raisons à ça.

**Le périmètre de mesure change tout.** Certains chiffres comptent uniquement le refroidissement sur site (comme les 0,3 mL d'OpenAI). D'autres intègrent l'eau nécessaire à la production d'électricité en amont. Les résultats peuvent différer d'un facteur 10 ou plus.

**Les modèles ne se ressemblent pas.** Un modèle "flash" ou "lite", optimisé pour la vitesse et l'efficacité, consomme beaucoup moins qu'un modèle de raisonnement avancé. [GPT-5.5](/lexique/gpt-5-5), lancé le 23 avril 2026, n'a pas la même empreinte qu'un modèle plus léger. [Claude Opus 4.7](/lexique/claude-opus-4-7), sorti le 16 avril 2026 avec des capacités agentiques renforcées, non plus. Et [Gemini](/lexique/gemini-3-1-pro) propose plusieurs niveaux de modèles avec des consommations très différentes.

**La transparence est encore rare.** La plupart des entreprises ne publient pas de données détaillées sur la consommation de leurs modèles. Mistral fait partie des exceptions notables avec ses chiffres publiés en juillet 2026 [F11]. OpenAI et Google ont communiqué des ordres de grandeur, mais sans audit indépendant systématique.

**Le mix énergétique local compte.** Un data center alimenté à l'énergie renouvelable n'a pas le même bilan carbone qu'un data center au charbon. La localisation géographique des serveurs change radicalement l'empreinte CO₂ d'une requête.

<div class="callout tip"><h4>Le piège à éviter</h4><p>Méfie-toi des comparaisons spectaculaires sans périmètre précis. "L'IA consomme autant que tel pays" peut être vrai ou faux selon ce qu'on mesure et comment. Quand tu lis un chiffre alarmant, cherche toujours : quel modèle ? quelle phase (entraînement ou usage) ? quel périmètre d'eau ou d'énergie ? Ça change tout.</p></div>

---

## Ce que tu peux faire, concrètement

Je vais être honnête : à l'échelle individuelle, l'impact d'un entrepreneur qui utilise ChatGPT quelques heures par semaine reste marginal. Ce n'est pas une raison pour ignorer le sujet, mais c'est une raison de ne pas se flageller.

Voilà ce qui change vraiment quelque chose.

**Choisir le bon modèle pour la bonne tâche.** Un modèle léger pour une tâche simple, un modèle puissant pour une tâche complexe. Utiliser GPT-5.5 pour reformuler un email, c'est surdimensionné. Mon article sur [comment choisir son IA selon la tâche](/articles/choisir-ia-ecrire-coder-images) peut t'aider à calibrer ça.

**Écrire des prompts plus précis.** Un prompt vague génère des allers-retours. Un prompt précis obtient la réponse en une fois. C'est moins de consommation, et c'est aussi plus efficace pour toi. Double bénéfice.

**Éviter les tâches inutilement lourdes.** Générer des images en haute résolution, lancer des agents qui tournent en boucle, demander des analyses sur des documents entiers quand une section suffit... chaque choix a un coût.

**Rester informé sur les engagements des acteurs.** Les grandes entreprises tech prennent des engagements sur leur mix énergétique et leurs objectifs carbone. Certains sont sérieux, d'autres moins. Suivre ces engagements, c'est aussi exercer une pression de marché.

L'IA peut par ailleurs contribuer à des solutions environnementales : optimisation énergétique, modélisation climatique, agriculture de précision. L'impact n'est pas unidirectionnel. Mais ça ne dispense pas de regarder le coût en face.

---

## Questions fréquentes

### Mon utilisation de ChatGPT en tant qu'entrepreneur a-t-elle un impact significatif sur l'environnement ?

À l'échelle individuelle, non, pas vraiment. Une requête courte consomme environ 0,3 Wh et 0,3 mL d'eau. C'est faible. Là où l'impact devient significatif, c'est à l'échelle de millions d'utilisateurs simultanés. Ton usage compte dans l'agrégat, mais la responsabilité principale se situe au niveau des entreprises et des politiques énergétiques des data centers.

### Est-ce que tous les modèles d'IA consomment la même quantité d'énergie et d'eau ?

Non, loin de là. Les écarts sont considérables. Mistral Large 2 consomme environ 45 mL d'eau par requête, contre 0,3 mL pour ChatGPT selon OpenAI. Les modèles "flash" ou "lite" consomment une fraction de ce que consomment les modèles de raisonnement avancés. Le choix du modèle est donc une vraie variable environnementale.

### Quelles sont les principales différences entre la consommation liée à l'entraînement et celle liée à l'utilisation d'une IA ?

L'entraînement est un coût ponctuel et massif : plusieurs milliers de tonnes de CO₂ et des millions de litres d'eau pour un modèle de pointe. L'inférence (l'usage quotidien) est un coût continu et plus faible par requête, mais qui finit par dépasser l'entraînement dès que le modèle atteint 200 à 600 millions d'utilisations. Pour les modèles populaires, ce seuil est franchi rapidement.

### Comment puis-je réduire l'empreinte écologique de mon usage de l'IA au quotidien ?

Trois leviers concrets : choisir un modèle adapté à la complexité de ta tâche (pas toujours le plus puissant), écrire des prompts précis pour éviter les allers-retours, et éviter les usages surdimensionnés comme générer des images haute résolution pour un usage interne. Ce sont de petits gestes, mais ils s'additionnent.

### Les entreprises tech sont-elles transparentes sur la consommation de leurs IA ?

Pas suffisamment. Mistral a publié des données détaillées sur son modèle Large 2 en juillet 2026, ce qui est notable. OpenAI et Google ont communiqué des ordres de grandeur sur l'eau, mais sans audit indépendant systématique. La transparence progresse, notamment sous la pression réglementaire, mais elle reste incomplète.

### L'IA peut-elle aussi être une solution pour la transition écologique ?

Oui, et c'est une nuance importante. L'IA est utilisée pour optimiser la consommation énergétique des bâtiments, améliorer les modèles climatiques, réduire le gaspillage dans l'agriculture ou optimiser les réseaux électriques. L'impact n'est pas uniquement négatif. Mais ça ne signifie pas que la consommation des modèles généraux est compensée automatiquement par ces usages.

---

## Ce que je retiens

Je fais tout ça d'abord pour moi. Et quand j'ai commencé à creuser ce sujet, j'attendais soit une catastrophe évidente, soit une réassurance totale. J'ai trouvé autre chose : une réalité à plusieurs niveaux.

À l'échelle d'un entrepreneur qui utilise ChatGPT pour son travail quotidien, l'impact direct est faible. Quelques millilitres d'eau, quelques fractions de Wh. Rien qui justifie de tout arrêter.

Mais à l'échelle collective, la trajectoire est réelle. Des centres de données qui doublent de surface, une consommation électrique qui croît de 20 % par an, des puces GPU dont la fabrication va exploser. Ce n'est pas de l'alarmisme, ce sont des projections publiées et sourcées.

Ce que je tire de tout ça : utiliser l'IA de façon plus intentionnelle. Pas moins, mais mieux. Choisir le bon modèle, écrire des prompts qui vont droit au but, et rester attentif à ce que les acteurs du secteur font vraiment, au-delà des communiqués de presse.

Et continuer à poser des questions.
