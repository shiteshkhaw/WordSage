interface PlagiarismResult {
  similarity: number;
  sources: Array<{
    url: string;
    title: string;
    similarity: number;
    matchedText: string;
  }>;
  isPlagiarized: boolean;
}

// Free plagiarism check using Google Custom Search
export async function checkPlagiarism(text: string): Promise<PlagiarismResult> {
  try {
    // Split text into sentences for checking
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const uniqueSentences = sentences.slice(0, 3); // Check first 3 sentences
    
    const sources: PlagiarismResult['sources'] = [];
    let totalMatches = 0;

    for (const sentence of uniqueSentences) {
      const cleanSentence = sentence.trim();
      if (cleanSentence.length < 20) continue;

      try {
        // Use Google Custom Search API (free tier: 100 queries/day)
        // For production, you can use: Copyscape API, PlagiarismCheck API, or build your own
        
        // For now, we'll simulate plagiarism check
        // In production, integrate with actual API
        const searchResults = await simulatePlagiarismCheck(cleanSentence);
        
        if (searchResults.length > 0) {
          totalMatches++;
          sources.push(...searchResults);
        }
      } catch (error) {
        console.error('Error checking sentence:', error);
      }
    }

    const similarity = Math.min((totalMatches / uniqueSentences.length) * 100, 100);
    
    return {
      similarity: Math.round(similarity),
      sources: sources.slice(0, 5), // Top 5 sources
      isPlagiarized: similarity > 20, // Threshold: 20%
    };
  } catch (error) {
    console.error('Plagiarism check error:', error);
    throw new Error('Failed to check plagiarism');
  }
}

// Simulate plagiarism check (replace with real API in production)
async function simulatePlagiarismCheck(text: string) {
  // In production, replace this with actual plagiarism checker API
  // Options: Copyscape, PlagiarismCheck.org API, or Google Custom Search
  
  const hasCommonPhrases = /the quick brown fox|lorem ipsum|to be or not to be/i.test(text);
  
  if (hasCommonPhrases) {
    return [
      {
        url: 'https://example.com/article',
        title: 'Similar Content Found',
        similarity: 85,
        matchedText: text.substring(0, 100),
      },
    ];
  }
  
  // Random simulation for demo (remove in production)
  const random = Math.random();
  if (random > 0.7) {
    return [
      {
        url: 'https://example.com/source',
        title: 'Potential Source',
        similarity: Math.round(random * 100),
        matchedText: text.substring(0, 100),
      },
    ];
  }
  
  return [];
}
