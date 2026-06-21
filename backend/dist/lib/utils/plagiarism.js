import OpenAI from 'openai';
let openaiClient = null;
function getClient() {
    if (!openaiClient) {
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENROUTER_API_KEY is required for plagiarism analysis');
        }
        openaiClient = new OpenAI({
            apiKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': process.env.FRONTEND_URL || 'https://wordsage.app',
                'X-Title': 'WordSage',
            },
        });
    }
    return openaiClient;
}
const PLAGIARISM_SYSTEM_PROMPT = `You are an expert content originality analyst. Your task is to perform a comprehensive originality analysis of the provided text.

ANALYSIS CRITERIA:
1. **Common phrases and boilerplate**: Identify phrases, sentences, or passages that are generic, overused, or commonly found in public domain content
2. **Formulaic structures**: Detect text patterns commonly used without attribution (e.g., legal boilerplate, academic clichés, Wikipedia-style descriptions)
3. **Non-original content indicators**: Flag text that reads as if it was copied from well-known sources, encyclopaedias, marketing templates, or public-domain content
4. **Unique, original content**: Identify sections that demonstrate original thought, unique voice, or distinctive expression

OUTPUT FORMAT — return ONLY valid JSON (no markdown, no code fences):
{
  "similarity": <number 0-100, overall similarity risk percentage>,
  "originalityScore": <number 0-100, higher = more original>,
  "isPlagiarized": <boolean, true if similarity > 25>,
  "analysis": "<2-3 sentence overall assessment>",
  "flaggedSegments": ["<sentence or phrase 1>", "<sentence or phrase 2>", ...],
  "sources": [
    {
      "url": "<likely source URL or type, e.g. 'https://en.wikipedia.org/wiki/[topic]' or 'Common legal template'>",
      "title": "<descriptive title of likely source>",
      "similarity": <number 0-100>,
      "matchedText": "<the flagged excerpt from the input text>",
      "context": "<why this was flagged>"
    }
  ],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...]
}

RULES:
- Be conservative and accurate. Do not flag clearly original text
- Focus on factual similarity patterns, not style
- Flagged segments must be EXACT substrings from the input text
- Provide 2-5 sources maximum (only when genuinely flagged)
- Recommendations should be specific and actionable`;
export async function checkPlagiarism(text) {
    if (!text || text.trim().length < 30) {
        return {
            similarity: 0,
            sources: [],
            isPlagiarized: false,
            analysis: 'Text is too short for meaningful originality analysis.',
            flaggedSegments: [],
            originalityScore: 100,
            recommendations: ['Provide more text for a comprehensive analysis.'],
        };
    }
    const client = getClient();
    // Truncate to ~3000 chars for cost efficiency (covers most use cases)
    const textToAnalyse = text.length > 3000 ? text.substring(0, 3000) + '...' : text;
    try {
        const completion = await client.chat.completions.create({
            model: 'openai/gpt-4o-mini',
            messages: [
                { role: 'system', content: PLAGIARISM_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Analyse the following text for originality:\n\n---\n${textToAnalyse}\n---\n\nReturn ONLY the JSON object.`,
                },
            ],
            temperature: 0.1, // Low temperature for analytical, deterministic output
            max_tokens: 1200,
            response_format: { type: 'json_object' },
        });
        const rawResponse = completion.choices[0]?.message?.content || '{}';
        let parsed;
        try {
            parsed = JSON.parse(rawResponse);
        }
        catch {
            throw new Error('AI returned malformed JSON during plagiarism analysis');
        }
        // Validate and normalise the response
        const result = {
            similarity: clamp(Number(parsed.similarity) || 0, 0, 100),
            originalityScore: clamp(Number(parsed.originalityScore) || 100, 0, 100),
            isPlagiarized: Boolean(parsed.isPlagiarized) || (parsed.similarity > 25),
            analysis: String(parsed.analysis || 'Analysis complete.'),
            flaggedSegments: Array.isArray(parsed.flaggedSegments) ? parsed.flaggedSegments.map(String) : [],
            sources: Array.isArray(parsed.sources)
                ? parsed.sources.slice(0, 5).map((s) => ({
                    url: String(s.url || '#'),
                    title: String(s.title || 'Unknown source'),
                    similarity: clamp(Number(s.similarity) || 0, 0, 100),
                    matchedText: String(s.matchedText || ''),
                    context: String(s.context || ''),
                }))
                : [],
            recommendations: Array.isArray(parsed.recommendations)
                ? parsed.recommendations.map(String)
                : ['Review flagged segments and rephrase in your own words.'],
        };
        return result;
    }
    catch (error) {
        console.error('Plagiarism analysis error:', error);
        // Propagate a clean error — do not silently return fake data
        if (error.status === 401 || error.status === 403) {
            throw new Error('AI service authentication failed. Check OPENROUTER_API_KEY.');
        }
        throw new Error(`Plagiarism analysis failed: ${error.message}`);
    }
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
//# sourceMappingURL=plagiarism.js.map