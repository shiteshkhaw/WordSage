/**
 * Centralized AI Model Configuration - Using OpenRouter
 *
 * OpenRouter provides access to multiple AI models via a single API.
 * Docs: https://openrouter.ai/docs
 */
export declare const OPENAI_MODEL = "openai/gpt-4o-mini";
export declare function processAIRequest(action: string, text: string, tone?: string, mode?: string, customPrompt?: string): Promise<{
    result: string;
    coinsUsed: number;
}>;
export declare function processAdvancedAIRequest(action: string, text: string, options?: {
    citationStyle?: string;
}): Promise<{
    result: any;
    coinsUsed: number;
}>;
export declare function getActionCost(action: string): number;
//# sourceMappingURL=ai.d.ts.map