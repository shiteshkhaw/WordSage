import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { Response } from 'express';
import prisma from '../lib/prisma.js';

export const bonusesRouter = Router();

// Grant daily login bonus
// Grant daily login bonus
bonusesRouter.post('/daily', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
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

            // Check if already claimed today via transactions (decoupled from regular user logins)
            const todayStr = new Date().toISOString().split('T')[0];
            const startOfDay = new Date(todayStr + "T00:00:00.000Z");

            const hasClaimedToday = await tx.transactions.findFirst({
                where: {
                    user_id: userId,
                    action: 'daily_login',
                    created_at: { gte: startOfDay }
                }
            });

            if (hasClaimedToday) {
                return { granted: false, message: 'Already claimed today' };
            }

            // Calculate streak based on yesterday's transactions
            const d = new Date(startOfDay);
            d.setUTCDate(d.getUTCDate() - 1);
            const startOfYesterday = d;

            const hasClaimedYesterday = await tx.transactions.findFirst({
                where: {
                    user_id: userId,
                    action: 'daily_login',
                    created_at: { gte: startOfYesterday, lt: startOfDay }
                }
            });

            const newStreak = hasClaimedYesterday ? (profile.daily_streak || 0) + 1 : 1;
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
                    coins_used: -rewardAmount, 
                    details: { type: 'daily_bonus', streak: newStreak },
                },
            });

            // Create persistent notification for the user
            await tx.notifications.create({
                data: {
                    user_id: userId,
                    title: '✨ Daily Login Bonus',
                    message: `${rewardAmount} SkillsCoins credited for logging in today! ${newStreak > 1 ? '• ' + newStreak + '-day streak 🔥' : ''}`,
                    type: 'daily_bonus'
                }
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

    } catch (error: any) {
        console.error('Daily bonus error:', error);
        if (error.message === 'Profile not found') {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.status(500).json({ error: 'Failed to grant daily bonus' });
    }
});

// Grant welcome bonus (one-time)
bonusesRouter.post('/welcome', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;

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
    } catch (error: any) {
        console.error('Welcome bonus error:', error);
        res.status(500).json({ error: 'Failed to grant welcome bonus' });
    }
});
