# PickOne — Product Description V3

> **Tagline :** Décide mieux. Regrette moins.

---

## Ce que fait l'app

PickOne est une application mobile d'aide à la décision par IA. L'utilisateur décrit une situation où il hésite entre **deux options** en texte libre. L'app conduit une analyse en 3 appels IA successifs et restitue une analyse psychologique complète : recommandation pondérée, biais cognitifs détectés, simulation de regret, angle mort, et question décisive.

Il n'y a pas de compte utilisateur, pas de base de données, pas de backend propre. Tout tourne côté client avec des appels directs aux APIs Gemini et Claude.

---

## Flux actuel (V3)

```
[Accueil]
    ↓ saisie texte libre (min. 20 chars) → Appel 1 (génération questions)
[Questions]
    ↓ 5 questions une par une → sur la dernière : Appel 2 + Appel 3 en séquence
[Résultats]
    ↓ "Nouveau dilemme" → reset → retour Accueil
```

Le flux est linéaire en 3 écrans. Il n'y a pas d'étape intermédiaire de pondération manuelle.

---

## Écrans

### 1. Accueil — `app/index.tsx`

- Header : icône Zap (orange), nom "PickOne", tagline "Décide mieux. Regrette moins."
- Card "Décris ta situation" avec textarea multiline (min. 160px) + **bouton micro circulaire**
- Placeholder d'exemple : situation CDI vs Startup avec chiffres concrets
- Compteur de caractères : gris si < 20, vert + "✓" si ≥ 20
- Bouton "Analyser ma situation →" (désactivé si < 20 chars, spinner pendant le chargement, désactivé aussi pendant l'enregistrement vocal)
- Message d'erreur affiché sous la card si l'appel échoue
- Footer : "3 étapes · ~2 min · Analyse IA complète" + badge IA (provider de l'Appel 1)
- Sur submit : appelle `callAppel1`, stocke le résultat dans le store, navigue vers `/dilemma`

**Saisie vocale (V4) :**
- Bouton micro circulaire à droite du textarea
- Appui → demande permission micro + reconnaissance vocale (langue `fr-FR`)
- Pendant l'enregistrement : 3 anneaux animés qui pulsent en onde (Reanimated), textarea en surbrillance orange, texte interimaire affiché en temps réel
- Appui à nouveau (icône `MicOff`) → arrête l'enregistrement
- Résultat final : transcription ajoutée/concaténée dans le textarea pour relecture avant validation
- Erreur de permission ou de reconnaissance → message d'erreur standard
- Technologie : `expo-speech-recognition` (reconnaissance native iOS/Android, sans API key supplémentaire)

---

### 2. Questions — `app/dilemma/index.tsx`

- Barre de progression en haut : barre de remplissage orange + "X / total"
- Bouton retour (icône ChevronLeft) désactivé sur la Q1
- Pill contextuel : "**Option A** vs **Option B**" + badge IA (provider Appel 1)
- Carte question avec badge "QUESTION X" et texte de la question en grand
- 3 types de questions rendues dynamiquement :
  - **`choice`** : boutons tactiles (fond orange transparent + bordure orange si sélectionné)
  - **`slider`** : `SegmentSlider` — 10 segments cliquables, valeur par défaut à 5, labels min/max, affichage "X/10"
  - **`open`** : TextInput multiline (min. 100px)
- Bouton "Passer" (passe à la question suivante sans enregistrer la réponse)
- Bouton "Suivant" (→ sur dernière question : "Analyser") désactivé si pas de réponse (sauf slider)
- Sur la **dernière question** :
  1. Sauvegarde toutes les réponses locales dans le store
  2. Lance `callAppel2` → stocke les critères
  3. Calcule les scores pondérés localement
  4. Lance `callAppel3` → stocke l'analyse
  5. Navigue vers `/result`
- Message d'erreur affiché si un appel échoue

---

### 3. Résultats — `app/result/index.tsx`

Scroll vertical avec 9 blocs dans l'ordre :

| # | Composant | Contenu |
|---|-----------|---------|
| 1 | **NiveauCard** | Niveau de recommandation : `serré` (orange), `léger` (bleu), `clair` (vert) + raison de l'IA |
| 2 | **ScoresCard** | Deux jauges A vs B sur 100, winner en orange, badge "Meilleur score" |
| 3 | **CoherenceCard** | Message instinct vs logique avec icône : ✓ accord (vert), — neutre (orange), ⚠ désaccord (orange) |
| 4 | **CriteriaBarometers** | Mini graphique en barres des 5 critères avec poids (1-10) |
| 5 | **BiasCard × N** | Cartes dépliables par biais : icône ⚠ orange, nom du biais, explication dépliable |
| 6-7 | **RegretCard × 2** | % risque de regret (rouge si ≥60, orange si ≥40, vert sinon) + scénario précis + badge "Recommandé" |
| 8 | **BlindspotCard** | "Angle mort" : icône Eye (accent), texte direct sur ce que l'utilisateur évite de voir |
| 9 | **DecidingQuestion** | "La question qui tranche tout" : card fonds orange transparent, question en italique centrée |
| — | **AiBadge** | Provider de l'Appel 3 |
| — | **Bouton restart** | "Nouveau dilemme" : icône RotateCcw → `store.reset()` + `router.replace('/')` |

---

## Pipeline IA — 3 appels

### Appel 1 — Génération des questions
- **Modèle** : Gemini 3.1 Flash Lite → fallback Claude 3.5 Haiku
- **Entrée** : texte libre de l'utilisateur
- **Sortie** :
  - `context_summary` : 1-2 phrases de résumé
  - `option_a_label` / `option_b_label` : max 3 mots
  - `instinct_question_id` : toujours `"q4"`
  - `questions[]` : 5 questions typées
- **Règles prompt** :
  - Questions génériques interdites
  - Q4 OBLIGATOIRE = choix instinct avec options `[optA]`, `[optB]`, `"Les deux pareil"`
  - Progression : Q1 factuelle → Q2 factuelle → Q3 émotionnelle → Q4 instinct → Q5 inconfortable

### Appel 2 — Critères de pondération
- **Modèle** : Gemini 3.1 Flash Lite → fallback Claude 3.5 Haiku
- **Entrée** : texte original + paires Q&R + labels options
- **Sortie** : `criteria[]` avec 5 critères, chacun contenant `id`, `label`, `description`, `default_weight` (1-10), `score_a`, `score_b`, `score_rationale`
- **Règles prompt** :
  - Labels génériques interdits ("Épanouissement personnel", etc.)
  - Labels construits depuis des éléments précis du texte (ex: "Delta salarial 13k€")
  - Scores A et B doivent être différenciés (interdit : 5 vs 5)

### Appel 3 — Analyse finale
- **Modèle** : Gemini 3.1 Flash Lite → fallback Claude 3.5 Haiku
- **Entrée** : tout le contexte + scores pondérés finaux
- **Sortie** : objet `Analysis` complet
- **Règles prompt** :
  - Citer des éléments spécifiques du texte dans chaque section
  - % de regret entre 15 et 85 uniquement (jamais 0 ni 100)
  - Scénario de regret : "Dans 1 an, si [scénario précis]..."
  - Blindspot : quelque chose que la personne n'a PAS mentionné
  - Ton direct, non complaisant

---

## Logique de calcul des scores (locale, sans IA)

```
score (0-100) = Σ(note × poids) / totalPoids × 10
```

Niveaux de recommandation :
- Écart < 5 → `serré` (orange) — "Décision serrée — les deux options se valent"
- Écart < 15 → `léger` (bleu) — "Légère préférence pour [winner]"
- Écart ≥ 15 → `clair` (vert) — "Recommandation claire : [winner]"

Cohérence instinct/logique (calculée depuis la réponse à Q4) :
- Instinct = winner → "Ta logique et ton instinct pointent dans le même sens"
- Instinct ≠ winner → "Attention : ton instinct penche vers X mais tes scores favorisent Y"
- Instinct absent ou "Les deux pareil" → "Ton instinct n'a pas de préférence claire"

---

## Gestion des erreurs IA

1. Gemini appelé en premier
2. Si erreur 429 (rate limit) → retry avec délai extrait du message d'erreur (ou 5s par défaut), jusqu'à 2 tentatives
3. Toute autre erreur → fallback automatique sur Claude 3.5 Haiku
4. Badge IA dans l'UI reflète le provider effectivement utilisé à chaque étape

---

## Parsing JSON robuste

Le service parse les réponses LLM avec une logique anti-corruption :
1. Supprime le BOM éventuel
2. Extrait le contenu depuis un bloc markdown ` ```json ``` ` si présent
3. Trouve le `{` de départ
4. Parcourt le JSON avec bracket matching (gère les `}` dans les chaînes) pour trouver la fermeture correcte
5. Parse le JSON extrait

---

## Transport réseau

- **Web** : proxy via route API Expo `POST /api/llm` (évite CORS)
- **Native (iOS/Android)** : appels directs aux APIs Gemini et Anthropic
- Timeout : 30 secondes par appel

---

## Design system

- **Thème** : clair (light mode)
- **Fond** : `#F4F4F6` (gris clair), surfaces en `#FFFFFF`
- **Texte** : `#272727` (primary), `#7E7E7E` (secondary), `#A1A1A1` (muted)
- **Couleur primaire** : `#FF634A` (orange)
- **Succès** : `#10B981` (vert), **Warning** : `#F59E0B` (ambre), **Danger** : `#EF4444` (rouge)
- **Typographie** : 7 tailles (11→36px), 5 graisses (400→900)
- **Espacement** : 7 valeurs (4→64px), **Bordures** : 5 niveaux (8→9999px)

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | React Native 0.81.5 + Expo 54 |
| Routing | Expo Router 6 (file-based, stack navigation) |
| State management | Zustand 4.5 (en mémoire, pas de persistence) |
| HTTP | Axios (timeout 30s) |
| Icônes | Lucide React Native |
| Typage | TypeScript 5.9 |
| IA primaire | Gemini 3.1 Flash Lite (`gemini-3.1-flash-lite-preview`) |
| IA fallback | Claude 3.5 Haiku (`claude-3-5-haiku-20241022`) |
| Plateformes | iOS · Android · Web |
| Build/Deploy | Expo EAS (natif) + Metro (web) |

---

## Structure des fichiers source

```
app/
  _layout.tsx          → Stack navigator (3 écrans, animation slide_from_right / fade pour result)
  index.tsx            → Écran Accueil
  dilemma/index.tsx    → Écran Questions
  result/index.tsx     → Écran Résultats
  api/llm+api.ts       → Route API web (proxy Gemini/Anthropic)

services/
  llmService.ts        → callAppel1, callAppel2, callAppel3 + logique fallback + parseResponse

store/
  decisionStore.ts     → Zustand store, types, algorithmes de score

components/
  AiBadge.tsx          → Badge provider IA (Gemini violet / Claude orange)

constants/
  theme.ts             → Colors, Typography, Spacing, BorderRadius, Shadows
```
