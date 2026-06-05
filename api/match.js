export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { vacancy, candidates, message, history } = req.body || {};
  if (!vacancy && !message) return res.status(400).json({ error: 'vacancy or message required' });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'API key not configured' });

  // Build candidate summary for context
  const candSummary = (candidates || []).map(c =>
    `- ${c.name} | ${c.role} | ${c.city || '—'} | Beschikbaar: ${c.availability || '—'} | Skills: ${(c.skills || []).join(', ') || '—'} | Bureau: ${c.bureau || '—'} | Status: ${c.status || '—'}`
  ).join('\n');

  const systemPrompt = `Je bent een recruitment assistent bij Harvest Talent, een Nederlands tech-recruitment bureau. Je helpt bij het matchen van kandidaten aan vacatures.

Beschikbare kandidaten in de pipeline (${(candidates||[]).length} totaal):
${candSummary || 'Geen kandidaten beschikbaar.'}

Regels:
- Doe concrete aanbevelingen op basis van de kandidatenlijst
- Rangschik van beste naar minste match
- Geef per kandidaat een korte onderbouwing (1-2 zinnen)
- Wees eerlijk als er geen goede match is
- Antwoord altijd in het Nederlands
- Houd antwoorden beknopt en praktisch`;

  // Build messages
  const messages = [];
  if (history && history.length > 0) {
    messages.push(...history);
  }
  if (message) {
    messages.push({ role: 'user', content: message });
  } else {
    messages.push({ role: 'user', content: `Analyseer deze vacature en geef een top aanbeveling van passende kandidaten uit onze pipeline:\n\n${vacancy}` });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Claude API error: ' + err });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || '';
    return res.status(200).json({ reply, usage: data.usage });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
