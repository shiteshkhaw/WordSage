import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
export const profileRouter = Router();
// Generate random referral code
function generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
// Get user profile
profileRouter.get('/', requireAuth, async (req, res) => {
    try {
        const userProfile = await prisma.users.findUnique({
            where: { id: req.user.id },
            include: {
                user_profiles: true,
            },
        });
        if (!userProfile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        // Auto-generate referral code if user doesn't have one
        let referralCode = userProfile.user_profiles?.referral_code;
        if (!referralCode && userProfile.user_profiles) {
            referralCode = generateReferralCode();
            // Update user_profiles with the new referral code
            await prisma.user_profiles.update({
                where: { id: req.user.id },
                data: { referral_code: referralCode },
            });
        }
        res.json({
            data: {
                id: userProfile.id,
                email: userProfile.email,
                full_name: userProfile.full_name,
                avatar_url: userProfile.avatar_url,
                // Prefer user_profiles subscription_tier (updated by webhooks), fallback to users table
                subscription_tier: userProfile.user_profiles?.subscription_tier || userProfile.subscription_tier || 'free',
                coin_balance: userProfile.coin_balance,
                coins_balance: userProfile.user_profiles?.coins_balance || 0,
                total_ai_requests: userProfile.user_profiles?.total_ai_requests || 0,
                words_processed: userProfile.user_profiles?.words_processed || 0,
                daily_streak: userProfile.user_profiles?.daily_streak || 0,
                // Referral fields from user_profiles
                referral_code: referralCode || '',
                total_referrals: userProfile.user_profiles?.total_referrals || 0,
            },
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
// Update user profile
profileRouter.put('/', requireAuth, async (req, res) => {
    try {
        const { full_name, avatar_url } = req.body;
        const updated = await prisma.users.update({
            where: { id: req.user.id },
            data: {
                full_name,
                avatar_url,
            },
        });
        res.json({ data: updated });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// Get user analytics
profileRouter.get('/analytics', requireAuth, async (req, res) => {
    try {
        const analytics = await prisma.ai_usage_analytics.findMany({
            where: { user_id: req.user.id },
            orderBy: { created_at: 'desc' },
            take: 100,
        });
        res.json({ data: analytics });
    }
    catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
//# sourceMappingURL=profile.js.map