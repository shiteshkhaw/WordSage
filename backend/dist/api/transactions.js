import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
export const transactionsRouter = Router();
// Get user transactions
transactionsRouter.get('/', requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const transactions = await prisma.transactions.findMany({
            where: { user_id: req.user.id },
            orderBy: { created_at: 'desc' },
            take: limit,
        });
        res.json({ data: transactions });
    }
    catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
//# sourceMappingURL=transactions.js.map