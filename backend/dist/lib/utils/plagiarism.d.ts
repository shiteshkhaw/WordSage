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
export declare function checkPlagiarism(text: string): Promise<PlagiarismResult>;
export {};
//# sourceMappingURL=plagiarism.d.ts.map