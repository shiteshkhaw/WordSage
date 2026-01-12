import { Router } from 'express';
export const templatesRouter = Router();
/**
 * ENHANCED TEMPLATES - 30+ Professional Templates
 *
 * Each template includes:
 * - AI prompt: Specific instructions for AI-assisted content generation
 * - Variables: Dynamic placeholders for customization
 * - Example output: Reference for expected quality
 */
const TEMPLATES = [
    // ========================================
    // 📧 EMAIL TEMPLATES
    // ========================================
    {
        id: 'email-professional',
        name: 'Professional Email',
        category: 'email',
        mode: 'business',
        icon: '📧',
        description: 'A well-structured professional email for business communication',
        structure: {
            sections: ['Subject Line', 'Greeting', 'Purpose', 'Details', 'Call to Action', 'Closing', 'Signature'],
        },
        aiPrompt: 'Write a clear, concise professional email. Use a direct subject line, open with context, state the purpose early, include specific details, and end with a clear call to action.',
        variables: ['{{recipient_name}}', '{{sender_name}}', '{{company}}', '{{purpose}}'],
    },
    {
        id: 'email-cold-outreach',
        name: 'Cold Outreach Email',
        category: 'email',
        mode: 'marketing',
        icon: '🎯',
        description: 'Compelling cold email that gets responses',
        structure: {
            sections: ['Attention-Grabbing Subject', 'Personal Hook', 'Value Proposition', 'Social Proof', 'Soft CTA', 'Signature'],
        },
        aiPrompt: 'Write a personalized cold email that grabs attention, demonstrates value quickly, includes relevant social proof, and ends with a low-commitment call to action. Keep it under 150 words.',
        variables: ['{{prospect_name}}', '{{company}}', '{{pain_point}}', '{{solution}}'],
    },
    {
        id: 'email-follow-up',
        name: 'Follow-up Email',
        category: 'email',
        mode: 'business',
        icon: '🔄',
        description: 'Effective follow-up that gets responses',
        structure: {
            sections: ['Reference Previous Contact', 'Added Value', 'Reminder of Ask', 'Easy Next Step'],
        },
        aiPrompt: 'Write a polite but persistent follow-up email. Reference the previous conversation, add new value or perspective, and make responding easy.',
        variables: ['{{recipient}}', '{{previous_topic}}', '{{time_since}}'],
    },
    // ========================================
    // 📝 CONTENT TEMPLATES
    // ========================================
    {
        id: 'blog-post',
        name: 'Blog Post',
        category: 'content',
        mode: 'creative',
        icon: '📝',
        description: 'Engaging blog post with SEO-friendly structure',
        structure: {
            sections: ['Title (H1)', 'Hook/Introduction', 'Main Points (H2s)', 'Examples', 'Conclusion', 'Call to Action'],
        },
        aiPrompt: 'Write an engaging, value-packed blog post. Start with a hook that addresses the reader\'s pain point, deliver actionable insights, use subheadings for scannability, and end with a memorable conclusion.',
        variables: ['{{topic}}', '{{target_keyword}}', '{{audience}}', '{{word_count}}'],
    },
    {
        id: 'linkedin-article',
        name: 'LinkedIn Article',
        category: 'content',
        mode: 'business',
        icon: '💼',
        description: 'Thought leadership article for LinkedIn',
        structure: {
            sections: ['Attention-Grabbing Title', 'Personal Story/Hook', 'Key Insight', 'Supporting Points', 'Actionable Takeaways', 'Engagement Question'],
        },
        aiPrompt: 'Write a LinkedIn article that positions the author as a thought leader. Include personal experience, actionable insights, and end with a question to drive engagement.',
        variables: ['{{topic}}', '{{author_expertise}}', '{{industry}}'],
    },
    {
        id: 'how-to-guide',
        name: 'How-To Guide',
        category: 'content',
        mode: 'education',
        icon: '📚',
        description: 'Step-by-step tutorial or guide',
        structure: {
            sections: ['What You\'ll Learn', 'Prerequisites', 'Step 1', 'Step 2', 'Step 3', 'Pro Tips', 'Troubleshooting', 'Next Steps'],
        },
        aiPrompt: 'Write a comprehensive how-to guide with numbered steps, clear explanations, helpful tips, and common troubleshooting solutions. Use simple language that beginners can follow.',
        variables: ['{{skill}}', '{{difficulty_level}}', '{{time_required}}'],
    },
    // ========================================
    // 💼 BUSINESS TEMPLATES
    // ========================================
    {
        id: 'meeting-notes',
        name: 'Meeting Notes',
        category: 'business',
        mode: 'business',
        icon: '📋',
        description: 'Organized meeting notes with action items',
        structure: {
            sections: ['Meeting Title & Date', 'Attendees', 'Agenda', 'Discussion Points', 'Decisions Made', 'Action Items (Owner + Deadline)', 'Next Meeting'],
        },
        aiPrompt: 'Organize meeting notes clearly with actionable items. Each action item should have an owner and deadline. Keep language concise and professional.',
        variables: ['{{meeting_type}}', '{{date}}', '{{attendees}}'],
    },
    {
        id: 'executive-summary',
        name: 'Executive Summary',
        category: 'business',
        mode: 'business',
        icon: '📊',
        description: 'Concise summary for busy executives',
        structure: {
            sections: ['Situation/Context', 'Key Findings', 'Recommendation', 'Impact/ROI', 'Next Steps', 'Timeline'],
        },
        aiPrompt: 'Write a concise executive summary using BLUF (Bottom Line Up Front). Lead with the recommendation, support with key data, and end with clear next steps. Keep it under 500 words.',
        variables: ['{{project}}', '{{stakeholders}}', '{{decision_type}}'],
    },
    {
        id: 'project-proposal',
        name: 'Project Proposal',
        category: 'business',
        mode: 'business',
        icon: '📑',
        description: 'Comprehensive project proposal',
        structure: {
            sections: ['Executive Summary', 'Problem Statement', 'Proposed Solution', 'Scope & Deliverables', 'Timeline', 'Budget', 'Team', 'Risk Assessment', 'Success Metrics'],
        },
        aiPrompt: 'Write a persuasive project proposal that clearly defines the problem, presents a compelling solution, includes realistic timelines and budgets, and addresses potential concerns.',
        variables: ['{{project_name}}', '{{client}}', '{{budget_range}}', '{{duration}}'],
    },
    {
        id: 'case-study',
        name: 'Case Study',
        category: 'business',
        mode: 'marketing',
        icon: '📊',
        description: 'Compelling customer success story',
        structure: {
            sections: ['Client Overview', 'Challenge', 'Solution', 'Implementation', 'Results (with metrics)', 'Client Testimonial', 'Key Takeaways'],
        },
        aiPrompt: 'Write a compelling case study that follows the Challenge-Solution-Results framework. Include specific metrics, quote the client, and make the success story relatable.',
        variables: ['{{client_name}}', '{{industry}}', '{{key_metric}}', '{{timeframe}}'],
    },
    // ========================================
    // 📢 MARKETING TEMPLATES
    // ========================================
    {
        id: 'product-description',
        name: 'Product Description',
        category: 'marketing',
        mode: 'ecommerce',
        icon: '🛍️',
        description: 'Converting product description',
        structure: {
            sections: ['Headline', 'Value Proposition', 'Key Benefits (bullets)', 'Features', 'Social Proof', 'Call to Action'],
        },
        aiPrompt: 'Write a compelling product description that leads with benefits, uses sensory language, addresses objections, and creates desire. Focus on how the product improves the customer\'s life.',
        variables: ['{{product_name}}', '{{target_customer}}', '{{price_point}}', '{{key_feature}}'],
    },
    {
        id: 'landing-page',
        name: 'Landing Page Copy',
        category: 'marketing',
        mode: 'marketing',
        icon: '🖥️',
        description: 'High-converting landing page copy',
        structure: {
            sections: ['Headline', 'Subheadline', 'Hero Section', 'Problem/Pain Points', 'Solution', 'Benefits', 'Social Proof', 'FAQ', 'CTA'],
        },
        aiPrompt: 'Write landing page copy that grabs attention immediately, addresses the visitor\'s pain points, presents the solution compellingly, and guides toward a single clear action.',
        variables: ['{{product}}', '{{target_audience}}', '{{primary_cta}}', '{{objections}}'],
    },
    {
        id: 'ad-copy',
        name: 'Ad Copy (PPC/Social)',
        category: 'marketing',
        mode: 'marketing',
        icon: '📣',
        description: 'Attention-grabbing ad copy',
        structure: {
            sections: ['Headline (Attention)', 'Body (Interest + Desire)', 'CTA (Action)', 'Ad variations'],
        },
        aiPrompt: 'Write scroll-stopping ad copy using AIDA framework. Create multiple variations with different angles. Keep headlines under 30 characters and body under 90 for mobile optimization.',
        variables: ['{{product}}', '{{platform}}', '{{audience}}', '{{offer}}'],
    },
    {
        id: 'press-release',
        name: 'Press Release',
        category: 'marketing',
        mode: 'journalism',
        icon: '📰',
        description: 'Standard press release format',
        structure: {
            sections: ['Headline', 'Dateline', 'Lead Paragraph', 'Body', 'Quotes', 'Boilerplate', 'Media Contact'],
        },
        aiPrompt: 'Write a news-worthy press release in AP style. Lead with the most important information, include quotable quotes, and make it easy for journalists to cover.',
        variables: ['{{announcement}}', '{{company}}', '{{spokesperson}}', '{{date}}'],
    },
    // ========================================
    // 📱 SOCIAL MEDIA TEMPLATES
    // ========================================
    {
        id: 'social-media',
        name: 'Social Media Post',
        category: 'social',
        mode: 'social_media',
        icon: '📱',
        description: 'Engaging social media post',
        structure: {
            sections: ['Hook (First Line)', 'Value/Story', 'Engagement Prompt', 'Hashtags'],
        },
        aiPrompt: 'Write a thumb-stopping social post. Start with a powerful hook, deliver value or tell a story, and encourage engagement. Include relevant hashtags.',
        variables: ['{{platform}}', '{{topic}}', '{{tone}}', '{{cta}}'],
    },
    {
        id: 'twitter-thread',
        name: 'Twitter/X Thread',
        category: 'social',
        mode: 'social_media',
        icon: '🧵',
        description: 'Viral Twitter thread structure',
        structure: {
            sections: ['Hook Tweet', 'Context', 'Main Points (3-7 tweets)', 'Key Insight', 'Takeaway/CTA', 'Retweet Request'],
        },
        aiPrompt: 'Write a viral Twitter thread. Start with an irresistible hook, deliver insights in digestible tweets, use line breaks for readability, and end with a clear takeaway. Number the tweets.',
        variables: ['{{topic}}', '{{expertise}}', '{{audience}}'],
    },
    {
        id: 'linkedin-post',
        name: 'LinkedIn Post',
        category: 'social',
        mode: 'business',
        icon: '💼',
        description: 'Engaging LinkedIn post',
        structure: {
            sections: ['Hook', 'Story/Insight', 'Lesson', 'Engagement Question'],
        },
        aiPrompt: 'Write a LinkedIn post that tells a story or shares an insight. Use short paragraphs, line breaks for readability, and end with a thought-provoking question. Keep authentic and professional.',
        variables: ['{{topic}}', '{{personal_experience}}', '{{industry}}'],
    },
    // ========================================
    // 🎓 ACADEMIC TEMPLATES
    // ========================================
    {
        id: 'research-summary',
        name: 'Research Summary',
        category: 'academic',
        mode: 'academic',
        icon: '🔬',
        description: 'Structured research summary',
        structure: {
            sections: ['Abstract', 'Background', 'Methodology', 'Key Findings', 'Analysis', 'Conclusions', 'References'],
        },
        aiPrompt: 'Write an objective research summary using academic language. Present methodology clearly, support findings with evidence, and distinguish between facts and interpretation.',
        variables: ['{{research_topic}}', '{{field}}', '{{methodology}}'],
    },
    {
        id: 'thesis-statement',
        name: 'Thesis Statement',
        category: 'academic',
        mode: 'academic',
        icon: '📜',
        description: 'Strong thesis statement',
        structure: {
            sections: ['Topic', 'Position/Argument', 'Main Supporting Points', 'Significance'],
        },
        aiPrompt: 'Craft a clear, arguable thesis statement that takes a position, outlines the main points, and indicates the significance of the argument.',
        variables: ['{{topic}}', '{{discipline}}', '{{scope}}'],
    },
    // ========================================
    // ⚙️ TECHNICAL TEMPLATES
    // ========================================
    {
        id: 'api-documentation',
        name: 'API Documentation',
        category: 'technical',
        mode: 'technical',
        icon: '🔧',
        description: 'Clear API endpoint documentation',
        structure: {
            sections: ['Endpoint', 'Description', 'Authentication', 'Parameters', 'Request Example', 'Response Example', 'Error Codes', 'Rate Limits'],
        },
        aiPrompt: 'Write clear API documentation. Include all parameters, provide working examples, document error responses, and use consistent formatting.',
        variables: ['{{endpoint}}', '{{method}}', '{{auth_type}}'],
    },
    {
        id: 'readme',
        name: 'README.md',
        category: 'technical',
        mode: 'technical',
        icon: '📖',
        description: 'Project README file',
        structure: {
            sections: ['Project Title', 'Description', 'Installation', 'Usage', 'Configuration', 'Contributing', 'License'],
        },
        aiPrompt: 'Write a comprehensive README that helps developers get started quickly. Include clear installation steps, usage examples, and contribution guidelines.',
        variables: ['{{project_name}}', '{{language}}', '{{license}}'],
    },
    {
        id: 'release-notes',
        name: 'Release Notes',
        category: 'technical',
        mode: 'technical',
        icon: '🚀',
        description: 'Version release notes',
        structure: {
            sections: ['Version Number', 'Release Date', 'Highlights', 'New Features', 'Improvements', 'Bug Fixes', 'Breaking Changes', 'Migration Guide'],
        },
        aiPrompt: 'Write clear release notes that highlight what\'s new, list bug fixes, and clearly communicate any breaking changes with migration steps.',
        variables: ['{{version}}', '{{product}}', '{{date}}'],
    },
    // ========================================
    // ⚖️ LEGAL TEMPLATES
    // ========================================
    {
        id: 'terms-of-service',
        name: 'Terms of Service',
        category: 'legal',
        mode: 'legal',
        icon: '📜',
        description: 'Website/App Terms of Service',
        structure: {
            sections: ['Introduction', 'Definitions', 'User Obligations', 'Service Description', 'Intellectual Property', 'Limitation of Liability', 'Termination', 'Governing Law'],
        },
        aiPrompt: 'Write clear Terms of Service using plain language where possible while maintaining legal precision. Define key terms, specify user obligations, and limit liability appropriately.',
        variables: ['{{company}}', '{{service}}', '{{jurisdiction}}'],
    },
    {
        id: 'privacy-policy',
        name: 'Privacy Policy',
        category: 'legal',
        mode: 'legal',
        icon: '🔒',
        description: 'GDPR/CCPA compliant privacy policy',
        structure: {
            sections: ['Data We Collect', 'How We Use Data', 'Data Sharing', 'Your Rights', 'Data Retention', 'Security', 'Cookies', 'Contact Information'],
        },
        aiPrompt: 'Write a comprehensive privacy policy that complies with GDPR and CCPA. Be transparent about data collection, clearly explain user rights, and use accessible language.',
        variables: ['{{company}}', '{{website}}', '{{data_types}}'],
    },
    // ========================================
    // 👥 HR TEMPLATES
    // ========================================
    {
        id: 'job-description',
        name: 'Job Description',
        category: 'hr',
        mode: 'hr_recruitment',
        icon: '💼',
        description: 'Inclusive job description',
        structure: {
            sections: ['Job Title', 'About Company', 'Role Overview', 'Responsibilities', 'Requirements', 'Nice-to-Haves', 'Benefits', 'Application Process'],
        },
        aiPrompt: 'Write an inclusive job description that focuses on skills and outcomes. Avoid gendered language, separate requirements from preferences, and highlight culture and growth opportunities.',
        variables: ['{{job_title}}', '{{department}}', '{{location}}', '{{experience_level}}'],
    },
    {
        id: 'performance-review',
        name: 'Performance Review',
        category: 'hr',
        mode: 'hr_recruitment',
        icon: '📈',
        description: 'Constructive performance review',
        structure: {
            sections: ['Summary', 'Key Achievements', 'Strengths', 'Areas for Development', 'Goals for Next Period', 'Support Needed', 'Overall Rating'],
        },
        aiPrompt: 'Write a balanced performance review. Be specific with examples, focus on behaviors not personality, frame development areas constructively, and set SMART goals.',
        variables: ['{{employee_name}}', '{{role}}', '{{review_period}}'],
    },
    // ========================================
    // 🏠 REAL ESTATE TEMPLATES
    // ========================================
    {
        id: 'property-listing',
        name: 'Property Listing',
        category: 'real_estate',
        mode: 'real_estate',
        icon: '🏠',
        description: 'Compelling property listing',
        structure: {
            sections: ['Headline', 'Property Overview', 'Key Features', 'Room Details', 'Location Benefits', 'Community', 'Price/Terms', 'Contact'],
        },
        aiPrompt: 'Write an evocative property listing that helps buyers visualize living there. Lead with the most compelling feature, use sensory language, and highlight lifestyle benefits.',
        variables: ['{{property_type}}', '{{location}}', '{{bedrooms}}', '{{price}}'],
    },
    // ========================================
    // ✈️ TRAVEL TEMPLATES
    // ========================================
    {
        id: 'destination-guide',
        name: 'Destination Guide',
        category: 'travel',
        mode: 'travel',
        icon: '✈️',
        description: 'Comprehensive travel destination guide',
        structure: {
            sections: ['Introduction', 'Best Time to Visit', 'Getting There', 'Things to Do', 'Where to Stay', 'Food & Dining', 'Local Tips', 'Budget Guide'],
        },
        aiPrompt: 'Write an inspiring yet practical destination guide. Transport readers with vivid descriptions, provide insider tips, and include essential logistical information.',
        variables: ['{{destination}}', '{{trip_type}}', '{{duration}}'],
    },
];
// GET /api/templates - Get all templates
templatesRouter.get('/', (req, res) => {
    const { category, mode } = req.query;
    let filteredTemplates = TEMPLATES;
    if (category) {
        filteredTemplates = filteredTemplates.filter(t => t.category === category);
    }
    if (mode) {
        filteredTemplates = filteredTemplates.filter(t => t.mode === mode);
    }
    res.json({ data: filteredTemplates });
});
// GET /api/templates/:id - Get single template
templatesRouter.get('/:id', (req, res) => {
    const template = TEMPLATES.find(t => t.id === req.params.id);
    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ data: template });
});
// GET /api/templates/categories - Get all categories
templatesRouter.get('/meta/categories', (req, res) => {
    const categories = [...new Set(TEMPLATES.map(t => t.category))];
    res.json({ data: categories });
});
//# sourceMappingURL=templates.js.map