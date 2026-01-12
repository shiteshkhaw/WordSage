import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
export const bonusesRouter = Router();
// Grant daily login bonus
bonusesRouter.post('/daily', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];
        // Get profile
        const profile = await prisma.user_profiles.findUnique({
            where: { id: userId },
        });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        // Check if already claimed today
        const lastLoginDate = profile.last_login_date ? new Date(profile.last_login_date).toISOString().split('T')[0] : null;
        if (lastLoginDate === today) {
            return res.json({ granted: false, message: 'Already claimed today' });
        }
        // Calculate streak
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const newStreak = lastLoginDate === yesterday ? (profile.daily_streak || 0) + 1 : 1;
        // Grant 10 coins
        const newBalance = (profile.coins_balance || 0) + 10;
        // Update profile
        await prisma.user_profiles.update({
            where: { id: userId },
            data: {
                coins_balance: newBalance,
                daily_streak: newStreak,
                last_login_date: new Date(today),
            },
        });
        // Log transaction
        await prisma.transactions.create({
            data: {
                user_id: userId,
                action: 'daily_login',
                coins_used: -10,
                details: { type: 'daily_bonus', streak: newStreak },
            },
        });
        res.json({
            granted: true,
            coins: 10,
            streak: newStreak,
            newBalance,
        });
    }
    catch (error) {
        console.error('Daily bonus error:', error);
        res.status(500).json({ error: 'Failed to grant daily bonus' });
    }
});
// Grant welcome bonus (one-time)
bonusesRouter.post('/welcome', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Check if already granted
        const existingBonus = await prisma.transactions.findFirst({
            where: {
                user_id: userId,
                action: 'welcome_bonus',
            },
        });
        if (existingBonus) {
            return res.json({ granted: false, message: 'Already claimed' });
        }
        // Grant 100 coins
        const profile = await prisma.user_profiles.update({
            where: { id: userId },
            data: {
                coins_balance: { increment: 100 },
            },
        });
        // Log transaction
        await prisma.transactions.create({
            data: {
                user_id: userId,
                action: 'welcome_bonus',
                coins_used: -100,
                details: { type: 'welcome' },
            },
        });
        res.json({
            granted: true,
            coins: 100,
            newBalance: profile.coins_balance,
        });
    }
    catch (error) {
        console.error('Welcome bonus error:', error);
        res.status(500).json({ error: 'Failed to grant welcome bonus' });
    }
});
//# sourceMappingURL=bonuses.js.map