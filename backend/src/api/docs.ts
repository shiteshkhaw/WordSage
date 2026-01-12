import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { Response } from 'express';
import prisma from '../lib/prisma.js';

export const docsRouter = Router();

const updateDocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  is_public: z.boolean().optional(),
});

// GET all documents
docsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = await prisma.documents.findMany({
      where: { user_id: req.user.id },
      orderBy: { updated_at: 'desc' },
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch documents',
    });
  }
});

// POST create document
docsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, content } = req.body;

    const data = await prisma.documents.create({
      data: {
        user_id: req.user.id,
        title: title || 'Untitled Document',
        content: content || '',
      },
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create document',
    });
  }
});

// GET single document
docsRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const data = await prisma.documents.findUnique({
      where: { id },
    });

    if (!data) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (data.user_id !== req.user.id && !data.is_public) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch document',
    });
  }
});

// PUT update document
docsRouter.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const body = updateDocSchema.parse(req.body);

    const document = await prisma.documents.findUnique({
      where: { id },
      select: { user_id: true },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) {
      updateData.content = body.content;
      updateData.word_count = body.content.split(/\s+/).filter((w) => w.length > 0).length;
      updateData.char_count = body.content.length;
    }
    if (body.is_public !== undefined) updateData.is_public = body.is_public;

    const data = await prisma.documents.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update document',
    });
  }
});

// DELETE document
docsRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    await prisma.documents.delete({
      where: {
        id,
        user_id: req.user.id, // Ensures user can only delete their own documents
      },
    });

    res.json({ success: true, message: 'Document deleted' });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete document',
    });
  }
});
