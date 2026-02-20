import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
export const bonusesRouter = Router();
// Grant daily login bonus
// Grant daily login bonus
bonusesRouter.post('/daily', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Use UTC date string for consistency
        const today = new Date().toISOString().split('T')[0];
        // Start a transaction to ensure data integrity
        const result = await prisma.$transaction(async (tx) => {
            // Get profile within transaction
            const profile = await tx.user_profiles.findUnique({
                where: { id: userId },
            });
            if (!profile) {
                throw new Error('Profile not found');
            }
            // Check if already claimed today
            const lastLoginDate = profile.last_login_date
                ? new Date(profile.last_login_date).toISOString().split('T')[0]
                : null;
            if (lastLoginDate === today) {
                return { granted: false, message: 'Already claimed today' };
            }
            // Calculate streak - Robust "calendar yesterday" calculation
            const d = new Date();
            d.setDate(d.getDate() - 1); // Native date subtraction handles month/year boundaries
            const yesterday = d.toISOString().split('T')[0];
            // If last login was yesterday, increment. Otherwise reset to 1.
            const newStreak = lastLoginDate === yesterday ? (profile.daily_streak || 0) + 1 : 1;
            const rewardAmount = 10;
            const newBalance = (profile.coins_balance || 0) + rewardAmount;
            // Update profile
            await tx.user_profiles.update({
                where: { id: userId },
                data: {
                    coins_balance: newBalance,
                    daily_streak: newStreak,
                    last_login_date: new Date(), // Store full timestamp
                },
            });
            // Log transaction
            await tx.transactions.create({
                data: {
                    user_id: userId,
                    action: 'daily_login',
                    coins_used: -rewardAmount, // Negative because it's "used" field (legacy conventions?) or usually "amount"? 
                    // Looking at schema: coins_used Int. 
                    // Usually negative means cost, positive means gain? 
                    // Let's check other log: welcome_bonus was -100.
                    // Wait, usually "coins_used" implies deduction. But this is a gain.
                    // If welcome_bonus is -100, then valid logic is: balance = balance - used.
                    // So balance = balance - (-100) = balance + 100. Correct.
                    details: { type: 'daily_bonus', streak: newStreak },
                },
            });
            return {
                granted: true,
                coins: rewardAmount,
                streak: newStreak,
                newBalance,
            };
        });
        if ('error' in result) {
            return res.status(404).json(result); // Profile not found case
        }
        res.json(result);
    }
    catch (error) {
        console.error('Daily bonus error:', error);
        if (error.message === 'Profile not found') {
            return res.status(404).json({ error: 'Profile not found' });
        }
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