export interface IndustryMode {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    examples: string[];
    recommendedActions?: string[];
}

/**
 * INDUSTRY-SPECIFIC WRITING MODES
 * 
 * 15 specialized modes that inject deep domain expertise into AI processing.
 * Each mode tells the AI to apply industry-specific conventions and best practices.
 */
export const INDUSTRY_MODES: Record<string, IndustryMode> = {
    general: {
        id: 'general',
        name: 'General Writing',
        icon: '✍️',
        color: 'slate',
        description: 'Versatile writing for any purpose',
        examples: ['Essays', 'Articles', 'General content'],
        recommendedActions: ['fix_grammar', 'improve', 'rewrite'],
    },
    academic: {
        id: 'academic',
        name: 'Academic',
        icon: '🎓',
        color: 'indigo',
        description: 'Scholarly writing with formal conventions',
        examples: ['Research papers', 'Thesis', 'Literature reviews', 'Lab reports'],
        recommendedActions: ['fix_grammar', 'improve', 'summarize'],
    },
    legal: {
        id: 'legal',
        name: 'Legal',
        icon: '⚖️',
        color: 'gray',
        description: 'Precise legal language and contracts',
        examples: ['Contracts', 'Terms of Service', 'Legal memos', 'Agreements'],
        recommendedActions: ['fix_grammar', 'improve'],
    },
    medical: {
        id: 'medical',
        name: 'Medical/Healthcare',
        icon: '🏥',
        color: 'red',
        description: 'Clinical and patient-facing content',
        examples: ['Patient guides', 'Clinical notes', 'Research', 'Health articles'],
        recommendedActions: ['fix_grammar', 'improve', 'summarize'],
    },
    technical: {
        id: 'technical',
        name: 'Technical',
        icon: '⚙️',
        color: 'green',
        description: 'Software documentation and guides',
        examples: ['API docs', 'README files', 'Tutorials', 'Release notes'],
        recommendedActions: ['fix_grammar', 'improve', 'expand'],
    },
    marketing: {
        id: 'marketing',
        name: 'Marketing',
        icon: '📢',
        color: 'orange',
        description: 'Compelling, conversion-focused copy',
        examples: ['Ad copy', 'Landing pages', 'Email campaigns', 'Sales pages'],
        recommendedActions: ['improve', 'rewrite', 'expand'],
    },
    journalism: {
        id: 'journalism',
        name: 'Journalism',
        icon: '📰',
        color: 'blue',
        description: 'News articles and AP style reporting',
        examples: ['News articles', 'Press releases', 'Features', 'Interviews'],
        recommendedActions: ['fix_grammar', 'summarize', 'rewrite'],
    },
    creative: {
        id: 'creative',
        name: 'Creative',
        icon: '🎨',
        color: 'purple',
        description: 'Fiction and narrative writing',
        examples: ['Stories', 'Poetry', 'Scripts', 'Character descriptions'],
        recommendedActions: ['improve', 'rewrite', 'expand'],
    },
    business: {
        id: 'business',
        name: 'Business',
        icon: '💼',
        color: 'blue',
        description: 'Professional executive communication',
        examples: ['Emails', 'Reports', 'Proposals', 'Executive summaries'],
        recommendedActions: ['fix_grammar', 'improve', 'summarize'],
    },
    social_media: {
        id: 'social_media',
        name: 'Social Media',
        icon: '📱',
        color: 'pink',
        description: 'Engaging platform-optimized content',
        examples: ['Posts', 'Threads', 'Captions', 'Bio optimization'],
        recommendedActions: ['improve', 'rewrite'],
    },
    ecommerce: {
        id: 'ecommerce',
        name: 'E-commerce',
        icon: '🛍️',
        color: 'amber',
        description: 'Product content that converts',
        examples: ['Product descriptions', 'Category pages', 'Reviews', 'FAQs'],
        recommendedActions: ['improve', 'rewrite', 'expand'],
    },
    finance: {
        id: 'finance',
        name: 'Finance',
        icon: '💰',
        color: 'emerald',
        description: 'Compliance-aware financial content',
        examples: ['Reports', 'Analysis', 'Investor updates', 'Disclosures'],
        recommendedActions: ['fix_grammar', 'improve'],
    },
    hr_recruitment: {
        id: 'hr_recruitment',
        name: 'HR/Recruitment',
        icon: '👥',
        color: 'teal',
        description: 'Inclusive workplace content',
        examples: ['Job descriptions', 'Performance reviews', 'Policies', 'Onboarding'],
        recommendedActions: ['fix_grammar', 'improve', 'rewrite'],
    },
    education: {
        id: 'education',
        name: 'Education',
        icon: '📚',
        color: 'yellow',
        description: 'Instructional and learning content',
        examples: ['Lesson plans', 'Course materials', 'Quizzes', 'Explanations'],
        recommendedActions: ['improve', 'expand', 'summarize'],
    },
    real_estate: {
        id: 'real_estate',
        name: 'Real Estate',
        icon: '🏠',
        color: 'cyan',
        description: 'Compelling property descriptions',
        examples: ['Listings', 'Neighborhood guides', 'Market reports', 'Open house invites'],
        recommendedActions: ['improve', 'rewrite', 'expand'],
    },
    travel: {
        id: 'travel',
        name: 'Travel',
        icon: '✈️',
        color: 'sky',
        description: 'Inspiring travel and hospitality content',
        examples: ['Destination guides', 'Itineraries', 'Hotel descriptions', 'Reviews'],
        recommendedActions: ['improve', 'rewrite', 'expand'],
    },
};

/**
 * Get all modes as an array for UI components
 */
export function getAllModes(): IndustryMode[] {
    return Object.values(INDUSTRY_MODES);
}

/**
 * Get a specific mode by ID
 */
export function getMode(id: string): IndustryMode | undefined {
    return INDUSTRY_MODES[id];
}

