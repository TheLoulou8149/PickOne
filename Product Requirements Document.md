# Product Requirements Document (PRD) : PickOne

## 1. Vision et Concept
* **Nom du produit :** PickOne
* **Tagline :** Décide mieux. Regrette moins.
* **Concept :** PickOne est un "Decision Intelligence Engine". C'est une application mobile d'aide à la décision par IA qui transforme un choix complexe en une analyse structurée. Elle conduit une analyse psychologique complète en prenant en compte les priorités, les biais cognitifs et le risque de regret de l'utilisateur.

## 2. Parcours Utilisateur (User Flow)
Le flux principal est linéaire, réalisable en environ 2 minutes à travers 3 écrans principaux :
1. **Accueil (`app/index.tsx`) :** Saisie libre (minimum 20 caractères) du dilemme par texte ou saisie vocale.
2. **Questions (`app/dilemma/index.tsx`) :** L'utilisateur répond à 2 à 10 questions générées dynamiquement par l'IA selon la complexité du dilemme (choix, slider sur 10, ou champ ouvert). Une question de type `choice` sur l'instinct est toujours incluse en avant-dernière position.
3. **Résultats (`app/result/index.tsx`) :** Restitution de l'analyse complète (niveau de recommandation, scores pondérés, cohérence instinct/logique, biais détectés, simulation de regret, angle mort, question décisive, et Plan B conditionnel).

## 3. Périmètre Fonctionnel Actuel (V4)

### Pipeline IA (3 Appels successifs)
* **Appel 1 :** Génération de 2 à 10 questions adaptatives basées sur le texte de l'utilisateur. Extrait 2 à 5 options, produit un `context_summary` et identifie l'`instinct_question_id`.
* **Appel 2 :** Déduction de 5 critères de pondération contextuels (label ≤ 4 mots extrait du texte, description, `default_weight` 1-10, `option_scores` différenciés par option) basés sur les réponses aux questions.
* **Appel 3 :** Analyse finale générant la recommandation, la raison, les biais cognitifs détectés, les scores de regret (entre 15 et 85%) avec scénarios à 1 an, l'angle mort, la question décisive, et un `alternative_strategy` (Plan B) conditionnel.

### Scoring et logique locale
* **Scoring local :** Le calcul du score (sur 100) est fait localement, sans IA, via la formule `Σ(note × poids) / totalPoids × 10`.
* **Niveaux de recommandation :** Classification en "Serré" (écart < 5), "Léger" (écart < 15) et "Clair" (écart ≥ 15).
* **Cohérence instinct/logique :** Comparaison entre la réponse à la question instinct et l'option gagnante par les scores.
* **Plan B (`alternative_strategy`) :** Généré par l'Appel 3 uniquement si le score maximum est < 40/100 ou si le regret dépasse 65%.

### Fonctionnalités transverses
* **Saisie vocale :** Bouton micro (`expo-speech-recognition`, fr-FR, résultats interims, mode continu) disponible sur l'écran d'accueil et sur les questions ouvertes. Désactivé sur web.
* **Authentification :** Connexion et inscription via Supabase Auth (email + mot de passe). Sessions persistées via AsyncStorage (mobile) ou localStorage (web).
* **Sauvegarde automatique :** Chaque analyse est sauvegardée automatiquement dans la table `decisions` de Supabase à l'affichage des résultats.
* **Historique :** Liste des décisions passées avec tri (récent, ancien, score desc/asc), sélection multiple, et suppression batch. Consultation du détail en readonly.
* **Profil utilisateur (4 onglets) :**
    * *Compte :* Email, date d'inscription, compteur de décisions, déconnexion.
    * *Sécurité :* Changement de mot de passe avec ré-authentification.
    * *Contexte IA :* 6 champs libres (âge, situation pro, situation perso, valeurs, style de risque, contexte libre) sauvegardés dans Supabase et injectés discrètement dans chaque appel IA.
    * *Profil Cognitif :* Analyse IA à la demande de l'historique complet — sujets récurrents, patterns comportementaux, synthèse, question miroir, alignement instinct/logique, top 5 biais.
* **Feedback :** Modal de retour utilisateur (bug/suggestion/autre) envoyé par email via Resend API.
* **Gestion des erreurs IA :** Retry automatique sur erreur 429 (rate limit) avec délai parsé depuis le header Gemini (max 2 tentatives).
* **Limitation connue :** Le fallback sur Claude est déclaré dans `services/llmService.ts` mais n'est pas câblé côté backend (`backend/server.js` n'appelle que Gemini).

## 4. Évolutions Prévues (V5)
* **Multi-options :** Dépassement de la limite binaire (A vs B) pour permettre d'évaluer 3, 4 ou 5 options simultanément avec des graphiques en radar.
* **Regret Tracker :** Notifications push (via Expo Notifications) envoyées 1, 3 ou 6 mois après une décision pour évaluer la satisfaction a posteriori, créant une boucle de rétention.
* **Recherche dans l'historique :** Barre de recherche textuelle pour filtrer les décisions passées par sujet.
* **Fallback Claude opérationnel :** Câbler le fallback Anthropic dans `backend/server.js` pour une vraie résilience multi-provider.
* **Tests automatisés :** Couverture unit/e2e (scoring local, parsing JSON, flux principal).

## 5. Architecture Technique
* **Stack Globale :** L'application cible iOS, Android et Web à partir d'une seule base de code via React Native (version 0.81.5) et Expo (version 54). Le routage utilise Expo Router 6.
* **Logique Métier & State Management :** Le projet utilise TypeScript 5.9 pour un typage strict et Zustand 4.5 pour gérer l'état en mémoire le temps d'une session. La persistance des décisions est assurée par Supabase.
* **Persistance :** Supabase PostgreSQL avec trois tables : `decisions` (historique des analyses), `user_stats` (compteur total), `user_context` (profil contextuel de l'utilisateur).
* **Modèles d'IA :** Le moteur s'appuie sur Gemini 3.1 Flash Lite (`gemini-3.1-flash-lite-preview`) via un backend Express proxy déployé sur Render. Le fallback sur Anthropic Claude 3.5 Haiku (`claude-3-5-haiku-20241022`) est prévu mais non encore câblé côté backend.
* **Réseau :** Tous les appels IA transitent par le backend Express (`/api/llm`) sur Render, quelle que soit la plateforme. Timeout de 50s. Axios est utilisé côté client.

## 6. UI/UX et Design System
* **Design System :** Thème clair (`#FFFFFF` pour le fond, surfaces beige/gris pâles), avec l'Orange (`#E8532A`) comme couleur primaire. Utilisation d'un système typographique complet (7 tailles, de 11px à 36px).
* **Animations & Icônes :** Les animations fluides sont pilotées par `react-native-reanimated` et `moti`, et l'iconographie est gérée via `lucide-react-native`.
* L'expérience globale est pensée pour être étape par étape (façon Typeform), avec une séparation stricte entre l'interface et la logique de calcul complexe.