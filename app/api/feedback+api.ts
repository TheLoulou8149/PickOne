export async function POST(request: Request): Promise<Response> {
  try {
    const { type, message } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return Response.json({ error: 'Message trop court' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.FEEDBACK_EMAIL;

    if (!apiKey || !toEmail) {
      return Response.json({ error: 'Configuration mail manquante' }, { status: 500 });
    }

    const label = type === 'bug' ? '🐛 Bug' : type === 'suggestion' ? '💡 Suggestion' : '💬 Autre';

    const res = await fetch('https://api.resend.com/emails', {
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

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[feedback] Resend error:', JSON.stringify(err));
      return Response.json({ error: err }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message ?? 'Erreur inconnue' }, { status: 500 });
  }
}
