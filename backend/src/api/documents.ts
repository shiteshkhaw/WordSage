import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { Response } from 'express';
import prisma from '../lib/prisma.js';

export const docsRouter = Router();

// Get all documents for authenticated user
docsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const activeTeams = await prisma.team_members.findMany({
            where: {
                user_id: req.user!.id,
                status: 'active',
            },
        });
        const teamIds = activeTeams.map((t) => t.team_id);

        const documents = await prisma.documents.findMany({
            where: {
                OR: [
                    { user_id: req.user!.id },
                    ...teamIds.map((teamId) => ({
                        metadata: {
                            path: ['team_id'],
                            equals: teamId,
                        },
                    })),
                ],
            },
            orderBy: { updated_at: 'desc' },
        });

        res.json({ data: documents });
    } catch (error: any) {
        console.error('Get documents error:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

// Get single document
docsRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const document = await prisma.documents.findFirst({
            where: {
                id: req.params.id,
            },
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // If user is owner, allow access
        if (document.user_id === req.user!.id) {
            return res.json({ data: document });
        }

        // Otherwise, check if it's a team document and user is an active team member
        const meta = document.metadata as any;
        if (meta?.team_id) {
            const membership = await prisma.team_members.findFirst({
                where: {
                    team_id: meta.team_id,
                    user_id: req.user!.id,
                    status: 'active',
                },
            });
            if (membership) {
                return res.json({ data: document });
            }
        }

        res.status(404).json({ error: 'Document not found' });
    } catch (error: any) {
        console.error('Get document error:', error);
        res.status(500).json({ error: 'Failed to fetch document' });
    }
});

// Create document
docsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { title, content, word_count, char_count, team_id } = req.body;

        let metadata = {};
        if (team_id) {
            // Check team membership
            const membership = await prisma.team_members.findFirst({
                where: {
                    team_id,
                    user_id: req.user!.id,
                    status: 'active',
                },
            });
            if (!membership) {
                return res.status(403).json({ error: 'You are not an active member of this team' });
            }
            metadata = { team_id };
        }

        // Calculate word count and char count if not provided
        const contentStr = content || '';
        const calculatedWordCount = word_count ?? contentStr.split(/\s+/).filter((w: string) => w.length > 0).length;
        const calculatedCharCount = char_count ?? contentStr.length;

        const document = await prisma.documents.create({
            data: {
                user_id: req.user!.id,
                title: title || 'Untitled Document',
                content: contentStr,
                word_count: calculatedWordCount,
                char_count: calculatedCharCount,
                metadata,
            },
        });

        res.json({ data: document });
    } catch (error: any) {
        console.error('Create document error:', error);
        res.status(500).json({ error: 'Failed to create document' });
    }
});

// Update document
docsRouter.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { title, content, word_count, char_count, team_id } = req.body;

        const document = await prisma.documents.findFirst({
            where: { id: req.params.id },
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Verify write access (owner or active team member)
        let isAuthorized = document.user_id === req.user!.id;
        
        const meta = document.metadata as any;
        if (!isAuthorized && meta?.team_id) {
            const membership = await prisma.team_members.findFirst({
                where: {
                    team_id: meta.team_id,
                    user_id: req.user!.id,
                    status: 'active',
                },
            });
            if (membership) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ error: 'You do not have permission to modify this document' });
        }

        // Check team membership if updating/setting team_id
        let newMetadata = { ...(document.metadata as object) };
        if (team_id) {
            const membership = await prisma.team_members.findFirst({
                where: {
                    team_id,
                    user_id: req.user!.id,
                    status: 'active',
                },
            });
            if (!membership) {
                return res.status(403).json({ error: 'You are not an active member of this team' });
            }
            newMetadata = { ...newMetadata, team_id };
        }

        // Calculate word count and char count if not provided
        const calculatedWordCount = word_count ?? (content ? content.split(/\s+/).filter((w: string) => w.length > 0).length : 0);
        const calculatedCharCount = char_count ?? (content ? content.length : 0);

        const updated = await prisma.documents.update({
            where: { id: req.params.id },
            data: {
                title,
                content,
                word_count: calculatedWordCount,
                char_count: calculatedCharCount,
                metadata: newMetadata,
                updated_at: new Date(),
            },
        });

        res.json({ data: updated });
    } catch (error: any) {
        console.error('Update document error:', error);
        res.status(500).json({ error: 'Failed to update document' });
    }
});

// Delete document
docsRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const document = await prisma.documents.findFirst({
            where: { id: req.params.id },
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Verify delete access (owner or team owner/admin)
        let isAuthorized = document.user_id === req.user!.id;
        
        const meta = document.metadata as any;
        if (!isAuthorized && meta?.team_id) {
            const membership = await prisma.team_members.findFirst({
                where: {
                    team_id: meta.team_id,
                    user_id: req.user!.id,
                    role: { in: ['owner', 'admin'] },
                    status: 'active',
                },
            });
            if (membership) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ error: 'You do not have permission to delete this document' });
        }

        await prisma.documents.delete({
            where: { id: req.params.id },
        });

        res.json({ data: { id: req.params.id } });
    } catch (error: any) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});
