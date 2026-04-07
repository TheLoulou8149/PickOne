# Spécifications Techniques : PickOne

Ce document détaille l'architecture technique, les langages et les outils précis qui seront utilisés pour construire le "Decision Intelligence Engine" de PickOne, afin de garantir une séparation propre entre l'interface utilisateur et la logique de calcul complexe.

## 1. Technologies Fondamentales

- **Framework : Expo (React Native)**
  *Pourquoi ?* Il permet de compiler à partir d'une seule base de code vers iOS, Android et le Web. Lors d'un jam ou d'une démo, la version Web est un atout majeur. L'utilisation du routage **Expo Router** (routage basé sur les fichiers) simplifiera la navigation de type "Typeform" (étape par étape).
- **Langage : TypeScript**
  *Pourquoi ?* Indispensable pour un moteur de calcul de biais et de score. TypeScript garantit que les structures de données (les critères, les poids, les scores émotionnels) sont strictement typées, réduisant massivement les bugs de logique.

## 2. Interface Utilisateur (UI) et Animations

Le design doit être "TRÈS produit", avec des transitions fluides et un mode sombre/dramatique ("Regret Mode").

- **Styling : NativeWind (Tailwind CSS pour React Native) ou StyleSheet standard**
  *Pourquoi ?* Permet de créer rapidement une interface moderne, minimaliste et cohérente sur toutes les tailles d'écran.
- **Moteur d'Animation : React Native Reanimated 3 & Moti**
  *Pourquoi ?* "Moti" rend la création d'animations complexes très simple (ex: faire apparaître les alertes de biais, animer le remplissage des jauges de score émotionnel et rationnel).
- **Icônes : Lucide React Native**
  *Pourquoi ?* Une vaste librairie d'icônes professionnelles pour rassurer l'utilisateur et guider la navigation.

## 3. Logique Métier et Gestion d'État ("Le Cerveau")

L'architecture va strictement séparer les vues (les écrans) du moteur d'analyse.

- **State Management : Zustand**
  *Pourquoi ?* Contrairement à l'état local (useState) de React, Zustand centralise les données. Lorsqu'un utilisateur répond à une question, sa réponse est envoyée au "Store Zustand". C'est ce store qui stockera la logique du **Scoring Multi-critères** (calcul mathématique) et du **Bias Engine**.
  
  Le *Store* calculera en temps réel :
  - `scoreMathematique`: basé sur la pondération des critères.
  - `scoreEmotionnel`: basé sur les mots choisis ou les réponses instinctives.
  - `alertesBiais`: un tableau d'alertes générées par le *Bias Engine* et le LLM.

## 4. Intégration Intelligence Artificielle (Le Profilage Dynamique)

- **Appels API : native `fetch` ou `axios`**
  *Comment ?* Le service `llmService.ts` sera chargé d'envoyer le contexte du dilemme de l'utilisateur à un modèle de langage (ex: OpenAI GPT-4o-mini ou Anthropic Claude 3 Haiku via API REST).
- **Formatage des Prompts (Prompt Engineering) :**
  L'application construira un Prompt système strict demandant au modèle de retourner un objet **JSON** précis, par exemple :
  ```json
  {
     "prochaineQuestion": "Avez-vous plus peur d'échouer ou de regretter de ne pas avoir essayé ?",
     "biaisDetectes": ["Biais de statu quo", "Aversion à la perte"]
  }
  ```
  Le frontend analysera ce JSON pour mettre à jour l'interface (afficher la nouvelle question et animer les alertes).

## 5. Stockage des Données (Optionnel mais recommandé)

- **Local : AsyncStorage (ou Zustand Persist)**
  *Pourquoi ?* Pour sauvegarder localement les historiques de décisions sans avoir besoin de créer une base de données complexe (Firebase/Supabase) dans un premier temps. L'utilisateur lance l'app, et ses précédents dilemmes sont déjà chargés depuis la mémoire de son téléphone.

---

## 6. Architecture des dossiers prévue

```
PickOne/
├── app/                  # (Expo Router) Tous les écrans
│   ├── index.tsx         # Écran d'accueil
│   ├── dilemma/          # Écrans des questions adaptatives
│   └── result/           # Écran final "Regret Simulator" et Score
├── components/           # Composants UI purs (Boutons, Jauges, Cartes)
├── store/
│   └── decisionStore.ts  # État Zustand et algorithmes de calcul locaux
├── services/
│   └── llmService.ts     # Les fonctions qui appellent OpenAI/Anthropic
└── constants/            # Couleurs, Thème sombre, Typographie
```
