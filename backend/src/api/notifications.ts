import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

export const notificationsRouter = Router();

// GET /api/notifications - Get all user notifications
notificationsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const notifications = await prisma.notifications.findMany({
            where: { user_id: req.user!.id },
            orderBy: { created_at: 'desc' },
            take: 50
        });
        
        res.json({ data: notifications });
    } catch (error: any) {
        console.error('Fetch notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// POST /api/notifications/:id/read - Mark single notification as read/clear it
notificationsRouter.post('/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        // We delete it entirely from the database to "clear" it
        await prisma.notifications.delete({
            where: { id: id, user_id: req.user!.id }
        });
        
        res.json({ success: true });
    } catch (error: any) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Failed to mark notification read' });
    }
});

// DELETE /api/notifications/all - Clear all notifications
notificationsRouter.delete('/all', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        await prisma.notifications.deleteMany({
            where: { user_id: req.user!.id }
        });
        
        res.json({ success: true });
    } catch (error: any) {
        console.error('Clear notifications error:', error);
        res.status(500).json({ error: 'Failed to clear all notifications' });
    }
});
