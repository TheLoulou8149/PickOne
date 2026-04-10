# Stack Technologique — PickOne

## Vue d'ensemble

PickOne est une application cross-platform (Web, iOS, Android) construite avec Expo/React Native, un backend Express.js déployé sur Render, et Supabase comme base de données et système d'authentification.

---

## Langages

| Langage | Utilisation |
|---------|-------------|
| **TypeScript** (~5.9.2) | Langage principal — frontend et backend |
| **JavaScript** | Fichiers de configuration (Babel, Metro) |

---

## Frontend

### Framework & Runtime
- **React** 19.1.0 — bibliothèque UI de base
- **React Native** 0.81.5 — rendu mobile natif (iOS/Android)
- **Expo** ~54.0.0 — plateforme universelle (SDK, build, déploiement)
- **React Native Web** ^0.21.0 — rendu web depuis le même code React Native

### Routing & Navigation
- **Expo Router** ~6.0.23 — routing basé sur le système de fichiers (comme Next.js, mais pour Expo)

### State Management
- **Zustand** ^4.5.2 — store global léger pour la machine d'état des décisions

### HTTP
- **Axios** ^1.7.2 — appels vers le backend et les APIs LLM

### UI & Animations
- **Lucide React Native** ^1.7.0 — icônes
- **React Native Reanimated** ~4.1.1 — animations performantes (thread natif)
- **Moti** ^0.29.0 — animations déclaratives basées sur Reanimated
- **React Native SVG** 15.12.1 — rendu SVG

### Fonctionnalités natives
- **Expo Speech Recognition** ^3.1.2 — reconnaissance vocale (input dilemme par micro)

### Stockage local
- **React Native Async Storage** 2.2.0 — persistance locale sur l'appareil

---

## Backend

### Framework
- **Node.js** + **Express** ^4.19.2 — serveur API REST

### Middlewares
- **CORS** ^2.8.5 — gestion des origines cross-domain
- **Dotenv** ^16.4.5 — chargement des variables d'environnement

### Rôle du backend
Le backend agit comme **proxy sécurisé pour les appels LLM** — il masque les clés API et centralise les appels vers les fournisseurs d'IA.

---

## Base de données & Authentification

### Supabase (PostgreSQL)
- **SDK**: `@supabase/supabase-js` ^2.103.0
- **Base de données**: PostgreSQL hébergé (Supabase Cloud)
  - Table `user_context` — profil et historique des décisions utilisateur
  - Schéma d'authentification intégré
- **Auth**: Supabase Auth — gestion des sessions utilisateur
- **Storage**: Platform-specific (AsyncStorage sur mobile, localStorage sur web)

---

## Intelligence Artificielle / LLM

| Fournisseur | Modèle | Statut |
|------------|--------|--------|
| **Google Gemini** | `gemini-2.5-flash-lite-preview` | Fournisseur principal |
| **Anthropic Claude** | Configurable | Optionnel |
| **OpenAI** | Configurable | Optionnel |

Le fournisseur actif est sélectionné via variable d'environnement `LLM_PROVIDER`.

### Architecture d'analyse en 3 phases
1. **Appel 1** — Reformulation et structuration du dilemme
2. **Appel 2** — Analyse des options avec critères pondérés
3. **Appel 3** — Synthèse, recommandation et profil cognitif

---

## Services Externes

| Service | Usage |
|---------|-------|
| **Supabase** | Base de données PostgreSQL + Auth |
| **Resend** | Envoi d'emails transactionnels (feedbacks, rapports de bugs) |
| **Google Gemini API** | Modèle LLM principal |

---

## Build & Outils

| Outil | Rôle |
|-------|------|
| **Metro** | Bundler React Native |
| **Babel** | Transpilation JS/TS |
| **EAS Build** | Build natif iOS/Android via Expo Application Services |
| **npm** | Gestionnaire de paquets |
| **TypeScript** (strict mode) | Typage statique avec alias `@/*` |

---

## Déploiement

| Cible | Plateforme | Description |
|-------|-----------|-------------|
| **Web** | Vercel | Déploiement automatique de l'app Expo web |
| **Backend** | Render | API Express — `https://pickone-aamp.onrender.com` |
| **iOS / Android** | EAS Build (Expo) | Builds natifs via pipeline EAS |

---

## Architecture résumée

```
┌─────────────────────────────────────────┐
│           CLIENT (Expo / React Native)  │
│   Web (Vercel) · iOS · Android (EAS)    │
│                                         │
│  Expo Router · Zustand · Axios          │
│  Supabase SDK · AsyncStorage            │
└────────────────┬────────────────────────┘
                 │ HTTP
         ┌───────▼──────────┐
         │  Backend Express  │
         │  (Render)         │
         │  Proxy LLM / Email│
         └───────┬──────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼───┐              ┌──────▼──────┐
│Gemini │              │  Resend     │
│ API   │              │  (emails)   │
└───────┘              └─────────────┘

         Supabase (PostgreSQL + Auth)
         ← utilisé directement depuis le client
```

---

## Variables d'environnement clés

| Variable | Description |
|----------|-------------|
| `LLM_PROVIDER` | Fournisseur LLM actif (`gemini` / `anthropic` / `openai`) |
| `GEMINI_API_KEY` | Clé API Google Gemini |
| `RESEND_API_KEY` | Clé API Resend (emails) |
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
