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
