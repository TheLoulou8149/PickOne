# Fonctionnalités rajoutées V4

### 1. Saisie Vocale (Le "Brain Dump")

**Le concept :** Remplacer l'angoisse de la page blanche et la friction du clavier par un enregistrement vocal libre. L'utilisateur appuie sur un bouton et raconte son problème comme s'il laissait un message vocal à un ami.

* **Expérience UI :** Sur l'écran d'accueil, un grand bouton micro s'ajoute au champ texte. Une animation fluide (type onde sonore) montre que l'app écoute. Une fois terminé, le texte est retranscrit instantanément à l'écran pour validation avant l'Appel 1.
* **Valeur ajoutée :** À l'oral, les utilisateurs lâchent plus de détails de contexte, d'émotions brutes et de contradictions. L'IA (Appel 2 et 3) aura une matière beaucoup plus riche pour identifier les angles morts.
* **Impact technique :** Intégration d'une API de Speech-to-Text (comme Whisper d'OpenAI ou l'API native du téléphone) juste avant le pipeline IA existant.

### 2. Au-delà du duel (Multi-options)

**Le concept :** Casser la limite binaire du "A vs B" pour permettre d'évaluer 3, 4 ou 5 options simultanément (ex: *Quelle ville choisir entre Lyon, Nantes et Bordeaux ?*).

* **Expérience UI :** * Écran Questions : Les questions générées par l'IA devront adapter leurs boutons/sliders pour noter chaque option séparément.
    * Écran Résultats : La jauge "A vs B" est remplacée par un graphique en radar (toile d'araignée) ou un classement vertical (1er, 2e, 3e) avec l'écart de points.
* **Valeur ajoutée :** La réalité est rarement binaire. Cela permet de débloquer des situations complexes, comme les choix d'orientation ou les achats immobiliers.
* **Impact technique :** Modification du prompt de l'Appel 1 pour extraire un tableau `options[]` au lieu de `option_a` et `option_b`. L'algorithme de calcul des scores (actuellement sur 100) devra être normalisé pour fonctionner avec *n* variables.

### 3. Générateur de "Plan B" (L'échappatoire)

**Le concept :** Parfois, l'utilisateur hésite entre la peste et le choléra. Si l'IA détecte que les options proposées sont toutes les deux mauvaises ou généreront trop de regrets, elle propose une 3ème voie inexplorée (Option C).

* **Expérience UI :** Dans l'écran Résultats, si le score maximal est trop faible (ex: < 40/100) ou si le % de regret est trop élevé sur les deux choix, une nouvelle carte spéciale s'illumine : *"Et si tu faisais tout autre chose ?"*.
* **Valeur ajoutée :** C'est l'effet "Wahou" de l'IA. Elle sort du cadre strict du dilemme pour agir comme un vrai coach qui dit : "Le problème n'est pas de choisir entre A ou B, le problème c'est que tu as oublié l'option C".
* **Impact technique :** Ajout d'une condition dans le prompt de l'Appel 3 : si l'IA juge les options insatisfaisantes, elle génère un champ `alternative_strategy` dans son JSON final.

### 4. Le "Regret Tracker" (Machine à voyager dans le temps)

**Le concept :** C'est la concrétisation de la promesse "Regrette moins". L'application recontacte l'utilisateur des mois plus tard pour vérifier la pertinence de la décision prise.

* **Expérience UI :** * À la fin d'un résultat, l'utilisateur clique sur "Sauvegarder ma décision". 
    * 1, 3 ou 6 mois plus tard, une notification push s'affiche : *"Il y a 3 mois, tu as choisi [Option]. Le regrettes-tu ?"*
    * Une mini-interface rapide s'ouvre avec un slider de satisfaction.
* **Valeur ajoutée :** Crée une puissante boucle de rétention. L'application prouve sa valeur sur la durée et aide l'utilisateur à prendre conscience de ses bonnes ou mauvaises intuitions a posteriori.
* **Impact technique :** Nécessite de persister les données (Zustand + AsyncStorage local ou base de données) et de configurer des notifications locales programmées (via Expo Notifications).

### 5. Le Profil Cognitif (Méta-analyse)

**Le concept :** Un tableau de bord personnel qui synthétise la manière dont l'utilisateur prend ses décisions au fil du temps, en se basant sur l'historique de ses dilemmes.

* **Expérience UI :** Un nouvel onglet "Mon Profil" accessible depuis l'accueil. On y trouverait :
    * Le taux global de satisfaction ("Tes choix te rendent heureux à 85%").
    * L'alignement Instinct/Logique ("Tu écoutes ton instinct dans 60% des cas").
    * Le "Mur des Biais" : un classement de ses biais cognitifs les plus fréquents (ex: *Biais de rareté : détecté 4 fois sur tes derniers dilemmes*).
* **Valeur ajoutée :** On passe d'un outil utilitaire ("Quel ordi acheter ?") à un outil de développement personnel profond. L'utilisateur apprend à se connaître.
* **Impact technique :** Requiert un historique persistant (au moins en local). Il faudra scripter une logique frontend capable d'agréger les données des anciens appels IA stockés pour en sortir des statistiques simples.