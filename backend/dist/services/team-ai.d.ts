import { PrismaClient } from '@prisma/client';
interface TeamStyleGuide {
    id: string;
    team_id: string;
    brand_voice: string | null;
    tone: string | null;
    approved_terms: any;
    forbidden_terms: any;
    custom_rules: any;
}
interface StyleViolation {
    type: 'forbidden_term' | 'missing_approved_term' | 'tone_mismatch' | 'style_issue';
    severity: 'error' | 'warning' | 'suggestion';
    message: string;
    suggestion?: string;
    position?: {
        start: number;
        end: number;
    };
}
/**
 * Fetch team style guide from database
 */
export declare function getTeamStyleGuide(teamId: string, prisma: PrismaClient): Promise<TeamStyleGuide | null>;
/**
 * Check text for style violations based on team rules
 */
export declare function checkStyleViolations(text: string, styleGuide: TeamStyleGuide): StyleViolation[];
/**
 * Build enhanced AI prompt with team style guide context
 */
export declare function buildTeamAwarePrompt(action: string, text: string, styleGuide: TeamStyleGuide, mode?: string, tone?: string, customPrompt?: string): string;
/**
 * Process AI request with team style guide enforcement
 */
export declare function processTeamAwareAI(action: string, text: string, teamId: string, userId: string, prisma: PrismaClient, mode?: string, tone?: string, customPrompt?: string): Promise<{
    result: string;
    violations: StyleViolation[];
    styleGuideApplied: boolean;
    mode: string;
}>;
/**
 * Get content suggestions from team library
 */
export declare function getTeamContentSuggestions(query: string, teamId: string, prisma: PrismaClient, limit?: number): Promise<any[]>;
export {};
//# sourceMappingURL=team-ai.d.ts.map