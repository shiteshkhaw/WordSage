import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { razorpay } from '../services/razorpay.js';
import prisma from '../lib/prisma.js';
export const paymentRouter = Router();
// POST /api/payment/create-coin-order
paymentRouter.post('/create-coin-order', requireAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { packageId, packageName, coins, amount } = req.body;
        if (!packageId || !packageName || !coins || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({ error: 'Payment service not configured' });
        }
        const order = await razorpay.orders.create({
            amount: amount * 100, // Convert to paise
            currency: 'INR',
            receipt: `coin_${packageId}_${Date.now()}`,
            notes: {
                user_id: req.user.id,
                email: req.user.email || '',
                package_id: packageId,
                package_name: packageName,
                coins: coins.toString(),
            },
        });
        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            packageName,
            coins,
        });
    }
    catch (error) {
        console.error('Coin order creation error:', error);
        res.status(500).json({
            error: error.error?.description || error.message || 'Failed to create order',
        });
    }
});
// POST /api/payment/verify-coin-payment
paymentRouter.post('/verify-coin-payment', requireAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId, coins, } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !coins) {
            return res.status(400).json({ error: 'Missing payment data' });
        }
        if (!process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({ error: 'Payment verification not configured' });
        }
        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }
        // Get current balance
        const profile = await prisma.user_profiles.findUnique({
            where: { id: req.user.id },
            select: { coins_balance: true },
        });
        const newBalance = (profile?.coins_balance || 0) + coins;
        // Update coins balance
        await prisma.user_profiles.update({
            where: { id: req.user.id },
            data: { coins_balance: newBalance },
        });
        // Log transaction
        await prisma.transactions.create({
            data: {
                user_id: req.user.id,
                action: `coin_purchase_${packageId}`,
                coins_used: -coins, // Negative means credit
                details: {
                    type: 'coin_purchase',
                    package_id: packageId,
                    order_id: razorpay_order_id,
                    payment_id: razorpay_payment_id,
                },
            },
        });
        res.json({
            success: true,
            message: 'Coins added successfully',
            coinsAdded: coins,
            newBalance,
        });
    }
    catch (error) {
        console.error('Coin payment verification error:', error);
        res.status(500).json({
            error: error.message || 'Payment verification failed',
        });
    }
});
// POST /api/payment/create-subscription-order
paymentRouter.post('/create-subscription-order', requireAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { planName, amount } = req.body;
        if (!planName || !amount) {
            return res.status(400).json({ error: 'planName and amount required' });
        }
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({ error: 'Razorpay keys missing' });
        }
        // Create plan
        const plan = await razorpay.plans.create({
            period: 'monthly',
            interval: 1,
            item: {
                name: `${planName} Plan`,
                amount: amount * 100, // in paise
                currency: 'INR',
            },
            notes: {
                user_id: req.user.id,
                plan_name: planName,
            },
        });
        // Create subscription
        const subscription = await razorpay.subscriptions.create({
            plan_id: plan.id,
            customer_notify: 1,
            total_count: 12,
            notes: {
                user_id: req.user.id,
                email: req.user.email || '',
                plan_name: planName,
            },
        });
        res.json({
            success: true,
            subscriptionId: subscription.id,
            planId: plan.id,
        });
    }
    catch (error) {
        console.error('Subscription creation error:', error);
        const err = error.error || error;
        res.status(500).json({
            error: err.description || err.message || 'Razorpay subscription failed',
        });
    }
});
// POST /api/payment/verify-subscription
paymentRouter.post('/verify-subscription', requireAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, planName, } = req.body;
        if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment verification data' });
        }
        if (!process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({ error: 'Payment verification not configured' });
        }
        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
            .digest('hex');
        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }
        // Determine tier and coins
        let tier = 'free';
        let coinsToAdd = 0;
        if (planName.toLowerCase().includes('pro')) {
            tier = 'pro';
            coinsToAdd = 1000;
        }
        else if (planName.toLowerCase().includes('team')) {
            tier = 'team';
            coinsToAdd = 5000;
        }
        // Get current balance
        const profile = await prisma.user_profiles.findUnique({
            where: { id: req.user.id },
            select: { coins_balance: true },
        });
        const newBalance = (profile?.coins_balance || 0) + coinsToAdd;
        // Update user_profiles table
        await prisma.user_profiles.update({
            where: { id: req.user.id },
            data: {
                subscription_tier: tier,
                coins_balance: newBalance,
                razorpay_subscription_id: razorpay_subscription_id,
            },
        });
        // ALSO update users table to keep in sync
        await prisma.users.update({
            where: { id: req.user.id },
            data: {
                subscription_tier: tier,
                coin_balance: newBalance,
            },
        });
        // Log transaction
        await prisma.transactions.create({
            data: {
                user_id: req.user.id,
                action: `subscription_${tier}`,
                coins_used: -coinsToAdd,
                details: {
                    type: 'subscription',
                    plan: planName,
                    payment_id: razorpay_payment_id,
                    subscription_id: razorpay_subscription_id,
                },
            },
        });
        console.log(`Subscription verified for user ${req.user.id}: ${tier}`);
        res.json({
            success: true,
            message: 'Subscription activated successfully',
            tier,
            coinsAdded: coinsToAdd,
            newBalance,
        });
    }
    catch (error) {
        console.error('Subscription verification error:', error);
        res.status(500).json({
            error: error.message || 'Payment verification failed',
        });
    }
});
//# sourceMappingURL=payment.js.map