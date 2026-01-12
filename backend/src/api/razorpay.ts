import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { Response } from 'express';
import prisma from '../lib/prisma.js';

export const razorpayRouter = Router();

// POST /api/razorpay/create-subscription
razorpayRouter.post('/create-subscription', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Fetch user profile
    const profile = await prisma.user_profiles.findUnique({
      where: { id: req.user.id },
      select: { razorpay_subscription_id: true, subscription_tier: true },
    });

    if (!profile) {
      // Create profile if doesn't exist
      const newProfile = await prisma.user_profiles.create({
        data: {
          id: req.user.id,
          coins_balance: 100,
          subscription_tier: 'free',
        },
      });

      return handleSubscriptionCreation(newProfile, req.user, planId, razorpay, prisma, res);
    }

    if (profile.subscription_tier !== 'free') {
      return res.status(400).json({
        error: `You already have an active ${profile.subscription_tier} subscription.`,
      });
    }

    return handleSubscriptionCreation(profile, req.user, planId, razorpay, prisma, res);
  } catch (error: any) {
    console.error('Subscription creation error:', error);
    res.status(500).json({
      error: 'Server error: ' + (error.message || 'Unknown error'),
    });
  }
});

async function handleSubscriptionCreation(
  profile: any,
  user: any,
  planId: string,
  razorpay: any,
  prisma: any,
  res: Response
) {
  try {
    let customerId = profile.razorpay_subscription_id;

    // Create Razorpay customer if doesn't exist
    if (!customerId) {
      const customer = await razorpay.customers.create({
        email: user.email!,
        name: user.email!,
        notes: {
          user_id: user.id,
          created_at: new Date().toISOString(),
        },
      });

      customerId = customer.id;

      await prisma.user_profiles.update({
        where: { id: user.id },
        data: { razorpay_subscription_id: customerId },
      });
    }

    // Create subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_id: customerId,
      quantity: 1,
      total_count: 12,
      customer_notify: 1,
      notes: {
        user_id: user.id,
        user_email: user.email!,
        created_from: 'web_app',
      },
    });

    // Save subscription to database
    const planName = planId.toLowerCase().includes('team') ? 'Team' : 'Pro';

    await prisma.subscriptions.create({
      data: {
        user_id: user.id,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        plan_name: planName,
        status: subscription.status,
        current_period_start: new Date(subscription.start_at * 1000),
        current_period_end: subscription.end_at ? new Date(subscription.end_at * 1000) : null,
      },
    });

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan_id: subscription.plan_id,
      },
    });
  } catch (error: any) {
    console.error('Subscription handler error:', error);
    res.status(500).json({
      error: 'Failed to create subscription',
      details: error.error?.description || error.message,
    });
  }
}

// POST /api/razorpay/webhook
// Note: Raw body parser is applied in index.ts before this route
razorpayRouter.post('/webhook', async (req: any, res: Response) => {
  try {
    const body = req.body.toString();
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(body);

    console.log('Webhook received:', event.event);

    switch (event.event) {
      case 'subscription.activated': {
        const subscription = event.payload.subscription.entity;
        const userId = subscription.notes?.user_id;

        if (!userId) break;

        const planId = subscription.plan_id;
        let tier = 'pro';
        let coins = 1000;

        if (planId.toLowerCase().includes('team')) {
          tier = 'team';
          coins = 5000;
        }

        // Update user_profiles
        await prisma.user_profiles.update({
          where: { id: userId },
          data: {
            subscription_tier: tier,
            razorpay_subscription_id: subscription.id,
            coins_balance: coins,
          },
        });

        // ALSO update users table to keep in sync
        await prisma.users.update({
          where: { id: userId },
          data: {
            subscription_tier: tier,
            coin_balance: coins,
          },
        });

        await prisma.subscriptions.update({
          where: { stripe_subscription_id: subscription.id },
          data: { status: 'active' },
        });

        console.log(`Subscription activated for user ${userId}: ${tier}`);
        break;
      }

      case 'subscription.charged': {
        const payment = event.payload.payment.entity;
        const subscription = event.payload.subscription.entity;

        const sub = await prisma.subscriptions.findUnique({
          where: { stripe_subscription_id: subscription.id },
          select: { user_id: true },
        });

        if (sub && payment.status === 'captured') {
          const tier = subscription.plan_id.toLowerCase().includes('team') ? 'team' : 'pro';
          const coins = tier === 'team' ? 5000 : 1000;

          await prisma.user_profiles.update({
            where: { id: sub.user_id },
            data: { coins_balance: coins },
          });
        }
        break;
      }

      case 'subscription.cancelled':
      case 'subscription.halted': {
        const subscription = event.payload.subscription.entity;

        const sub = await prisma.subscriptions.findUnique({
          where: { stripe_subscription_id: subscription.id },
          select: { user_id: true },
        });

        if (sub) {
          // Update user_profiles
          await prisma.user_profiles.update({
            where: { id: sub.user_id },
            data: {
              subscription_tier: 'free',
              coins_balance: 100,
            },
          });

          // ALSO update users table to keep in sync
          await prisma.users.update({
            where: { id: sub.user_id },
            data: {
              subscription_tier: 'free',
              coin_balance: 100,
            },
          });

          await prisma.subscriptions.update({
            where: { stripe_subscription_id: subscription.id },
            data: { status: 'canceled' },
          });

          console.log(`Subscription cancelled for user ${sub.user_id}`);
        }
        break;
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity;

        if (!payment.subscription_id) break;

        const sub = await prisma.subscriptions.findUnique({
          where: { stripe_subscription_id: payment.subscription_id },
          select: { user_id: true },
        });

        if (sub) {
          // Could add notification logic here
        }
        break;
      }

      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.json({ received: true, event: event.event });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    res.status(500).json({
      error: 'Webhook handler failed',
      details: error.message,
    });
  }
});
