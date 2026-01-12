import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
export const analyticsRouter = Router();
// GET /api/analytics - Get user analytics data
analyticsRouter.get('/', requireAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user.id;
        const now = new Date();
        // Get date range for last 7 days
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        // Get user profile for summary stats
        const profile = await prisma.user_profiles.findUnique({
            where: { id: userId },
        });
        // Get transactions for feature usage breakdown (from coins_transactions)
        const transactions = await prisma.coins_transactions.findMany({
            where: {
                user_id: userId,
                created_at: {
                    gte: weekAgo,
                },
            },
            orderBy: { created_at: 'desc' },
        });
        // Get AI usage analytics for accurate daily stats
        const aiUsageStats = await prisma.ai_usage_analytics.findMany({
            where: {
                user_id: userId,
                created_at: {
                    gte: weekAgo,
                },
            },
            orderBy: { created_at: 'desc' },
        });
        // Get all transactions for feature usage (not just this week)
        const allTransactions = await prisma.coins_transactions.findMany({
            where: {
                user_id: userId,
                transaction_type: 'usage',
            },
        });
        // Calculate daily stats for the last 7 days using ai_usage_analytics
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            // Count AI usage analytics for this day (more accurate than transactions)
            const dayUsage = aiUsageStats.filter((u) => {
                const usageDate = new Date(u.created_at);
                return usageDate >= date && usageDate < nextDate;
            });
            // Calculate words from actual input/output lengths
            const wordsProcessed = dayUsage.reduce((sum, u) => {
                return sum + (u.input_length || 0) + (u.output_length || 0);
            }, 0);
            weeklyData.push({
                day: days[date.getDay()],
                date: date.toISOString().split('T')[0],
                requests: dayUsage.length,
                words: wordsProcessed,
            });
        }
        // Calculate feature usage from transaction descriptions
        const featureMap = {
            'fix_grammar': 0,
            'improve': 0,
            'summarize': 0,
            'rewrite': 0,
            'expand': 0,
            'custom': 0,
            'humanize': 0,
            'bypass_detector': 0,
            'rewrite_unique': 0,
            'plagiarism_check': 0,
        };
        allTransactions.forEach((t) => {
            const description = (t.description || '').toLowerCase();
            if (description.includes('grammar') || description.includes('fix')) {
                featureMap['fix_grammar']++;
            }
            else if (description.includes('improve')) {
                featureMap['improve']++;
            }
            else if (description.includes('summarize') || description.includes('summary')) {
                featureMap['summarize']++;
            }
            else if (description.includes('rewrite') && !description.includes('unique')) {
                featureMap['rewrite']++;
            }
            else if (description.includes('expand')) {
                featureMap['expand']++;
            }
            else if (description.includes('humanize')) {
                featureMap['humanize']++;
            }
            else if (description.includes('bypass') || description.includes('detector')) {
                featureMap['bypass_detector']++;
            }
            else if (description.includes('unique') || description.includes('plagiarism')) {
                featureMap['rewrite_unique']++;
            }
            else {
                featureMap['custom']++;
            }
        });
        // Convert to percentages
        const totalFeatureUsage = Object.values(featureMap).reduce((a, b) => a + b, 0) || 1;
        const featureUsage = [
            { name: 'Fix Grammar', usage: Math.round((featureMap['fix_grammar'] / totalFeatureUsage) * 100), count: featureMap['fix_grammar'] },
            { name: 'Improve Writing', usage: Math.round((featureMap['improve'] / totalFeatureUsage) * 100), count: featureMap['improve'] },
            { name: 'Summarize', usage: Math.round((featureMap['summarize'] / totalFeatureUsage) * 100), count: featureMap['summarize'] },
            { name: 'Rewrite', usage: Math.round((featureMap['rewrite'] / totalFeatureUsage) * 100), count: featureMap['rewrite'] },
            { name: 'Expand', usage: Math.round((featureMap['expand'] / totalFeatureUsage) * 100), count: featureMap['expand'] },
            { name: 'Humanize', usage: Math.round((featureMap['humanize'] / totalFeatureUsage) * 100), count: featureMap['humanize'] },
            { name: 'AI Bypass', usage: Math.round((featureMap['bypass_detector'] / totalFeatureUsage) * 100), count: featureMap['bypass_detector'] },
            { name: 'Custom', usage: Math.round((featureMap['custom'] / totalFeatureUsage) * 100), count: featureMap['custom'] },
        ].filter(f => f.count > 0).sort((a, b) => b.usage - a.usage);
        // Calculate insights
        const thisWeekRequests = transactions.filter((t) => t.transaction_type === 'usage').length;
        const lastWeekStart = new Date(weekAgo);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekTransactions = await prisma.coins_transactions.findMany({
            where: {
                user_id: userId,
                transaction_type: 'usage',
                created_at: {
                    gte: lastWeekStart,
                    lt: weekAgo,
                },
            },
        });
        const lastWeekRequests = lastWeekTransactions.length || 1;
        const weeklyGrowth = Math.round(((thisWeekRequests - lastWeekRequests) / lastWeekRequests) * 100);
        // Find peak day
        const peakDay = weeklyData.reduce((max, day) => day.requests > max.requests ? day : max, weeklyData[0]);
        // Find most used feature
        const mostUsedFeature = featureUsage.length > 0 ? featureUsage[0].name : 'None yet';
        // Generate AI insights
        const insights = [
            {
                title: 'Weekly Activity',
                value: weeklyGrowth > 0 ? `+${weeklyGrowth}%` : `${weeklyGrowth}%`,
                insight: weeklyGrowth > 0
                    ? 'Your usage increased this week. Great momentum!'
                    : weeklyGrowth < 0
                        ? 'Your usage decreased this week. Try to write more consistently.'
                        : 'Your usage is consistent with last week.',
                icon: weeklyGrowth >= 0 ? '📈' : '📉',
            },
            {
                title: 'Most Used Feature',
                value: mostUsedFeature,
                insight: `You use "${mostUsedFeature}" most frequently. Try exploring other features for variety.`,
                icon: '🎯',
            },
            {
                title: 'Peak Activity Day',
                value: peakDay?.day || 'N/A',
                insight: peakDay?.requests > 0
                    ? `You're most productive on ${peakDay.day}s with ${peakDay.requests} requests.`
                    : 'Start using AI features to see your peak days.',
                icon: '⏰',
            },
            {
                title: 'Total Words Enhanced',
                value: `${(profile?.words_processed || 0).toLocaleString()}`,
                insight: profile?.words_processed && profile.words_processed > 1000
                    ? 'Impressive! You\'ve processed over 1,000 words.'
                    : 'Keep writing to see your word count grow!',
                icon: '📝',
            },
        ];
        res.json({
            data: {
                summary: {
                    totalRequests: profile?.total_ai_requests || 0,
                    wordsProcessed: profile?.words_processed || 0,
                    dailyStreak: profile?.daily_streak || 0,
                    coinsBalance: profile?.coins_balance || 0,
                },
                weeklyData,
                featureUsage,
                insights,
                weeklyGrowth,
                peakDay: peakDay?.day || null,
                mostUsedFeature,
            },
        });
    }
    catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
//# sourceMappingURL=analytics.js.map