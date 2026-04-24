require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require('jose');
const rateLimit = require('express-rate-limit');

// ─── Startup validation ────────────────────────────────────────────────────────

const REQUIRED_ENV = ['GEMINI_API_KEY', 'RESEND_API_KEY', 'FEEDBACK_EMAIL', 'SUPABASE_URL'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[startup] Variables d'environnement manquantes : ${missing.join(', ')}`);
  process.exit(1);
}

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

const app = express();
app.use(cors());
app.use(express.json());

// ─── Security headers ──────────────────────────────────────────────────────────

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

// ─── Auth middleware ──────────────────────────────────────────────────────────

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// ─── Rate limiters ─────────────────────────────────────────────────────────────

const llmLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.userId ?? req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite atteinte, réessaie dans une heure.' },
});

// 5 feedbacks par heure par IP
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de retours envoyés, réessaie dans une heure.' },
});

// ─── HTML escaping ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'PickOne API' });
});

// ─── Politique de confidentialité ─────────────────────────────────────────────

app.get('/privacy', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Politique de confidentialité — PickOne</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 0 auto; padding: 24px 16px; color: #1a1a1a; line-height: 1.6; }
    h1 { color: #E8532A; }
    h2 { margin-top: 32px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { text-align: left; padding: 8px 12px; border: 1px solid #ddd; }
    th { background: #f7f6f3; }
    a { color: #E8532A; }
    .updated { color: #888; font-size: 14px; }
  </style>
</head>
<body>

<h1>Politique de confidentialité</h1>
<p class="updated">Dernière mise à jour : ${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

<h2>1. Qui sommes-nous ?</h2>
<p>PickOne est une application mobile développée par <strong>Louis Frerejean</strong>, développeur indépendant. Elle aide les utilisateurs à prendre des décisions grâce à une analyse assistée par intelligence artificielle.</p>
<p>Contact : <a href="mailto:l.frerejean05@gmail.com">l.frerejean05@gmail.com</a></p>

<h2>2. Données collectées</h2>
<table>
  <tr><th>Catégorie</th><th>Données</th><th>Obligatoire</th></tr>
  <tr><td>Compte</td><td>Adresse email, mot de passe (chiffré)</td><td>Oui</td></tr>
  <tr><td>Profil</td><td>Âge, situation professionnelle, situation personnelle, valeurs, rapport au risque, contexte libre, préférences de ton (franchise, familiarité)</td><td>Non</td></tr>
  <tr><td>Décisions</td><td>Texte du dilemme, réponses aux questions, analyse IA (recommandation, biais cognitifs détectés, scores de regret), critères et pondérations</td><td>Oui (fonctionnalité principale)</td></tr>
  <tr><td>Statistiques</td><td>Nombre total de décisions analysées</td><td>Automatique</td></tr>
  <tr><td>Feedback</td><td>Message de retour utilisateur (non stocké, envoyé par email au développeur)</td><td>Non</td></tr>
  <tr><td>Audio</td><td>Microphone utilisé optionnellement pour la saisie vocale — traitement local, non transmis</td><td>Non</td></tr>
</table>

<h2>3. Finalité du traitement</h2>
<table>
  <tr><th>Finalité</th><th>Base légale</th></tr>
  <tr><td>Authentification et gestion du compte</td><td>Exécution du contrat (CGU)</td></tr>
  <tr><td>Personnalisation des analyses IA selon le profil</td><td>Consentement (données saisies volontairement)</td></tr>
  <tr><td>Analyse des décisions via intelligence artificielle</td><td>Exécution du contrat</td></tr>
  <tr><td>Historique des décisions</td><td>Intérêt légitime (fonctionnalité)</td></tr>
  <tr><td>Amélioration du service (feedback)</td><td>Intérêt légitime</td></tr>
</table>

<h2>4. Partage avec des tiers</h2>
<p>Certaines données sont transmises à des prestataires techniques pour faire fonctionner l'application :</p>
<table>
  <tr><th>Prestataire</th><th>Rôle</th><th>Données transmises</th><th>Localisation</th></tr>
  <tr><td><strong>Supabase</strong></td><td>Base de données et authentification</td><td>Toutes les données du compte et des décisions</td><td>Union Européenne</td></tr>
  <tr><td><strong>Google Gemini</strong></td><td>Analyse IA des décisions</td><td>Texte du dilemme, réponses, profil (anonymisé)</td><td>États-Unis</td></tr>
  <tr><td><strong>Render.com</strong></td><td>Hébergement du serveur</td><td>Données transitent via le serveur</td><td>États-Unis</td></tr>
  <tr><td><strong>Resend</strong></td><td>Envoi d'emails (feedback uniquement)</td><td>Contenu du message de feedback</td><td>États-Unis</td></tr>
</table>
<p>Les transferts hors UE (Google, Render, Resend) sont encadrés par les clauses contractuelles types de la Commission Européenne.</p>
<p>Aucune donnée n'est vendue ou partagée à des fins publicitaires.</p>

<h2>5. Conservation des données</h2>
<ul>
  <li><strong>Données de compte et décisions :</strong> conservées jusqu'à suppression du compte par l'utilisateur, ou après 3 ans d'inactivité.</li>
  <li><strong>Feedback :</strong> non stocké dans la base de données, reçu uniquement par email.</li>
  <li><strong>Audio :</strong> traitement local uniquement, aucune conservation.</li>
</ul>

<h2>6. Vos droits (RGPD)</h2>
<p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
<ul>
  <li><strong>Accès :</strong> obtenir une copie de vos données personnelles.</li>
  <li><strong>Rectification :</strong> corriger vos données via l'écran Profil de l'application.</li>
  <li><strong>Suppression :</strong> supprimer votre historique de décisions depuis l'application, ou demander la suppression complète de votre compte.</li>
  <li><strong>Portabilité :</strong> recevoir vos données dans un format structuré.</li>
  <li><strong>Opposition :</strong> vous opposer à certains traitements basés sur l'intérêt légitime.</li>
</ul>
<p>Pour exercer ces droits : <a href="mailto:l.frerejean05@gmail.com">l.frerejean05@gmail.com</a></p>
<p>Vous pouvez également introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank">CNIL</a>.</p>

<h2>7. Sécurité</h2>
<p>Les mesures techniques mises en place incluent :</p>
<ul>
  <li>Chiffrement des communications (HTTPS/TLS)</li>
  <li>Authentification par token JWT signé</li>
  <li>Mots de passe non stockés en clair (gestion par Supabase Auth)</li>
  <li>Accès aux données limité par utilisateur (Row Level Security Supabase)</li>
  <li>Limitation du nombre de requêtes API (rate limiting)</li>
</ul>

<h2>8. Mineurs</h2>
<p>PickOne n'est pas destiné aux personnes de moins de 16 ans. Aucune donnée de mineur n'est sciemment collectée.</p>

<h2>9. Modifications</h2>
<p>Cette politique peut être mise à jour. La date de dernière modification est indiquée en haut de cette page. En cas de changement majeur, les utilisateurs en seront informés dans l'application.</p>

<h2>10. Contact</h2>
<p>Pour toute question relative à cette politique ou à vos données personnelles :<br>
<a href="mailto:l.frerejean05@gmail.com">l.frerejean05@gmail.com</a></p>

</body>
</html>`);
});

// ─── POST /api/llm ─────────────────────────────────────────────────────────────

app.post('/api/llm', requireAuth, llmLimiter, async (req, res) => {
  try {
    const { systemPrompt, userMessage } = req.body;
    if (!systemPrompt || !userMessage) {
      return res.status(400).json({ error: 'systemPrompt et userMessage requis' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 2000 },
      }),
    });

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      console.error('[llm] Gemini error:', geminiRes.status);
      return res.status(geminiRes.status).json(errData);
    }

    const data = await geminiRes.json();
    const text = data.candidates[0].content.parts[0].text;
    return res.json({ text, provider: 'gemini' });

  } catch (err) {
    console.error('[llm] Error:', err.message);
    return res.status(500).json({ error: 'Erreur interne' });
  }
});

// ─── POST /api/feedback ────────────────────────────────────────────────────────

app.post('/api/feedback', feedbackLimiter, async (req, res) => {
  try {
    const { type, message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message invalide' });
    }
    const trimmed = message.trim();
    if (trimmed.length < 5) {
      return res.status(400).json({ error: 'Message trop court' });
    }
    if (trimmed.length > 5000) {
      return res.status(400).json({ error: 'Message trop long (5000 caractères max)' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.FEEDBACK_EMAIL;

    const label =
      type === 'bug' ? '🐛 Bug' :
      type === 'suggestion' ? '💡 Suggestion' :
      '💬 Autre';

    const safeMessage = escapeHtml(trimmed);

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PickOne Feedback <onboarding@resend.dev>',
        to: toEmail,
        subject: `[PickOne] ${label} reçu`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#E8532A">${label}</h2>
            <p style="background:#F7F6F3;padding:16px;border-radius:8px;white-space:pre-wrap">${safeMessage}</p>
            <p style="color:#A1A1A1;font-size:12px">Envoyé depuis PickOne bêta — ${new Date().toLocaleString('fr-FR')}</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      console.error('[feedback] Resend error:', emailRes.status);
      return res.status(500).json({ error: 'Échec de l\'envoi' });
    }

    return res.json({ ok: true });

  } catch (err) {
    console.error('[feedback] Error:', err.message);
    return res.status(500).json({ error: 'Erreur interne' });
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`PickOne API running on port ${PORT}`);
});
