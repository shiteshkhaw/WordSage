import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
export const templatesRouter = Router();
// Helper to format templates back to the schema format expected by the frontend client
function formatTemplate(t) {
    return {
        id: t.id,
        name: t.name,
        category: t.category,
        mode: t.mode,
        icon: t.icon,
        description: t.description,
        structure: {
            sections: Array.isArray(t.sections) ? t.sections : []
        },
        aiPrompt: t.ai_prompt,
        variables: Array.isArray(t.variables) ? t.variables : [],
        usage_count: t.usage_count,
        created_at: t.created_at,
        updated_at: t.updated_at,
    };
}
// GET /api/templates - Get all default and/or team templates
templatesRouter.get('/', requireAuth, async (req, res) => {
    try {
        const { category, mode, teamId } = req.query;
        // Where clause for default templates
        const whereClause = {
            is_default: true,
        };
        if (category) {
            whereClause.category = category;
        }
        if (mode) {
            whereClause.mode = mode;
        }
        // Fetch default templates
        const defaultTemplates = await prisma.templates.findMany({
            where: whereClause,
            orderBy: { name: 'asc' },
        });
        // If teamId is specified, fetch team templates too
        let teamTemplates = [];
        if (teamId) {
            // Verify user has access to the team
            const teamAccess = await prisma.teams.findFirst({
                where: {
                    id: teamId,
                    OR: [
                        { owner_id: req.user.id },
                        { team_members: { some: { user_id: req.user.id, status: 'active' } } }
                    ]
                }
            });
            if (teamAccess) {
                const teamWhereClause = { team_id: teamId };
                if (category)
                    teamWhereClause.category = category;
                if (mode)
                    teamWhereClause.mode = mode;
                teamTemplates = await prisma.team_templates.findMany({
                    where: teamWhereClause,
                    orderBy: { name: 'asc' },
                });
            }
        }
        // Map and combine lists
        const formattedDefaults = defaultTemplates.map((t) => ({ ...formatTemplate(t), type: 'default' }));
        const formattedTeam = teamTemplates.map((t) => ({ ...formatTemplate(t), type: 'team' }));
        res.json({
            data: [...formattedDefaults, ...formattedTeam]
        });
    }
    catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});
// GET /api/templates/meta/categories - Get all distinct categories
templatesRouter.get('/meta/categories', requireAuth, async (req, res) => {
    try {
        const categories = await prisma.templates.findMany({
            select: { category: true },
            distinct: ['category'],
        });
        res.json({ data: categories.map((c) => c.category) });
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
// GET /api/templates/:id - Get single template
templatesRouter.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        // Try default template first
        const defaultTemplate = await prisma.templates.findUnique({
            where: { id },
        });
        if (defaultTemplate) {
            return res.json({ data: { ...formatTemplate(defaultTemplate), type: 'default' } });
        }
        // Check team templates
        const teamTemplate = await prisma.team_templates.findUnique({
            where: { id },
        });
        if (teamTemplate) {
            // Verify user has access to this team
            const teamAccess = await prisma.teams.findFirst({
                where: {
                    id: teamTemplate.team_id,
                    OR: [
                        { owner_id: req.user.id },
                        { team_members: { some: { user_id: req.user.id, status: 'active' } } }
                    ]
                }
            });
            if (!teamAccess) {
                return res.status(403).json({ error: 'You do not have access to this team template' });
            }
            return res.json({ data: { ...formatTemplate(teamTemplate), type: 'team' } });
        }
        res.status(404).json({ error: 'Template not found' });
    }
    catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});
// POST /api/templates/:id/use - Increment usage count when selected
templatesRouter.post('/:id/use', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        // Try default template first
        const defaultTemplate = await prisma.templates.findUnique({
            where: { id },
        });
        if (defaultTemplate) {
            await prisma.templates.update({
                where: { id },
                data: { usage_count: { increment: 1 } },
            });
            return res.json({ success: true });
        }
        // Try team template
        const teamTemplate = await prisma.team_templates.findUnique({
            where: { id },
        });
        if (teamTemplate) {
            await prisma.team_templates.update({
                where: { id },
                data: { usage_count: { increment: 1 } },
            });
            return res.json({ success: true });
        }
        res.status(404).json({ error: 'Template not found' });
    }
    catch (error) {
        console.error('Error tracking template usage:', error);
        res.status(500).json({ error: 'Failed to track template usage' });
    }
});
// ========================================
// 👥 TEAM TEMPLATES ENDPOINTS (CRUD)
// ========================================
// GET /api/templates/team/:teamId - Get templates for specific team
templatesRouter.get('/team/:teamId', requireAuth, async (req, res) => {
    try {
        const { teamId } = req.params;
        // Verify team access
        const teamAccess = await prisma.teams.findFirst({
            where: {
                id: teamId,
                OR: [
                    { owner_id: req.user.id },
                    { team_members: { some: { user_id: req.user.id, status: 'active' } } }
                ]
            }
        });
        if (!teamAccess) {
            return res.status(403).json({ error: 'You do not have access to this team' });
        }
        const teamTemplates = await prisma.team_templates.findMany({
            where: { team_id: teamId },
            orderBy: { name: 'asc' },
        });
        res.json({ data: teamTemplates.map((t) => formatTemplate(t)) });
    }
    catch (error) {
        console.error('Error fetching team templates:', error);
        res.status(500).json({ error: 'Failed to fetch team templates' });
    }
});
// POST /api/templates/team/:teamId - Create new team template
templatesRouter.post('/team/:teamId', requireAuth, async (req, res) => {
    try {
        const { teamId } = req.params;
        const { name, category, mode, icon, description, ai_prompt, variables, sections, base_template } = req.body;
        if (!name || !ai_prompt) {
            return res.status(400).json({ error: 'Name and AI prompt are required' });
        }
        // Verify team access
        const teamAccess = await prisma.teams.findFirst({
            where: {
                id: teamId,
                OR: [
                    { owner_id: req.user.id },
                    { team_members: { some: { user_id: req.user.id, status: 'active' } } }
                ]
            }
        });
        if (!teamAccess) {
            return res.status(403).json({ error: 'You do not have access to this team' });
        }
        const newTeamTemplate = await prisma.team_templates.create({
            data: {
                team_id: teamId,
                created_by: req.user.id,
                name,
                category: category || 'general',
                mode: mode || 'general',
                icon: icon || '📝',
                description: description || '',
                ai_prompt,
                variables: variables || [],
                sections: sections || [],
                base_template: base_template || null,
            }
        });
        res.status(201).json({ data: formatTemplate(newTeamTemplate) });
    }
    catch (error) {
        console.error('Error creating team template:', error);
        res.status(500).json({ error: 'Failed to create team template' });
    }
});
// PUT /api/templates/team/:teamId/:templateId - Update team template
templatesRouter.put('/team/:teamId/:templateId', requireAuth, async (req, res) => {
    try {
        const { teamId, templateId } = req.params;
        const { name, category, mode, icon, description, ai_prompt, variables, sections } = req.body;
        // Verify template belongs to team
        const template = await prisma.team_templates.findFirst({
            where: { id: templateId, team_id: teamId },
        });
        if (!template) {
            return res.status(404).json({ error: 'Team template not found' });
        }
        // Verify team access
        const teamAccess = await prisma.teams.findFirst({
            where: {
                id: teamId,
                OR: [
                    { owner_id: req.user.id },
                    { team_members: { some: { user_id: req.user.id, status: 'active' } } }
                ]
            }
        });
        if (!teamAccess) {
            return res.status(403).json({ error: 'You do not have access to this team' });
        }
        const updatedTemplate = await prisma.team_templates.update({
            where: { id: templateId },
            data: {
                name: name || undefined,
                category: category || undefined,
                mode: mode || undefined,
                icon: icon || undefined,
                description: description || undefined,
                ai_prompt: ai_prompt || undefined,
                variables: variables || undefined,
                sections: sections || undefined,
                updated_at: new Date(),
            }
        });
        res.json({ data: formatTemplate(updatedTemplate) });
    }
    catch (error) {
        console.error('Error updating team template:', error);
        res.status(500).json({ error: 'Failed to update team template' });
    }
});
// DELETE /api/templates/team/:teamId/:templateId - Delete team template
templatesRouter.delete('/team/:teamId/:templateId', requireAuth, async (req, res) => {
    try {
        const { teamId, templateId } = req.params;
        // Verify template belongs to team
        const template = await prisma.team_templates.findFirst({
            where: { id: templateId, team_id: teamId },
        });
        if (!template) {
            return res.status(404).json({ error: 'Team template not found' });
        }
        // Verify team access
        const teamAccess = await prisma.teams.findFirst({
            where: {
                id: teamId,
                OR: [
                    { owner_id: req.user.id },
                    { team_members: { some: { user_id: req.user.id, status: 'active' } } }
                ]
            }
        });
        if (!teamAccess) {
            return res.status(403).json({ error: 'You do not have access to this team' });
        }
        await prisma.team_templates.delete({
            where: { id: templateId },
        });
        res.json({ success: true, message: 'Team template deleted' });
    }
    catch (error) {
        console.error('Error deleting team template:', error);
        res.status(500).json({ error: 'Failed to delete team template' });
    }
});
//# sourceMappingURL=templates.js.map