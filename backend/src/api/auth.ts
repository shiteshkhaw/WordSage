import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

export const authRouter = Router();

// Existing /user endpoint
authRouter.get('/user', async (req, res: Response) => {
  try {
    // This would be called with NextAuth session token in Authorization header
    // For now, return a simple response
    res.json({
      success: true,
      message: 'Use NextAuth session for user data',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Verify credentials (for Credentials provider)
authRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user by email
    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        full_name: true,
        avatar_url: true,
        password: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    if (user.password) {
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      // If user has no password (e.g. OAuth only), deny password login
      // Or obscure the reason for security "Invalid credentials"
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json(user);
  } catch (error: any) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// OAuth user creation/lookup (for Google/GitHub)
authRouter.post('/oauth', async (req: Request, res: Response) => {
  try {
    const { email, name, image, provider } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    let user = await prisma.users.findUnique({
      where: { email },
    });

    // If user doesn't exist, create them
    if (!user) {
      user = await prisma.users.create({
        data: {
          email,
          full_name: name || email.split('@')[0],
          avatar_url: image || null,
          subscription_tier: 'free',
          coin_balance: 0,
          onboarding_completed: false,
          preferences: {},
        },
      });

      // Create user profile
      await prisma.user_profiles.create({
        data: {
          id: user.id,
          coins_balance: 100, // Welcome bonus
          total_ai_requests: 0,
          words_processed: 0,
          daily_streak: 0,
          last_login_date: new Date(),
        },
      });

      // Grant welcome bonus transaction
      await prisma.transactions.create({
        data: {
          user_id: user.id,
          action: 'welcome_bonus',
          coins_used: -100,
          details: { type: 'oauth_signup', provider },
        },
      });

      console.log(`✅ Created new OAuth user: ${email} (${provider})`);
    } else {
      // Update last login
      await prisma.user_profiles.update({
        where: { id: user.id },
        data: { last_login_date: new Date() },
      });
    }

    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
    });
  } catch (error: any) {
    console.error('OAuth user creation error:', error);
    res.status(500).json({ error: 'Failed to create/find user' });
  }
});

// /signup endpoint for user registration
authRouter.post('/signup', async (req, res: Response) => {
  try {
    const { email, password, fullName, country, currency } = req.body;

    // Validation
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existing = await prisma.users.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        full_name: fullName,
        coin_balance: 100,
      },
    });

    // Create user profile separately
    await prisma.user_profiles.create({
      data: {
        id: user.id,
        coins_balance: 100,
      },
    });

    res.json({
      success: true,
      userId: user.id,
      message: 'Account created successfully!',
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Failed to create account',
    });
  }
});
