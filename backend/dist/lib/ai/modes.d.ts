export interface IndustryMode {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    systemPrompt: string;
    keywords: string[];
    tone: string;
    examples: string[];
}
export declare const INDUSTRY_MODES: Record<string, IndustryMode>;
export declare function getModeById(modeId: string): IndustryMode;
export declare function getAllModes(): IndustryMode[];
export declare function enhancePromptWithMode(action: string, text: string, mode: string, customTone?: string): string;
//# sourceMappingURL=modes.d.ts.map