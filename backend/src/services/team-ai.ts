import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { OPENAI_MODEL } from './ai.js';

// Lazy initialization for OpenRouter client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    // Support both OPENROUTER_API_KEY and OPENAI_API_KEY for backwards compatibility
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY (or OPENAI_API_KEY) environment variable is required for AI features');
    }
    // Use OpenRouter's API - compatible with OpenAI SDK
    openai = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.FRONTEND_URL!,
        'X-Title': 'WordSage',
      },
    });
  }
  return openai;
}

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
  position?: { start: number; end: number };
}

/**
 * Fetch team style guide from database
 */
export async function getTeamStyleGuide(
  teamId: string,
  prisma: PrismaClient
): Promise<TeamStyleGuide | null> {
  try {
    const data = await prisma.team_style_guides.findFirst({
      where: { team_id: teamId },
    });

    if (!data) {
      console.log(`⚠️ No style guide found for team ${teamId}`);
      return null;
    }

    return data as unknown as TeamStyleGuide;
  } catch (error) {
    console.error('Error fetching style guide:', error);
    return null;
  }
}

/**
 * Check text for style violations based on team rules
 */
export function checkStyleViolations(
  text: string,
  styleGuide: TeamStyleGuide
): StyleViolation[] {
  const violations: StyleViolation[] = [];
  const lowerText = text.toLowerCase();

  // Convert JSON fields to arrays
  const forbiddenTerms = Array.isArray(styleGuide.forbidden_terms) ? styleGuide.forbidden_terms : [];
  const approvedTerms = Array.isArray(styleGuide.approved_terms) ? styleGuide.approved_terms : [];

  // Check for forbidden terms
  forbiddenTerms.forEach((term: any) => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = text.match(regex);

    if (matches) {
      violations.push({
        type: 'forbidden_term',
        severity: 'error',
        message: `Forbidden term detected: "${term}". Your team's style guide prohibits this word.`,
        suggestion: styleGuide.approved_terms.length > 0
          ? `Consider using: ${styleGuide.approved_terms.slice(0, 3).join(', ')}`
          : undefined,
      });
    }
  });

  // Check for missing approved terms (suggest alternatives)
  const hasApprovedTerms = approvedTerms.some((term: any) =>
    lowerText.includes(term.toLowerCase())
  );

  if (!hasApprovedTerms && approvedTerms.length > 0) {
    violations.push({
      type: 'missing_approved_term',
      severity: 'suggestion',
      message: `Consider using team-approved terminology: ${approvedTerms.slice(0, 5).join(', ')}`,
    });
  }

  // Check tone consistency
  const toneKeywords: Record<string, string[]> = {
    formal: ['utilize', 'facilitate', 'leverage', 'endeavor'],
    friendly: ['help', 'easy', 'simple', 'great'],
    confident: ['will', 'proven', 'guaranteed', 'definitely'],
    empathetic: ['understand', 'feel', 'appreciate', 'care'],
  };

  const currentToneWords = styleGuide.tone ? (toneKeywords[styleGuide.tone] || []) : [];
  const hasToneWords = currentToneWords.some((word: any) => lowerText.includes(word));

  if (!hasToneWords && text.split(' ').length > 20) {
    violations.push({
      type: 'tone_mismatch',
      severity: 'warning',
      message: `Team tone is set to "${styleGuide.tone || 'neutral'}". Consider adjusting your language to match.`,
    });
  }

  return violations;
}

/**
 * Build enhanced AI prompt with team style guide context
 */
export function buildTeamAwarePrompt(
  action: string,
  text: string,
  styleGuide: TeamStyleGuide,
  mode: string = 'general',
  tone?: string,
  customPrompt?: string
): string {
  const basePrompts: Record<string, string> = {
    fix_grammar: 'Fix grammar and spelling errors in the following text.',
    improve: 'Improve the clarity and readability of the following text.',
    rewrite: 'Rewrite the following text to be more engaging.',
    summarize: 'Summarize the following text concisely.',
    expand: 'Expand on the following text with more details.',
    custom: customPrompt || 'Process the following text.',
  };

  const basePrompt = basePrompts[action] || basePrompts.improve;

  // Build team-specific constraints
  const constraints = [];

  const approvedTerms = Array.isArray(styleGuide.approved_terms) ? styleGuide.approved_terms : [];
  const forbiddenTerms = Array.isArray(styleGuide.forbidden_terms) ? styleGuide.forbidden_terms : [];

  // Brand voice
  if (styleGuide.brand_voice) {
    constraints.push(`**Brand Voice**: ${styleGuide.brand_voice} (${getBrandVoiceDescription(styleGuide.brand_voice)})`);
  }

  // Tone
  if (styleGuide.tone) {
    constraints.push(`**Tone**: ${styleGuide.tone} (${getToneDescription(styleGuide.tone)})`);
  }

  // Approved terms
  if (approvedTerms.length > 0) {
    constraints.push(`**MUST USE these terms**: ${approvedTerms.join(', ')}`);
  }

  // Forbidden terms
  if (forbiddenTerms.length > 0) {
    constraints.push(`**NEVER USE these terms**: ${forbiddenTerms.join(', ')}`);
  }

  // Custom rules
  const customRules = styleGuide.custom_rules || {};
  if (customRules.writing_style) {
    constraints.push(`**Writing Style**: ${customRules.writing_style}`);
  }

  if (customRules.sentence_length) {
    constraints.push(`**Sentence Length**: ${customRules.sentence_length}`);
  }

  if (customRules.formatting_preferences) {
    constraints.push(`**Formatting**: ${customRules.formatting_preferences}`);
  }

  if (customRules.target_audience) {
    constraints.push(`**Target Audience**: ${customRules.target_audience}`);
  }

  // Industry jargon
  if (customRules.industry_jargon && customRules.industry_jargon.length > 0) {
    constraints.push(`**Industry Terms (allowed)**: ${customRules.industry_jargon.join(', ')}`);
  }

  // Build final prompt
  const enhancedPrompt = `
${basePrompt}

**TEAM STYLE GUIDE REQUIREMENTS** (CRITICAL - MUST FOLLOW):
${constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}

**IMPORTANT RULES**:
- Follow the team's brand voice and tone exactly
- Use ONLY approved terms when applicable
- AVOID all forbidden terms completely
- Match the writing style requirements
- Keep the target audience in mind

**Original Text**:
${text}

**Your Task**: 
${basePrompt} Make sure to strictly follow ALL team style guide requirements listed above. The output MUST reflect the team's brand voice, tone, and terminology standards.
`.trim();

  return enhancedPrompt;
}

/**
 * Process AI request with team style guide enforcement
 */
export async function processTeamAwareAI(
  action: string,
  text: string,
  teamId: string,
  userId: string,
  prisma: PrismaClient,
  mode: string = 'general',
  tone?: string,
  customPrompt?: string
): Promise<{
  result: string;
  violations: StyleViolation[];
  styleGuideApplied: boolean;
  mode: string;
}> {
  console.log(`🎨 Processing with team style guide: ${teamId}`);

  // Fetch team style guide
  const styleGuide = await getTeamStyleGuide(teamId, prisma);

  if (!styleGuide) {
    console.log('⚠️ No style guide found, using regular AI');
    // Fall back to regular AI processing
    const { processAIRequest } = await import('./ai.js');
    const result = await processAIRequest(action, text, tone, mode, customPrompt);
    return {
      ...result,
      violations: [],
      styleGuideApplied: false,
      mode: mode || 'general',
    };
  }

  // Check for violations in original text
  const violations = checkStyleViolations(text, styleGuide);
  console.log(`📋 Found ${violations.length} style violations`);

  // Build team-aware prompt
  const enhancedPrompt = buildTeamAwarePrompt(action, text, styleGuide, mode, tone, customPrompt);

  console.log('🤖 Calling AI with team-enhanced prompt...');

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a professional writing assistant that STRICTLY follows team style guides. 
          Your output must match the exact brand voice, tone, and terminology requirements provided.
          Never use forbidden terms. Always prioritize approved terms when relevant.`,
        },
        {
          role: 'user',
          content: enhancedPrompt,
        },
      ],
      model: OPENAI_MODEL,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const result = completion.choices[0]?.message?.content || text;

    // Check if result still has violations
    const resultViolations = checkStyleViolations(result, styleGuide);

    console.log('✅ Team-aware AI processing complete');

    return {
      result,
      violations: resultViolations,
      styleGuideApplied: true,
      mode,
    };

  } catch (error: any) {
    console.error('❌ Team AI error:', error);
    throw new Error(`AI processing failed: ${error.message}`);
  }
}

/**
 * Helper: Get brand voice description
 */
function getBrandVoiceDescription(voice: string): string {
  const descriptions: Record<string, string> = {
    professional: 'Formal, authoritative, corporate-friendly',
    casual: 'Friendly, conversational, approachable',
    technical: 'Precise, detailed, industry-specific',
    creative: 'Expressive, imaginative, storytelling',
    persuasive: 'Compelling, action-oriented, sales-focused',
    educational: 'Informative, clear, instructional',
  };
  return descriptions[voice] || 'professional';
}

/**
 * Helper: Get tone description
 */
function getToneDescription(tone: string): string {
  const descriptions: Record<string, string> = {
    formal: 'Respectful, proper, business-like',
    friendly: 'Warm, welcoming, personable',
    confident: 'Assertive, strong, decisive',
    empathetic: 'Understanding, caring, supportive',
    enthusiastic: 'Energetic, excited, passionate',
    neutral: 'Balanced, objective, impartial',
  };
  return descriptions[tone] || 'neutral';
}

/**
 * Get content suggestions from team library
 */
export async function getTeamContentSuggestions(
  query: string,
  teamId: string,
  prisma: PrismaClient,
  limit: number = 5
): Promise<any[]> {
  try {
    const data = await prisma.team_content_library.findMany({
      where: {
        team_id: teamId,
        approved: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { usage_count: 'desc' },
      take: limit,
    });

    return data || [];
  } catch (error) {
    console.error('Error in getTeamContentSuggestions:', error);
    return [];
  }
}
