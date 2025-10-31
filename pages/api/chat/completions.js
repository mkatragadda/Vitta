/**
 * API Route: Chat Completions
 * Proxies OpenAI chat completions to keep API key server-side
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model, temperature, max_tokens } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Get API key from environment (server-side only, no NEXT_PUBLIC_)
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('[API] OpenAI API key not configured');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log('[API] Processing chat completion request');

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-4',
          messages,
          temperature: temperature || 0.7,
          max_tokens: max_tokens || 1000
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[API] OpenAI API error:', response.status, errorData);
        return res.status(response.status).json({
          error: `OpenAI API error: ${response.status}`,
          details: errorData
        });
      }

      const data = await response.json();
      console.log('[API] Chat completion successful');

      return res.status(200).json(data);

    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error('[API] Request timeout');
        return res.status(504).json({ error: 'Request timeout' });
      }

      throw fetchError;
    }

  } catch (error) {
    console.error('[API] Error processing chat completion:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
