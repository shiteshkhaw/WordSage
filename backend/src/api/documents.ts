import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { Response } from 'express';
import prisma from '../lib/prisma.js';

export const docsRouter = Router();

// Get all documents for authenticated user
docsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const documents = await prisma.documents.findMany({
            where: { user_id: req.user!.id },
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
                user_id: req.user!.id,
            },
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.json({ data: document });
    } catch (error: any) {
        console.error('Get document error:', error);
        res.status(500).json({ error: 'Failed to fetch document' });
    }
});

// Create document
docsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { title, content, word_count, char_count } = req.body;

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
        const { title, content, word_count, char_count } = req.body;

        const document = await prisma.documents.findFirst({
            where: {
                id: req.params.id,
                user_id: req.user!.id,
            },
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
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
            where: {
                id: req.params.id,
                user_id: req.user!.id,
            },
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
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
