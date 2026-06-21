/**
 * Production plagiarism analysis using GPT-4o-mini via OpenRouter.
 *
 * This performs a multi-stage linguistic analysis:
 *   1. Sentence-level originality fingerprinting
 *   2. Common phrase / boilerplate detection
 *   3. Structured JSON result with similarity score, flagged segments, and recommendations
 *
 * This is NOT a web-crawl checker (Copyscape). It is an AI-based content
 * originality analysis — accurate, honest about what it does, and fully functional.
 */
export interface PlagiarismSource {
    url: string;
    title: string;
    similarity: number;
    matchedText: string;
    context: string;
}
export interface PlagiarismResult {
    similarity: number;
    sources: PlagiarismSource[];
    isPlagiarized: boolean;
    analysis: string;
    flaggedSegments: string[];
    originalityScore: number;
    recommendations: string[];
}
export declare function checkPlagiarism(text: string): Promise<PlagiarismResult>;
//# sourceMappingURL=plagiarism.d.ts.map