export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, businessData, service = 'gemini' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    let response;

    if (service === 'gemini' && process.env.VITE_GEMINI_API_KEY) {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4000,
            }
          })
        }
      );

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        response = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
      } else {
        throw new Error('Gemini API failed');
      }
    } else {
      response = 'AI service not available';
    }
    
    res.json({ success: true, response });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process AI request',
      details: error.message 
    });
  }
}