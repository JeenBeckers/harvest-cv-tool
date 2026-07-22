export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'API key not configured' });

  const systemPrompt = `Je bent een tekstopmaker. De gebruiker geeft je een vacaturetekst die mogelijk slordig geplakt is vanuit een e-mail, PDF of website. Jouw taak:

1. Maak de tekst op als nette Markdown (koppen met ##, bulletlijsten met -, vetgedrukte termen met **)
2. Behoud alle inhoud — voeg niets toe en laat niets weg
3. Verbeter de leesbaarheid: logische structuur, alinea's, consistente opmaak
4. Antwoord ALLEEN met de opgemaakte Markdown-tekst, geen uitleg of commentaar`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Claude API error: ' + err });
    }

    const data = await response.json();
    const formatted = data.content?.[0]?.text || '';
    return res.status(200).json({ formatted });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
