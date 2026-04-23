# Checklist déploiement Google Play Store — PickOne

## Fait

- [x] **Protection backend JWT** — `backend/server.js` vérifie le token Supabase sur `/api/llm`
- [x] **Rate limiting** — 30 appels LLM/heure/utilisateur (~10 décisions), bloque l'abus
- [x] **Token auth envoyé par l'app** — `services/llmService.ts` envoie le Bearer token Supabase dans chaque requête
- [x] **SUPABASE_JWT_SECRET** ajouté dans les variables d'environnement Render.com

---

## Reste à faire

### Bloquant — sans ça l'app ne peut pas être soumise ou est dangereuse

- [ ] **RLS Supabase** — vérifier dans le dashboard Supabase que Row Level Security est activée sur les 3 tables (`decisions`, `user_context`, `user_stats`) avec une policy `user_id = auth.uid()`
- [ ] **Filtre user_id dans l'historique** — `app/history/index.tsx` ligne 223 : ajouter `.eq('user_id', user.id)` sur le SELECT, sinon un utilisateur peut voir les décisions des autres si le RLS faillit
- [ ] **Release keystore** — `android/app/build.gradle` ligne 115 : le release build utilise la debug keystore. Générer une vraie keystore et configurer `signingConfigs.release` (ou passer par `eas build --platform android --profile production`)
- [ ] **Politique de confidentialité** — URL publique obligatoire pour Google Play. L'app utilise le micro + données personnelles (Supabase). Créer une page web simple et l'enregistrer dans la Play Console.

### Recommandé avant soumission

- [ ] **Permissions Android inutiles** — supprimer de `android/app/src/main/AndroidManifest.xml` : `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `VIBRATE`, `SYSTEM_ALERT_WINDOW`. Google peut rejeter pour permissions non justifiées.
- [ ] **Console.log en production** — `app/result/index.tsx` lignes 616-650 : conditionner avec `if (__DEV__)` pour ne pas exposer la structure de l'app
- [ ] **Modal bêta** — `app/index.tsx` ligne 124 : retirer ou désactiver le bandeau bêta avant la release
- [ ] **Clés dans eas.json** — migrer vers EAS Secrets (`eas secret:create`) plutôt que variables en clair dans `eas.json`

### Assets Play Store à préparer

- [ ] **Icône 512×512 PNG** — fond plein, sans transparence (Play Store l'exige)
- [ ] **Screenshots Android** — minimum 2, format 16:9 ou 9:16
- [ ] **Feature graphic** — 1024×500 px
- [ ] **Description courte** — 80 caractères max
- [ ] **Description longue** — présentation complète de l'app
- [ ] **Catégorie** — à choisir dans la Play Console (ex: Productivité / Style de vie)

### Compte & Play Console

- [ ] **Compte développeur Google Play** — frais uniques 25 $, validation 48h sur [play.google.com/console](https://play.google.com/console)
- [ ] **Créer la fiche app** — remplir titre, descriptions, catégorie, classification IARC
- [ ] **Lier la politique de confidentialité** à la fiche

### Build final

- [ ] **`versionCode`** — incrémenter à chaque soumission (`android/app/build.gradle` ligne 96, actuellement `1`)
- [ ] **Build AAB** — `eas build --platform android --profile production` génère le `.aab` signé pour le Play Store
- [ ] **Test sur Internal Testing** — uploader d'abord sur la track Internal Testing de la Play Console avant production

---

## Architecture de prod (rappel)

```
App mobile (React Native / Expo)
  └── Supabase Auth (JWT)
  └── backend Render.com  ←  GEMINI_API_KEY protégée ici
        └── Gemini API (gemini-3.1-flash-lite-preview)
  └── Supabase DB (decisions, user_context, user_stats)
```

**Coût estimé Gemini :** ~0,001 $ par décision complète (3 appels LLM)
