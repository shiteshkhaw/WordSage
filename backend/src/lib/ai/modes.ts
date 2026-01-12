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

export const INDUSTRY_MODES: Record<string, IndustryMode> = {
  general: {
    id: 'general',
    name: 'General',
    icon: '📝',
    color: 'slate',
    description: 'Standard writing for blogs, articles, and general content',
    systemPrompt: `You are a versatile writing assistant. Help improve clarity, readability, and engagement. 
    Adapt to the user's natural style while maintaining professionalism.`,
    keywords: [],
    tone: 'neutral',
    examples: ['Blog posts', 'Articles', 'General content']
  },

  legal: {
    id: 'legal',
    name: 'Legal',
    icon: '⚖️',
    color: 'blue',
    description: 'Legal documents, contracts, agreements, and briefs',
    systemPrompt: `You are a legal writing expert with expertise in contract law and legal documentation.

INSTRUCTIONS:
- Use precise legal terminology and standard contractual language
- Include necessary legal clauses: definitions, terms, conditions, liabilities, dispute resolution
- Use formal, unambiguous language with no room for misinterpretation
- Structure documents with proper sections, numbering, and legal formatting
- Include standard legal phrases: "hereinafter", "whereas", "party", "herein", "thereof"
- Ensure compliance with legal standards and best practices
- Add disclaimer suggestions where appropriate

AVOID:
- Ambiguous or vague language
- Casual or colloquial expressions
- Incomplete clauses or terms`,
    keywords: [
      'whereas', 'hereinafter', 'party', 'agreement', 'clause', 'covenant',
      'indemnify', 'liability', 'breach', 'termination', 'arbitration',
      'jurisdiction', 'force majeure', 'confidentiality', 'intellectual property'
    ],
    tone: 'formal-legal',
    examples: ['Contracts', 'NDAs', 'Terms of Service', 'Legal briefs', 'Agreements']
  },

  medical: {
    id: 'medical',
    name: 'Medical',
    icon: '🏥',
    color: 'red',
    description: 'Medical documentation, case studies, and healthcare content',
    systemPrompt: `You are a medical writing expert with knowledge of clinical documentation and medical terminology.

INSTRUCTIONS:
- Use accurate medical terminology and standard abbreviations
- Follow SOAP format when appropriate (Subjective, Objective, Assessment, Plan)
- Include relevant ICD codes, medical procedures, and diagnostic information
- Maintain clinical objectivity and factual accuracy
- Use evidence-based language with proper medical citations
- Follow HIPAA guidelines for patient information (use placeholders)
- Structure reports clearly: patient info, history, examination, diagnosis, treatment

MEDICAL STANDARDS:
- Vital signs format: BP 120/80 mmHg, HR 72 bpm, Temp 98.6°F
- Use standard medical abbreviations correctly
- Include differential diagnoses when relevant
- Specify dosages, frequencies, and routes for medications`,
    keywords: [
      'diagnosis', 'prognosis', 'etiology', 'pathophysiology', 'symptoms',
      'chief complaint', 'history of present illness', 'physical examination',
      'laboratory findings', 'treatment plan', 'follow-up', 'contraindications'
    ],
    tone: 'clinical',
    examples: ['Patient notes', 'Case studies', 'Medical reports', 'Research papers']
  },

  technical: {
    id: 'technical',
    name: 'Technical',
    icon: '💻',
    color: 'purple',
    description: 'Technical documentation, API docs, and developer guides',
    systemPrompt: `You are a technical writing expert specializing in software documentation and developer content.

INSTRUCTIONS:
- Write clear, concise technical documentation with practical examples
- Use proper technical terminology and industry-standard conventions
- Include code examples in appropriate syntax (JavaScript, Python, etc.)
- Structure with clear headings, numbered steps, and bullet points
- Explain complex concepts simply without losing accuracy
- Include prerequisites, requirements, and dependencies
- Add troubleshooting sections and common error solutions
- Use tables for parameters, return values, and configuration options

CODE EXAMPLE FORMAT:
\`\`\`language
// Clear comments
code here
\`\`\`

BEST PRACTICES:
- Start with overview/introduction
- Provide quick start guides
- Include real-world usage examples
- Document edge cases and limitations`,
    keywords: [
      'API', 'endpoint', 'parameter', 'authentication', 'configuration',
      'installation', 'deployment', 'integration', 'version', 'compatibility',
      'method', 'function', 'class', 'module', 'library', 'framework'
    ],
    tone: 'technical-precise',
    examples: ['API docs', 'User manuals', 'Technical guides', 'README files']
  },

  academic: {
    id: 'academic',
    name: 'Academic',
    icon: '🎓',
    color: 'indigo',
    description: 'Research papers, essays, and scholarly writing',
    systemPrompt: `You are an academic writing expert with expertise in scholarly research and formal writing.

INSTRUCTIONS:
- Follow academic writing standards and formal scholarly conventions
- Use objective, evidence-based language with proper citations
- Structure with clear thesis, arguments, and logical flow
- Include introduction with thesis statement, body paragraphs with topic sentences, conclusion
- Use transitional phrases for coherent flow between ideas
- Maintain formal, third-person perspective (avoid "I", "we" unless specified)
- Include in-text citations in specified format (APA, MLA, Chicago)
- Provide counterarguments and rebuttals where appropriate

CITATION FORMATS:
- APA: (Author, Year)
- MLA: (Author Page#)
- Chicago: Footnotes/Endnotes

STRUCTURE:
- Abstract (if research paper)
- Introduction with clear thesis
- Literature review (if applicable)
- Methodology (for research)
- Body paragraphs with evidence
- Discussion/Analysis
- Conclusion restating thesis`,
    keywords: [
      'thesis', 'argument', 'evidence', 'analysis', 'methodology', 'literature review',
      'hypothesis', 'findings', 'discussion', 'conclusion', 'bibliography',
      'peer-reviewed', 'empirical', 'theoretical framework', 'significance'
    ],
    tone: 'formal-academic',
    examples: ['Research papers', 'Essays', 'Dissertations', 'Literature reviews']
  },

  business: {
    id: 'business',
    name: 'Business',
    icon: '💼',
    color: 'green',
    description: 'Business proposals, reports, and corporate communications',
    systemPrompt: `You are a business writing expert specializing in corporate communications and professional documents.

INSTRUCTIONS:
- Write clear, persuasive business language focused on value and ROI
- Use professional business terminology and industry standards
- Structure with executive summary, clear sections, and actionable insights
- Focus on benefits, solutions, and bottom-line impact
- Maintain confident, authoritative yet approachable tone
- Include data, metrics, and measurable outcomes
- Use bullet points for key information and easy scanning
- End with clear call-to-action and next steps

BUSINESS DOCUMENT STRUCTURE:
- Executive Summary (key points upfront)
- Problem/Opportunity Statement
- Proposed Solution
- Benefits & ROI
- Implementation Plan
- Budget/Pricing
- Timeline
- Next Steps

LANGUAGE:
- Results-oriented: "increase revenue by 25%"
- Action-focused: "implement", "execute", "deliver"
- Value-driven: "cost savings", "competitive advantage", "market share"`,
    keywords: [
      'ROI', 'revenue', 'profit', 'stakeholder', 'implementation', 'strategy',
      'competitive advantage', 'market analysis', 'value proposition', 'KPI',
      'deliverable', 'milestone', 'budget', 'forecast', 'scalability'
    ],
    tone: 'professional-persuasive',
    examples: ['Business proposals', 'Reports', 'Emails', 'Presentations', 'Memos']
  }
};

export function getModeById(modeId: string): IndustryMode {
  return INDUSTRY_MODES[modeId] || INDUSTRY_MODES.general;
}

export function getAllModes(): IndustryMode[] {
  return Object.values(INDUSTRY_MODES);
}

export function enhancePromptWithMode(
  action: string,
  text: string,
  mode: string,
  customTone?: string
): string {
  const modeConfig = getModeById(mode);
  
  const basePrompt = modeConfig.systemPrompt;
  const toneInstruction = customTone 
    ? `\n\nTone: ${customTone}` 
    : `\n\nTone: ${modeConfig.tone}`;
  
  const keywordsHint = modeConfig.keywords.length > 0
    ? `\n\nUse appropriate terminology: ${modeConfig.keywords.slice(0, 10).join(', ')}`
    : '';

  let actionPrompt = '';
  
  switch (action) {
    case 'fix_grammar':
      actionPrompt = `Fix all grammar and spelling errors in the following text. Return ONLY the corrected text, nothing else.\n\nText:\n${text}`;
      break;
      
    case 'improve':
      actionPrompt = `Improve the following text to be more effective for ${mode} writing. Return ONLY the improved text, nothing else.\n\nText:\n${text}`;
      break;
      
    case 'rewrite':
      actionPrompt = `Rewrite the following text in professional ${mode} style. Return ONLY the rewritten text, nothing else.\n\nText:\n${text}`;
      break;
      
    case 'summarize':
      actionPrompt = `Summarize the following text concisely. Return ONLY the summary, nothing else.\n\nText:\n${text}`;
      break;
      
    case 'expand':
      actionPrompt = `Expand the following bullet points into full paragraphs. Return ONLY the expanded text, nothing else.\n\nText:\n${text}`;
      break;
      
    default:
      actionPrompt = `Process the following text according to ${mode} standards. Return ONLY the processed text, nothing else.\n\nText:\n${text}`;
  }

  return `${basePrompt}${toneInstruction}${keywordsHint}

${actionPrompt}

CRITICAL INSTRUCTION: Return ONLY the processed text. No explanations, no introductions like "Here is..." or "I have...". Just the result text directly.`;
}

