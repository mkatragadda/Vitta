/**
 * API Route: Embeddings
 * Proxies OpenAI embeddings to keep API key server-side
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { input, model } = req.body;

    // Validate required fields
    if (!input) {
      return res.status(400).json({ error: 'Input text is required' });
    }

    // Get API key from environment (server-side only, no NEXT_PUBLIC_)
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('[API] OpenAI API key not configured');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log('[API] Processing embedding request');

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'text-embedding-ada-002',
          input
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
      console.log('[API] Embedding generation successful');

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
    console.error('[API] Error processing embedding:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
