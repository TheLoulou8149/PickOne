const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { systemPrompt, userMessage } = body;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
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
    return Response.json({ text, provider: 'gemini' });

  } catch (err: any) {
    return Response.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}
