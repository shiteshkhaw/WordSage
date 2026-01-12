/**
 * Style Guide Prompt Generator
 * 
 * Enterprise-grade prompt builder for AI text processing with style guide enforcement.
 * Generates optimized prompts that ensure AI outputs align with brand guidelines.
 *
 * FIXED VERSION — All TypeScript errors removed
 */

export interface StyleGuide {
  brand_voice: string;
  tone: string;
  approved_terms: string[];
  forbidden_terms: string[];
  custom_rules: {
    writing_style?: string;
    sentence_length?: string;
    paragraph_structure?: string;
    formatting_preferences?: string;
    industry_jargon?: string[];
    target_audience?: string;
    [key: string]: any;
  };
}

export type AIAction =
  | "improve"
  | "grammar"
  | "rewrite"
  | "summarize"
  | "expand"
  | "simplify"
  | "formalize"
  | "casualize";

interface PromptConfig {
  maxLength?: number;
  includeExamples?: boolean;
  strictMode?: boolean;
  preserveFormatting?: boolean;
}

const ACTION_INSTRUCTIONS: Record<AIAction, string> = {
  improve: "Enhance and improve the quality of the following text",
  grammar: "Check and correct all grammar, spelling, and punctuation errors in the following text",
  rewrite: "Completely rewrite the following text while preserving its core meaning",
  summarize: "Create a concise summary of the following text",
  expand: "Expand and elaborate on the following text with additional details and context",
  simplify: "Simplify the following text to make it more accessible and easier to understand",
  formalize: "Rewrite the following text in a more formal, professional style",
  casualize: "Rewrite the following text in a more casual, conversational style",
};

const ACTION_OUTPUT_DESCRIPTIONS: Record<AIAction, string> = {
  improve: "improved version",
  grammar: "grammatically corrected version",
  rewrite: "rewritten version",
  summarize: "concise summary",
  expand: "expanded version",
  simplify: "simplified version",
  formalize: "formalized version",
  casualize: "casualized version",
};

export function buildStyleGuidePrompt(
  action: AIAction,
  text: string,
  styleGuide: StyleGuide,
  config: PromptConfig = {}
): string {
  const {
    maxLength = 4000,
    includeExamples = false,
    strictMode = true,
    preserveFormatting = false,
  } = config;

  if (!text?.trim()) throw new Error("Text cannot be empty");
  if (!styleGuide) throw new Error("Style guide is required");

  let prompt = "";

  prompt += buildSystemRole(action, strictMode);
  prompt += buildActionInstruction(action);
  prompt += buildStyleGuideSection(styleGuide, strictMode);
  prompt += buildConstraints(action, preserveFormatting);

  if (includeExamples) prompt += buildExamples(action, styleGuide);

  prompt += buildTextSection(text, maxLength);
  prompt += buildOutputInstructions(action, strictMode);

  return prompt;
}

function buildSystemRole(action: AIAction, strictMode: boolean): string {
  const roleDescriptions: Record<AIAction, string> = {
    improve: "professional content editor and writing coach",
    grammar: "expert grammar checker and language perfectionist",
    rewrite: "creative writing specialist",
    summarize: "expert summarization specialist",
    expand: "content expansion and elaboration expert",
    simplify: "plain language specialist",
    formalize: "professional business writing expert",
    casualize: "conversational writing specialist",
  };

  let section = `You are a ${roleDescriptions[action]} with deep expertise in brand consistency and style guide compliance.\n\n`;

  if (strictMode) {
    section += `⚠️ STRICT MODE: You must follow ALL style guide rules without exception.\n\n`;
  }

  return section;
}

function buildActionInstruction(action: AIAction): string {
  return `## Task\n${ACTION_INSTRUCTIONS[action]}.\n\n`;
}

function buildStyleGuideSection(styleGuide: StyleGuide, strictMode: boolean): string {
  let section = `## Style Guide (MANDATORY)\n\n`;

  section += `### Brand Voice & Tone\n`;
  section += `- **Brand Voice:** ${capitalizeFirst(styleGuide.brand_voice)}\n`;
  section += `- **Tone:** ${capitalizeFirst(styleGuide.tone)}\n`;
  section += `- **Requirement:** Every sentence must reflect this voice and tone.\n\n`;

  if (styleGuide.approved_terms?.length) {
    section += `### ✅ Preferred Terminology (PRIORITIZE)\n`;
    styleGuide.approved_terms.forEach((term, idx) => {
      section += `${idx + 1}. "${term}" — Use this exact phrasing\n`;
    });
    section += `\n`;
  }

  if (styleGuide.forbidden_terms?.length) {
    section += `### ❌ FORBIDDEN Terms (NEVER USE)\n`;
    styleGuide.forbidden_terms.forEach((term, idx) => {
      section += `${idx + 1}. "${term}" — ${strictMode ? "MUST AVOID" : "Avoid"}\n`;
    });
    section += `\n`;
  }

  if (styleGuide.custom_rules) {
    section += `### Writing Guidelines\n`;

    const rules = styleGuide.custom_rules;

    if (rules.writing_style) section += `- **Writing Style:** ${rules.writing_style}\n`;
    if (rules.sentence_length) section += `- **Sentence Length:** ${rules.sentence_length}\n`;
    if (rules.paragraph_structure) section += `- **Paragraph Structure:** ${rules.paragraph_structure}\n`;
    if (rules.formatting_preferences) section += `- **Formatting:** ${rules.formatting_preferences}\n`;
    if (rules.target_audience) section += `- **Target Audience:** ${rules.target_audience}\n`;

    if (rules.industry_jargon?.length) {
      section += `- **Industry Terms:** ${rules.industry_jargon.join(", ")}\n`;
    }

    Object.keys(rules).forEach((key) => {
      if (
        ![
          "writing_style",
          "sentence_length",
          "paragraph_structure",
          "formatting_preferences",
          "target_audience",
          "industry_jargon",
        ].includes(key)
      ) {
        section += `- **${capitalizeFirst(key.replace(/_/g, " "))}:** ${rules[key]}\n`;
      }
    });

    section += `\n`;
  }

  return section;
}

function buildConstraints(action: AIAction, preserveFormatting: boolean): string {
  let section = `## Constraints\n`;

  if (preserveFormatting) {
    section += `- Preserve original formatting\n`;
  }

  section += `- Do not add commentary\n`;
  section += `- Output only the ${ACTION_OUTPUT_DESCRIPTIONS[action]}\n`;
  section += `- Maintain factual accuracy\n`;

  if (action !== "summarize") {
    section += `- Keep similar length unless action requires otherwise\n`;
  }

  section += `\n`;

  return section;
}

function buildExamples(action: AIAction, styleGuide: StyleGuide): string {
  const exampleOutputs: Record<AIAction, string> = {
    improve: `Output (${styleGuide.brand_voice}, ${styleGuide.tone}): "Our exceptional product has earned outstanding customer satisfaction."`,
    grammar: `Output: "The product is excellent, and customers appreciate it."`,
    rewrite: `Output: "Customer feedback consistently praises the product's quality."`,
    summarize: `Output: "Customers appreciate the product quality."`,
    expand: `Output: "The product has shown exceptional performance. Customers consistently praise its value and effectiveness."`,
    simplify: `Output: "Customers like the product because it works well."`,
    formalize: `Output: "The product demonstrates superior quality, resulting in high customer satisfaction rates."`,
    casualize: `Output: "People really love this product — it’s a hit!"`,
  };

  return `## Example Transformation\nInput: "The product is very good and customers like it."\n${exampleOutputs[action]}\n\n`;
}

function buildTextSection(text: string, maxLength: number): string {
  return `## Original Text\n\`\`\`\n${text.slice(0, maxLength)}\n\`\`\`\n\n`;
}

function buildOutputInstructions(action: AIAction, strictMode: boolean): string {
  let section = `## Output Instructions\n`;
  section += `Return ONLY the ${ACTION_OUTPUT_DESCRIPTIONS[action]}.\n`;

  if (strictMode) {
    section += `❗ Do NOT include explanations or meta-text.\n`;
  }

  section += `\nBegin output now:\n`;

  return section;
}

function capitalizeFirst(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function validateStyleGuide(styleGuide: any): styleGuide is StyleGuide {
  if (!styleGuide || typeof styleGuide !== "object") return false;

  const required = ["brand_voice", "tone"];
  const hasRequired = required.every(
    (field) => field in styleGuide && typeof styleGuide[field] === "string"
  );

  return hasRequired && Array.isArray(styleGuide.approved_terms) && Array.isArray(styleGuide.forbidden_terms);
}

export function buildSimplePrompt(action: AIAction, text: string): string {
  return `${ACTION_INSTRUCTIONS[action]}:\n\n${text}\n\nReturn only the ${ACTION_OUTPUT_DESCRIPTIONS[action]}.`;
}

export function estimateTokenCount(prompt: string): number {
  return Math.ceil(prompt.length / 4);
}

/** FIXED VERSION — fully valid, no regex errors */
export function sanitizeText(text: string): string {
  return text
    .replace(/```/g, "")           // remove backticks
    .replace(/\n{3,}/g, "\n\n")    // normalize spacing
    .trim();
}

export function buildMultiStepPrompt(
  steps: AIAction[],
  text: string,
  styleGuide: StyleGuide
): string[] {
  return steps.map((action) => buildStyleGuidePrompt(action, text, styleGuide));
}

export function buildComparativePrompt(
  action: AIAction,
  text: string,
  styleGuideA: StyleGuide,
  styleGuideB: StyleGuide
) {
  return {
    promptA: buildStyleGuidePrompt(action, text, styleGuideA),
    promptB: buildStyleGuidePrompt(action, text, styleGuideB),
  };
}

export function exportStyleGuideTemplate(styleGuide: StyleGuide): string {
  return JSON.stringify(styleGuide, null, 2);
}

export function importStyleGuideTemplate(template: string): StyleGuide | null {
  try {
    const parsed = JSON.parse(template);
    return validateStyleGuide(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
