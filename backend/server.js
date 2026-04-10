require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = 'gemini-2.5-flash-preview-04-17';

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'PickOne API' });
});

// ─── POST /api/llm ─────────────────────────────────────────────────────────────

app.post('/api/llm', async (req, res) => {
  try {
    const { systemPrompt, userMessage } = req.body;
    if (!systemPrompt || !userMessage) {
      return res.status(400).json({ error: 'systemPrompt et userMessage requis' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY non configurée' });
    }

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
      console.error('[llm] Gemini error:', JSON.stringify(errData));
      return res.status(geminiRes.status).json(errData);
    }

    const data = await geminiRes.json();
    const text = data.candidates[0].content.parts[0].text;
    return res.json({ text, provider: 'gemini' });

  } catch (err) {
    console.error('[llm] Error:', err);
    return res.status(500).json({ error: err.message ?? 'Erreur interne' });
  }
});

// ─── POST /api/feedback ────────────────────────────────────────────────────────

app.post('/api/feedback', async (req, res) => {
  try {
    const { type, message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return res.status(400).json({ error: 'Message trop court' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.FEEDBACK_EMAIL;

    if (!apiKey || !toEmail) {
      return res.status(500).json({ error: 'Configuration mail manquante' });
    }

    const label =
      type === 'bug' ? '🐛 Bug' :
      type === 'suggestion' ? '💡 Suggestion' :
      '💬 Autre';

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
            <p style="background:#F7F6F3;padding:16px;border-radius:8px;white-space:pre-wrap">${message.trim()}</p>
            <p style="color:#A1A1A1;font-size:12px">Envoyé depuis PickOne bêta — ${new Date().toLocaleString('fr-FR')}</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json().catch(() => ({}));
      console.error('[feedback] Resend error:', JSON.stringify(err));
      return res.status(500).json({ error: err });
    }

    return res.json({ ok: true });

  } catch (err) {
    console.error('[feedback] Error:', err);
    return res.status(500).json({ error: err.message ?? 'Erreur inconnue' });
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`PickOne API running on port ${PORT}`);
});
