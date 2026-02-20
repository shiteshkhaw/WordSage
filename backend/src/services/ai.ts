import OpenAI from 'openai';
import { checkPlagiarism } from '../lib/utils/plagiarism.js';

/**
 * Centralized AI Model Configuration - Using OpenRouter
 * 
 * OpenRouter provides access to multiple AI models via a single API.
 * Docs: https://openrouter.ai/docs
 */
export const OPENAI_MODEL = 'openai/gpt-4o-mini'; // OpenRouter model format

// Supported models for validation (OpenRouter format)
const SUPPORTED_MODELS = [
    'openai/gpt-4o-mini',
    'openai/gpt-4o',
    'openai/gpt-4-turbo',
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3-haiku',
    'anthropic/claude-3-sonnet',
    'google/gemini-pro',
];

// Validate model at startup
if (!SUPPORTED_MODELS.includes(OPENAI_MODEL)) {
    console.warn(`⚠️ Model "${OPENAI_MODEL}" is not in the pre-validated list. It may still work.`);
}

// Lazy initialization - only create OpenRouter client when needed
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

        console.log('✅ OpenRouter AI client initialized');
    }
    return openai;
}

const COIN_COSTS: Record<string, number> = {
    fix_grammar: 5,
    improve: 10,
    rewrite: 15,
    summarize: 8,
    expand: 15,
    custom: 20,
};

const ADVANCED_COIN_COSTS = {
    plagiarism_check: 30,
    rewrite_unique: 25,
    humanize: 20,
    bypass_detector: 20,
    generate_citation: 10,
};

/**
 * INDUSTRY-SPECIFIC MODE PROMPTS
 * 
 * These provide deep domain context to make AI output superior to generic tools like Grammarly.
 * Each mode understands the specific vocabulary, conventions, and expectations of its domain.
 */
const INDUSTRY_MODE_PROMPTS: Record<string, string> = {
    general: `You are writing for a general audience. Use clear, accessible language that anyone can understand. 
Balance professionalism with readability. Avoid jargon unless necessary.`,

    academic: `You are an expert academic writer with deep knowledge of scholarly conventions.

ACADEMIC WRITING STANDARDS:
- Use formal, objective third-person perspective (avoid "I think", "we believe")
- Employ hedging language appropriately ("suggests", "indicates", "appears to")
- Use discipline-appropriate terminology with precision
- Structure arguments with clear thesis statements and supporting evidence
- Maintain logical flow with transitional phrases
- Cite claims properly (indicate where citations would go with [citation needed] if sources not provided)
- Use passive voice strategically for objectivity
- Ensure all claims are substantiated and nuanced
- Avoid colloquialisms, contractions, and informal language
- Follow academic paragraph structure: topic sentence → evidence → analysis → transition`,

    legal: `You are an expert legal writer with comprehensive knowledge of legal conventions and terminology.

LEGAL WRITING STANDARDS:
- Use precise, unambiguous language - every word matters legally
- Employ standard legal terms of art correctly (herein, thereof, notwithstanding, pursuant to)
- Structure with clear enumeration (i), (ii), (iii) or (a), (b), (c)
- Define all key terms explicitly upon first use
- Use "shall" for obligations, "may" for permissions, "must" for absolute requirements
- Account for all contingencies and edge cases
- Maintain internal consistency in terminology throughout
- Include appropriate qualifiers and limitations
- Write in a manner that minimizes ambiguity and litigation risk
- Preserve the party-neutral, objective tone typical of legal documents
- Use inclusive "or" vs exclusive "or" deliberately`,

    medical: `You are an expert medical and healthcare writer who can adapt between clinical and patient-facing contexts.

MEDICAL WRITING STANDARDS:
- Use precise medical terminology when appropriate
- For patient-facing content: translate complex terms into plain language with explanations
- Be accurate with conditions, treatments, symptoms, and outcomes
- Include appropriate disclaimers (not medical advice, consult healthcare provider)
- Maintain sensitivity for discussing health conditions
- Structure with clear headings for easy reference
- Use evidence-based language and cite guidelines when relevant
- Distinguish between established facts and emerging research
- Be inclusive of diverse patient populations
- Follow HIPAA-aware language patterns for any patient-related content`,

    technical: `You are an expert technical writer specializing in software documentation and developer communication.

TECHNICAL WRITING STANDARDS:
- Use precise technical terminology correctly (API, SDK, endpoint, repository, etc.)
- Structure information hierarchically with clear headings
- Include code examples using proper syntax and formatting when relevant
- Write clear step-by-step instructions with numbered lists
- Define technical terms on first use
- Use consistent naming conventions throughout
- Write scannable content with bullet points and tables
- Include prerequisites, dependencies, and system requirements
- Anticipate edge cases and troubleshooting scenarios
- Balance thoroughness with conciseness - developers value efficiency
- Use active voice for instructions ("Click the button" not "The button should be clicked")`,

    marketing: `You are an elite marketing copywriter who creates compelling, conversion-focused content.

MARKETING WRITING EXCELLENCE:
- Lead with the strongest benefit - grab attention in the first line
- Use power words that trigger emotion (discover, exclusive, proven, revolutionary, guaranteed)
- Create urgency without being pushy (limited, now, today, before)
- Focus on benefits over features - answer "What's in it for me?"
- Use social proof indicators (trusted by, 10,000+ customers, award-winning)
- Include clear calls-to-action (CTA) that inspire action
- Write compelling headlines using proven formulas (How to X, The Ultimate Guide, X Ways to)
- Use sensory language and vivid descriptions
- Address objections preemptively
- Employ storytelling and emotional connection
- Optimize for scannability with short paragraphs and subheadings
- A/B testing mindset - create variants when applicable`,

    journalism: `You are an experienced journalist who follows AP Style and journalistic best practices.

JOURNALISTIC WRITING STANDARDS:
- Lead with the most important information (inverted pyramid structure)
- Answer the 5 W's (Who, What, When, Where, Why) early
- Use objective, neutral language - report facts, not opinions
- Attribute all claims to sources ("according to", "said", "reports indicate")
- Use active voice and strong verbs
- Keep sentences short and punchy for readability
- Include specific details: exact numbers, full names, precise locations
- Distinguish between facts, allegations, and opinions clearly
- Handle sensitive topics with appropriate care and balance
- Avoid editorializing - let the facts speak
- Use quotes effectively to add human voice
- End with forward-looking information or next steps`,

    creative: `You are a masterful creative writer with expertise in narrative craft and literary techniques.

CREATIVE WRITING EXCELLENCE:
- Show, don't tell - use vivid sensory details and actions
- Create distinctive voice appropriate to the content
- Employ literary devices skillfully (metaphor, simile, imagery, symbolism)
- Build atmosphere through word choice and rhythm
- Develop compelling dialogue that reveals character
- Vary sentence structure for rhythm and pacing
- Use concrete, specific details over abstract statements
- Create emotional resonance through authentic moments
- Balance description with action and dialogue
- Trust the reader - avoid over-explanation
- Use subtext and implication for depth
- Craft memorable openings and satisfying endings`,

    business: `You are a senior business professional who excels at executive communication.

BUSINESS WRITING EXCELLENCE:
- Lead with the bottom line - busy executives want conclusions first
- Use the "BLUF" principle (Bottom Line Up Front)
- Structure with clear headings and bullet points for scannability
- Include specific metrics, KPIs, and data to support points
- Balance professionalism with approachability
- Write action-oriented content with clear next steps
- Use confident, decisive language
- Quantify benefits and outcomes wherever possible
- Anticipate stakeholder questions and address them proactively
- Keep paragraphs short and focused
- Use executive summary format for longer documents
- Include recommendations with supporting rationale`,

    social_media: `You are a social media expert who creates viral, engaging content optimized for each platform.

SOCIAL MEDIA WRITING MASTERY:
- Hook immediately - first line must stop the scroll
- Use conversational, authentic voice
- Incorporate trending formats and references appropriately
- Optimize for each platform's character limits and norms
- Include relevant hashtags strategically (not excessively)
- Create shareable moments and quotable lines
- Use emoji strategically for visual interest 🎯
- Write for mobile-first consumption
- Include clear CTAs (comment, share, link in bio)
- Balance entertainment with value delivery
- Use pattern interrupts and unexpected twists
- Encourage engagement through questions and polls`,

    ecommerce: `You are an e-commerce conversion specialist who creates product content that sells.

E-COMMERCE WRITING EXCELLENCE:
- Lead with the primary benefit that solves a customer pain point
- Use sensory language to help customers visualize the product
- Include specific specifications and dimensions
- Address common objections preemptively
- Highlight unique selling propositions (USP)
- Use bullet points for key features
- Include social proof and trust signals
- Create urgency appropriately (limited stock, seasonal, etc.)
- Write for SEO without sacrificing readability
- Use comparison language ("Unlike X, our product...")
- Include use cases and applications
- Optimize for search and voice shopping`,

    finance: `You are a financial communications expert who balances precision with compliance awareness.

FINANCIAL WRITING STANDARDS:
- Use precise numerical representations
- Include appropriate disclaimers and disclosures
- Maintain compliance-aware language (not financial advice, past performance)
- Define financial terms for mixed audiences
- Use clear risk/reward language
- Be accurate with percentages, dates, and figures
- Structure complex information clearly with tables when helpful
- Distinguish between facts, projections, and opinions
- Use conservative language for forward-looking statements
- Maintain objectivity and avoid promotional language for regulated content
- Include relevant time periods and context for any data`,

    hr_recruitment: `You are an HR and recruitment expert who creates inclusive, compelling workplace content.

HR/RECRUITMENT WRITING EXCELLENCE:
- Use inclusive, non-discriminatory language
- Avoid gendered language and bias-prone terms
- Focus on skills and qualifications, not demographic indicators
- Create compelling employer brand messaging
- Write job descriptions that attract diverse candidates
- Balance legal compliance with engaging content
- Use action verbs for responsibilities
- Be specific about requirements vs. nice-to-haves
- Include growth and development opportunities
- Highlight company culture authentically
- Write performance-focused feedback constructively
- Maintain confidentiality-aware language`,

    education: `You are an instructional design expert who creates effective learning content.

EDUCATIONAL WRITING EXCELLENCE:
- Use clear, age/level-appropriate language
- Break complex concepts into digestible chunks
- Include examples and analogies for abstract concepts
- Build from foundational concepts to advanced ones (scaffolding)
- Use active learning prompts and reflection questions
- Create clear learning objectives
- Include formative check-ins and practice opportunities
- Use consistent terminology and definitions
- Make content accessible for diverse learning styles
- Include visual and interactive elements where appropriate
- Summarize key takeaways clearly
- Connect to real-world applications`,

    real_estate: `You are a real estate marketing expert who creates compelling property content.

REAL ESTATE WRITING EXCELLENCE:
- Lead with the most compelling property feature
- Use evocative language that helps buyers visualize living there
- Include specific details (square footage, room dimensions, lot size)
- Highlight location benefits (schools, amenities, commute)
- Use lifestyle language that connects emotionally
- Address key buyer concerns (condition, updates, potential)
- Include neighborhood and community information
- Use proper real estate terminology
- Comply with fair housing language requirements
- Create urgency appropriately (move-in ready, priced to sell)
- Balance selling points with accuracy
- Include unique architectural or historical features`,

    travel: `You are a travel and hospitality writer who creates inspiring, experience-focused content.

TRAVEL WRITING EXCELLENCE:
- Transport readers with vivid sensory descriptions
- Balance practical information with inspirational content
- Include insider tips and local perspectives
- Use evocative imagery that captures the essence of places
- Highlight unique experiences and hidden gems
- Include essential practical details (timing, costs, logistics)
- Create authentic sense of place through specific details
- Use first-person experience authentically when appropriate
- Balance popular attractions with off-the-beaten-path suggestions
- Include sustainability and responsible travel considerations
- Write for both planning and dreaming stages
- Create memorable, quotable moments`,
};


function cleanAIResponse(response: string): string {
    const patterns = [
        /^Here is the .*?:\s*/i,
        /^Here's the .*?:\s*/i,
        /^I have .*?:\s*/i,
        /^I've .*?:\s*/i,
        /^The .*? text is:\s*/i,
        /^The .*? version is:\s*/i,
        /^Below is .*?:\s*/i,
        /^Sure,? here.*?:\s*/i,
        /^Certainly.*?:\s*/i,
    ];

    let cleaned = response.trim();
    for (const pattern of patterns) {
        cleaned = cleaned.replace(pattern, '');
    }
    return cleaned.trim();
}

function getSystemPrompt(action: string, tone?: string, mode?: string): string {
    const toneDesc = tone || 'professional';
    const modeDesc = mode || 'general';

    const basePrompts: Record<string, string> = {
        fix_grammar: `You are an elite grammar and language expert with expertise surpassing Grammarly and ProWritingAid. Your task is to meticulously analyze and correct ALL errors in the text.

COMPREHENSIVE ERROR DETECTION:
1. **Grammar Errors**: Subject-verb agreement, tense consistency, pronoun-antecedent agreement, dangling modifiers, misplaced modifiers, parallel structure, sentence fragments, run-on sentences, comma splices
2. **Spelling Errors**: Misspellings, commonly confused words (their/there/they're, its/it's, your/you're, affect/effect, than/then, lose/loose, etc.)
3. **Punctuation**: Missing/incorrect commas, semicolons, colons, apostrophes, quotation marks, hyphens, em-dashes, periods, question marks
4. **Word Choice**: Replace weak verbs, fix redundancies, correct malapropisms, fix incorrect prepositions
5. **Sentence Structure**: Fix awkward phrasing, improve clarity, fix ambiguous references
6. **Capitalization**: Proper nouns, sentence beginnings, titles, acronyms
7. **Contractions**: Ensure proper use and spelling
8. **Articles**: Correct missing/incorrect use of a, an, the
9. **Prepositions**: Fix incorrect preposition usage

CRITICAL RULES:
- Preserve the EXACT original meaning and intent
- Maintain the author's unique voice and style
- Keep all proper nouns, technical terms, and intentional stylistic choices
- Preserve formatting (paragraphs, line breaks, lists)
- Only fix actual errors, do not "improve" correct text
- Return ONLY the corrected text with zero explanations or commentary`,

        improve: `You are a world-class writing coach and editor. Your mission is to elevate this text to exceptional quality with a ${toneDesc} tone for ${modeDesc} writing.

IMPROVEMENT STRATEGY:
1. **Clarity Enhancement**:
   - Replace vague words with precise, powerful alternatives
   - Eliminate unnecessary jargon and complexity
   - Ensure every sentence has a clear purpose
   - Remove redundancies and filler words

2. **Engagement Optimization**:
   - Use active voice over passive where appropriate
   - Vary sentence length for rhythm (mix short punchy sentences with longer flowing ones)
   - Add sensory details and concrete examples where beneficial
   - Create smooth transitions between ideas

3. **Structure Refinement**:
   - Ensure logical flow of ideas
   - Improve paragraph organization
   - Strengthen opening and closing statements
   - Enhance coherence throughout

4. **Word Power**:
   - Replace weak verbs (is, are, was, were, have, get) with dynamic alternatives
   - Eliminate clichés and overused phrases
   - Use precise vocabulary appropriate to the context
   - Maintain consistency in terminology

5. **Tone Calibration**:
   - Ensure consistent ${toneDesc} tone throughout
   - Match vocabulary sophistication to target audience
   - Balance formality with readability

PRESERVE: Original meaning, key facts, author's core message, and intentional style choices.
Return ONLY the improved text with no explanations.`,

        rewrite: `You are an exceptional creative writer and master wordsmith. Completely transform this text while preserving its core message.

REWRITING APPROACH for ${toneDesc} tone:
1. **Fresh Perspective**: Approach the content from a new angle while maintaining the essential message
2. **New Vocabulary**: Use entirely different word choices that feel natural and engaging
3. **Restructured Flow**: Reorganize ideas for maximum impact and logical progression
4. **Enhanced Readability**: Aim for clear, compelling prose that captivates readers
5. **Tone Mastery**: Embody the ${toneDesc} tone authentically throughout
6. **Genre Awareness**: Write appropriately for ${modeDesc} context

The rewrite should feel like a completely new piece that delivers the same core value.
Maintain any factual information, names, dates, and specific details exactly.
Return ONLY the rewritten text.`,

        summarize: `You are an expert summarization specialist trained to extract and distill key information with precision.

SUMMARIZATION METHODOLOGY:
1. **Core Message**: Identify and preserve the central thesis or main point
2. **Key Supporting Points**: Include the most important supporting ideas
3. **Critical Details**: Retain essential facts, figures, names, and dates
4. **Logical Structure**: Present summary in a clear, organized manner
5. **Conciseness**: Reduce to approximately 20-30% of original length without losing meaning
6. **Completeness**: Ensure no critical information is omitted

SUMMARY FORMAT:
- Lead with the most important takeaway
- Use clear, direct language
- Maintain the original tone where appropriate
- Preserve any action items or conclusions

Return ONLY the summary text.`,

        expand: `You are a prolific content expert and subject matter authority. Expand this text comprehensively while maintaining quality.

EXPANSION STRATEGY for ${toneDesc} tone:
1. **Depth Addition**:
   - Add relevant supporting details and context
   - Include specific examples that illustrate points
   - Provide data, statistics, or evidence where appropriate
   - Offer multiple perspectives when relevant

2. **Clarity Enhancement**:
   - Elaborate on complex concepts
   - Define technical terms naturally
   - Add explanatory transitions
   - Include helpful analogies or comparisons

3. **Engagement Boosting**:
   - Add compelling narratives or case studies
   - Include rhetorical questions where appropriate
   - Build anticipation and maintain interest
   - Create vivid descriptions

4. **Structure Improvement**:
   - Add logical subpoints
   - Include smooth transitions
   - Build towards clear conclusions
   - Ensure comprehensive coverage

Target: Approximately 2-3x the original length with substantial value-add.
Maintain factual accuracy - do not invent false information.
Return ONLY the expanded text.`,

        custom: `You are an elite AI writing assistant capable of any text transformation task.

EXECUTION PRINCIPLES:
1. Follow user instructions with absolute precision
2. Maintain the highest quality standards in your output
3. Preserve important elements unless instructed otherwise
4. Deliver professional-grade results
5. Return only what was requested, no meta-commentary

Adapt your approach based on the specific instructions provided.
Return ONLY the requested output.`,
    };

    // Get the base prompt for this action
    const basePrompt = basePrompts[action] || basePrompts.improve;

    // Get industry-specific context if mode is specified
    const industryContext = INDUSTRY_MODE_PROMPTS[modeDesc] || INDUSTRY_MODE_PROMPTS.general;

    // Combine prompts for maximum effectiveness
    // The industry context comes first to set the domain expertise, then the action-specific instructions
    if (modeDesc !== 'general' && INDUSTRY_MODE_PROMPTS[modeDesc]) {
        return `${industryContext}

---

${basePrompt}

---

IMPORTANT: Apply your ${modeDesc.replace('_', ' ').toUpperCase()} expertise to every aspect of this task. 
The output must reflect deep understanding of ${modeDesc.replace('_', ' ')} writing conventions.`;
    }

    return basePrompt;
}

export async function processAIRequest(
    action: string,
    text: string,
    tone?: string,
    mode?: string,
    customPrompt?: string
): Promise<{ result: string; coinsUsed: number }> {
    const client = getOpenAIClient();
    const coinsUsed = COIN_COSTS[action] || 10;

    // Use custom prompt for 'custom' action, otherwise use enhanced prompts with mode
    const systemPrompt = action === 'custom' && customPrompt
        ? customPrompt
        : getSystemPrompt(action, tone, mode);

    // Optimal temperature settings for each action type
    const temperatureMap: Record<string, number> = {
        fix_grammar: 0.1,  // Very low for maximum accuracy
        improve: 0.5,       // Balanced creativity and accuracy
        rewrite: 0.7,       // Higher creativity for rewrites
        summarize: 0.3,     // Low for factual accuracy
        expand: 0.6,        // Medium creativity
        custom: 0.5,        // Balanced default
    };

    const temperature = temperatureMap[action] ?? 0.5;

    try {
        const completion = await client.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text },
            ],
            temperature,
            max_tokens: 4096,
        });

        const result = completion.choices[0]?.message?.content || '';
        return { result: cleanAIResponse(result), coinsUsed };
    } catch (error: any) {
        console.error('AI Process Error:', error);

        // Handle model deprecation specifically
        if (error.code === 'model_not_found' || error.message?.includes('model')) {
            throw new Error(`AI model "${OPENAI_MODEL}" is not available. Please update OPENAI_MODEL in backend/src/services/ai.ts`);
        }

        // Handle upstream authentication errors (OpenRouter/OpenAI)
        // Convert 401/403 from upstream to 502 to avoid logging out the user
        if (error.status === 401 || error.status === 403) {
            console.error('Upstream AI Provider Authentication Failed:', error.message);
            throw new Error(`AI Service Unavailable: Authentication failed with provider. Check server logs.`);
        }

        throw new Error(`AI processing failed: ${error.message}`);
    }
}

export async function processAdvancedAIRequest(
    action: string,
    text: string,
    options?: { citationStyle?: string }
): Promise<{ result: any; coinsUsed: number }> {
    const client = getOpenAIClient();
    const coinsUsed = ADVANCED_COIN_COSTS[action as keyof typeof ADVANCED_COIN_COSTS] || 20;

    try {
        switch (action) {
            case 'plagiarism_check': {
                const plagiarismResult = await checkPlagiarism(text);
                return { result: plagiarismResult, coinsUsed };
            }

            case 'rewrite_unique': {
                const completion = await client.chat.completions.create({
                    model: OPENAI_MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: `You are a master paraphrasing expert specializing in creating 100% original, plagiarism-proof content.

ADVANCED PARAPHRASING STRATEGY:
1. **Complete Structural Transformation**:
   - Reorganize paragraph structure entirely
   - Change the order of presented ideas
   - Split long sentences, combine short ones
   - Transform lists into prose and vice versa

2. **Deep Vocabulary Replacement**:
   - Replace every possible word with contextually appropriate synonyms
   - Use varied vocabulary levels (academic, professional, conversational)
   - Avoid common phrase patterns that might trigger plagiarism detection
   - Replace idioms with different expressions conveying same meaning

3. **Syntactic Transformation**:
   - Convert active to passive voice and vice versa
   - Change sentence beginnings completely
   - Restructure conditional statements
   - Transform direct statements to rhetorical questions where appropriate

4. **Voice and Perspective Shifts**:
   - Modify the narrative perspective where possible
   - Add transitional phrases for flow
   - Vary the formality level naturally

5. **Semantic Preservation**:
   - CRITICAL: Preserve ALL factual information
   - Maintain the exact meaning and intent
   - Keep numerical data, proper nouns, and technical terms accurate

OUTPUT: Return ONLY the rewritten text. Zero explanations.
TARGET: 0% similarity to original in plagiarism checkers.`,
                        },
                        { role: 'user', content: text },
                    ],
                    temperature: 0.85,
                    max_tokens: 4096,
                });
                const result = completion.choices[0]?.message?.content || '';
                return { result: cleanAIResponse(result), coinsUsed };
            }

            case 'humanize': {
                const completion = await client.chat.completions.create({
                    model: OPENAI_MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: `You are an expert at transforming AI-generated text into authentic human writing that passes ALL AI detection tools (GPTZero, Originality.AI, Turnitin, etc.).

ADVANCED HUMANIZATION TECHNIQUES:

1. **Natural Language Patterns**:
   - Use contractions naturally (don't, can't, won't, it's)
   - Include filler phrases humans use ("you know", "actually", "honestly", "I think")
   - Add personal opinions and reactions
   - Use rhetorical questions to engage readers

2. **Intentional Imperfections**:
   - Add subtle redundancies (humans repeat themselves)
   - Include parenthetical thoughts (like this one)
   - Use sentence fragments for emphasis. Like this.
   - Start occasional sentences with "And" or "But"

3. **Emotional Intelligence**:
   - Express genuine enthusiasm or concern
   - Include relatable anecdotes or examples
   - Add empathy-driven phrases
   - Show personality through word choice

4. **Varied Sentence Rhythm**:
   - Mix very short punchy sentences with longer, flowing ones that take their time to make a point
   - Use em-dashes for emphasis—like this
   - Include questions that readers might be thinking

5. **Authentic Voice Markers**:
   - First-person perspective where appropriate
   - Conversational asides
   - Mild exaggerations humans naturally use
   - Expressions of uncertainty ("I believe", "it seems like", "probably")

6. **Structural Authenticity**:
   - Occasionally start paragraphs with transitions
   - Include one-sentence paragraphs for impact
   - End on thought-provoking notes
   - Add subtle humor where appropriate

CRITICAL: Preserve all factual content and core meaning.
OUTPUT: Return ONLY the humanized text. No explanations.
TARGET: 100% human score on AI detection tools.`,
                        },
                        { role: 'user', content: text },
                    ],
                    temperature: 0.92,
                    max_tokens: 4096,
                });
                const result = completion.choices[0]?.message?.content || '';
                return { result: cleanAIResponse(result), coinsUsed };
            }

            case 'bypass_detector': {
                const completion = await client.chat.completions.create({
                    model: OPENAI_MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: `You are the world's leading expert at making text completely undetectable by ANY AI detection system (GPTZero, Originality.AI, ZeroGPT, Copyleaks, Turnitin AI, Winston AI, etc.).

ULTIMATE AI BYPASS METHODOLOGY:

1. **Perplexity Manipulation**:
   - Introduce word choices that are less predictable
   - Avoid common AI patterns and phrase structures
   - Use unexpected but contextually correct vocabulary
   - Break formulaic patterns typical of AI

2. **Burstiness Enhancement**:
   - Create dramatic variation in sentence length
   - Some sentences should be very short. Others should stretch on, weaving through multiple clauses and ideas before finally reaching their conclusion
   - Mix complex and simple sentences unpredictably

3. **Human Writing Fingerprints**:
   - Add genuine emotional reactions
   - Include tangential but relevant thoughts
   - Express personal viewpoints
   - Use idiomatic expressions naturally
   - Include casual language transitions

4. **Anti-Pattern Techniques**:
   - Avoid starting consecutive sentences the same way
   - Eliminate predictable word pairings AI commonly uses
   - Break typical AI paragraph structures
   - Randomize transition word usage

5. **Authenticity Markers**:
   - First-person perspective with genuine voice
   - Mild grammatical flexibility (starting with "And" or "But")
   - Rhetorical questions that engage readers
   - Parenthetical asides (thoughts within thoughts)
   - Real-world references and examples

6. **Neural Pattern Disruption**:
   - Use contractions inconsistently (as humans do)
   - Vary formality within the same piece
   - Include minor redundancies
   - Add emphatic expressions

PRESERVE: All factual content, key messages, and essential information.
OUTPUT: Return ONLY the rewritten text. Zero meta-commentary.
TARGET: Undetectable by ALL AI detection systems. 0% AI probability.`,
                        },
                        { role: 'user', content: text },
                    ],
                    temperature: 0.95,
                    max_tokens: 4096,
                });
                const result = completion.choices[0]?.message?.content || '';
                return { result: cleanAIResponse(result), coinsUsed };
            }

            case 'generate_citation': {
                const style = options?.citationStyle || 'APA';
                const completion = await client.chat.completions.create({
                    model: OPENAI_MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: `You are an elite academic citation expert with mastery of ALL citation formats.

CITATION GENERATION PROTOCOL:

1. **Supported Formats** (apply the requested style precisely):
   - APA 7th Edition
   - MLA 9th Edition
   - Chicago/Turabian (Notes-Bibliography & Author-Date)
   - Harvard Referencing
   - IEEE
   - AMA (American Medical Association)
   - Vancouver
   - ACS (American Chemical Society)
   - OSCOLA (Legal)
   - Bluebook (Legal)

2. **Citation Elements to Extract/Infer**:
   - Author(s) name(s) - Last name, First initial format
   - Publication date/year
   - Title of work (article, book, chapter)
   - Title of container (journal, website, anthology)
   - Publisher information
   - Volume, issue, page numbers
   - DOI or URL (if applicable)
   - Access date (for web sources)

3. **Format-Specific Rules**:
   - Apply correct punctuation for the style
   - Use proper italicization/quotation marks
   - Include hanging indent notation if relevant
   - Format multiple authors correctly
   - Handle missing information appropriately

4. **Quality Standards**:
   - 100% format accuracy
   - Proper capitalization (title case vs. sentence case)
   - Correct abbreviations (ed., eds., pp., vol., etc.)
   - Handle special characters properly

CURRENT STYLE: ${style}

OUTPUT: Return ONLY the properly formatted citation.
If information is missing, indicate with [Author], [Year], etc. placeholders.`,
                        },
                        { role: 'user', content: text },
                    ],
                    temperature: 0.2,
                    max_tokens: 500,
                });
                const result = completion.choices[0]?.message?.content || '';
                return { result: cleanAIResponse(result), coinsUsed };
            }

            default:
                throw new Error(`Unknown advanced action: ${action}`);
        }
    } catch (error: any) {
        console.error('Advanced AI Process Error:', error);

        // Handle model deprecation specifically
        if (error.code === 'model_not_found' || error.message?.includes('model')) {
            throw new Error(`AI model "${OPENAI_MODEL}" is not available. Please update OPENAI_MODEL in backend/src/services/ai.ts`);
        }

        // Handle upstream authentication errors (OpenRouter/OpenAI)
        if (error.status === 401 || error.status === 403) {
            console.error('Upstream AI Provider Authentication Failed:', error.message);
            throw new Error(`AI Service Unavailable: Authentication failed with provider. Check server logs.`);
        }

        throw new Error(`Advanced AI processing failed: ${error.message}`);
    }
}

export function getActionCost(action: string): number {
    return COIN_COSTS[action] || ADVANCED_COIN_COSTS[action as keyof typeof ADVANCED_COIN_COSTS] || 10;
}
