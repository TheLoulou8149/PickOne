# Description du Produit : PickOne

## 1. Concept Principal
Une application d'aide à la décision ("Decision Intelligence Engine") qui transforme un choix complexe (ex: stage A ou B) en une analyse structurée. Elle prend en compte les priorités, les émotions et les biais cognitifs de l'utilisateur pour lui fournir une recommandation argumentée, favorisant les "bonnes décisions, pas juste les décisions faciles".

## 2. Fonctionnalités Clés
-**Clarification intelligente :** Saisie d'un dilemme et génération de questions dynamiques et adaptatives sur les objectifs (salaire, carrière, apprentissage, plaisir), les contraintes (temps, lieu, pression) et le ressenti instinctif (peur, attrait)
- **Pondération et Scoring multi-critères :** Attribution de poids aux critères par l'utilisateur pour calculer un score pondéré mathématique, un score émotionnel et un score de cohérence globale
-**Moteur d'Analyse Comportementale (Bias Engine & Regret Simulator) :** Détection et affichage des biais cognitifs (peur, confort, social, court terme) influençant le choix, et simulation du risque de regret futur pour créer un impact mémorable

## 3. Fonctionnalités Techniques Spécifiques
- [x] Autre : **Intégration d'API LLM (ex: OpenAI, Anthropic)**. Indispensable pour que l'application puisse poser des "questions adaptatives selon la réponse" et analyser du texte libre.
- [x] Autre : **Logique d'algorithmique de scoring en local**. Le cœur du moteur mathématique et pondéral.

## 4. Design et Expérience Utilisateur (UI/UX)
L'interface doit être à la fois percutante et rassurante pour donner un résultat "hyper crédible" et faire "TRÈS produit". Il faudra privilégier un design épuré, guidé étape par étape (façon Typeform pour l'input). Le "Regret Mode" étant décrit comme "ultra stylé", on peut imaginer un thème sombre ou des animations dramatiques avec des jauges visuelles pour les scores et les alertes de biais

## 5. Plateformes Cibles
- [x] iOS
- [x] Android
- [x] Web (Fortement recommandé pour faciliter l'accès instantané lors d'une démo live, sans obliger le public à télécharger une application).

## 6. Autre
Puisque le différenciateur principal est le "Bias Engine" et le "Regret Simulator", l'architecture devra bien séparer l'interface (UI) de la logique de calcul complexe. L'utilisation d'un framework comme Expo (React Native) est un excellent choix ici pour déployer rapidement sur iOS, Android et Web avec une seule base de code pendant le jam.