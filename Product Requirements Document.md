# Product Requirements Document (PRD) : PickOne

## 1. Vision et Concept
* **Nom du produit :** PickOne
* **Tagline :** Décide mieux. Regrette moins.
* **Concept :** PickOne est un "Decision Intelligence Engine". C'est une application mobile d'aide à la décision par IA qui transforme un choix complexe en une analyse structurée. Elle conduit une analyse psychologique complète en prenant en compte les priorités, les biais cognitifs et le risque de regret de l'utilisateur.

## 2. Parcours Utilisateur (User Flow)
Le flux principal est linéaire, réalisable en environ 2 minutes à travers 3 écrans principaux :
1. **Accueil (`app/index.tsx`) :** Saisie libre (minimum 20 caractères) du dilemme par texte ou saisie vocale.
2. **Questions (`app/dilemma/index.tsx`) :** L'utilisateur répond à 5 questions générées dynamiquement par l'IA (choix, slider sur 10, ou champ ouvert). La question 4 est obligatoirement orientée sur l'instinct.
3. **Résultats (`app/result/index.tsx`) :** Restitution de l'analyse complète (niveau de recommandation, scores pondérés, cohérence instinct/logique, biais détectés, scénario de regret, angle mort et question décisive).

## 3. Périmètre Fonctionnel Actuel (V3)
* **Pipeline IA (3 Appels successifs) :**
    * **Appel 1 :** Génération de 5 questions adaptatives basées sur le texte de l'utilisateur.
    * **Appel 2 :** Déduction de 5 critères de pondération (avec note et poids par défaut) basés sur les réponses aux questions.
    * **Appel 3 :** Analyse finale générant les biais cognitifs, le % de regret (entre 15 et 85%), un angle mort, et un scénario prédictif de regret.
* **Scoring local :** Le calcul du score (sur 100) est fait localement, sans IA, via la formule `Σ(note × poids) / totalPoids × 10`.
* **Niveaux de recommandation :** Classification en "Serré" (écart < 5), "Léger" (écart < 15) et "Clair" (écart ≥ 15).
* **Gestion des erreurs IA :** Tentative de retry sur erreur 429 (rate limit) et fallback automatique.

## 4. Évolutions Prévues (V4)
* **Saisie Vocale :** Ajout d'un bouton micro (utilisant `expo-speech-recognition`) pour remplacer la saisie clavier, permettant un "brain dump" plus riche émotionnellement.
* **Multi-options :** Dépassement de la limite binaire (A vs B) pour permettre d'évaluer 3, 4 ou 5 options simultanément avec des graphiques en radar.
* **Générateur de "Plan B" :** Détection de l'insatisfaction des options actuelles (score < 40/100 ou regret trop élevé) pour suggérer une 3ème voie inédite (Option C).
* **Regret Tracker :** Notifications push (via Expo Notifications) envoyées 1, 3 ou 6 mois après une décision pour évaluer la satisfaction a posteriori, créant une boucle de rétention.
* **Profil Cognitif :** Un dashboard personnel agrégeant l'historique de l'utilisateur pour y afficher son taux de satisfaction global, son alignement instinct/logique, et ses biais cognitifs les plus fréquents.

## 5. Architecture Technique
* **Stack Globale :** L'application cible iOS, Android et Web à partir d'une seule base de code via React Native (version 0.81.5) et Expo (version 54). Le routage utilise Expo Router 6.
* **Logique Métier & State Management :** Le projet utilise TypeScript 5.9 pour un typage strict et Zustand 4.5 pour gérer l'état en mémoire sans base de données dédiée pour le moment. La persistance future utilisera AsyncStorage.
* **Modèles d'IA :** Le moteur s'appuie en priorité sur Gemini 3.1 Flash Lite (`gemini-3.1-flash-lite-preview`), avec un fallback automatique sur Anthropic Claude 3.5 Haiku (`claude-3-5-haiku-20241022`).
* **Réseau :** Les appels IA sont gérés via une route API Web (`POST /api/llm`) pour éviter les soucis de CORS sur le web, ou via des appels directs sur les plateformes natives (timeout 30s) avec Axios.

## 6. UI/UX et Design System
* **Design System :** Thème clair (`#F4F4F6` pour le fond, `#FFFFFF` pour les surfaces), avec l'Orange (`#FF634A`) comme couleur primaire. Utilisation d'un système typographique complet (7 tailles).
* **Animations & Icônes :** Les animations fluides sont pilotées par `react-native-reanimated` et `moti`, et l'iconographie est gérée via `lucide-react-native`.
* L'expérience globale est pensée pour être étape par étape (façon Typeform), avec une séparation stricte entre l'interface et la logique de calcul complexe.