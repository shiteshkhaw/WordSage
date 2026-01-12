import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { Response } from 'express';
import prisma from '../lib/prisma.js';

export const transactionsRouter = Router();

// Get user transactions
transactionsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;

        const transactions = await prisma.transactions.findMany({
            where: { user_id: req.user!.id },
            orderBy: { created_at: 'desc' },
            take: limit,
        });

        res.json({ data: transactions });
    } catch (error: any) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
