const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { target, systemPrompt, userMessage } = body;

    // ── Gemini ────────────────────────────────────────────────────────────────
    if (target === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: 2000 },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return new Response(JSON.stringify(errData), {
          status: res.status,
          headers: { 'content-type': 'application/json' },
        });
      }

      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      return Response.json({ text });
    }

    // ── Anthropic ─────────────────────────────────────────────────────────────
    if (target === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return new Response(JSON.stringify(errData), {
          status: res.status,
          headers: { 'content-type': 'application/json' },
        });
      }

      const data = await res.json();
      const text = data.content[0].text;
      return Response.json({ text });
    }

    return Response.json({ error: 'Unknown target' }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}
