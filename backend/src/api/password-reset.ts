import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { isDisposableEmail } from '../lib/disposable-emails.js';
import { sendPasswordResetEmail } from '../emails/sendPasswordResetEmail.js';

export const passwordResetRouter = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const TOKEN_EXPIRY_MINUTES = 15;

/**
 * Validate password strength
 * Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
 */
function validatePassword(password: string): { valid: boolean; message: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true, message: '' };
}

/**
 * POST /api/password-reset/request
 * 
 * Accepts { email }. Validates format, blocks disposable domains,
 * generates a secure token, stores it, and sends a reset email.
 * 
 * SECURITY: Always returns a generic success message to prevent
 * email enumeration attacks.
 */
passwordResetRouter.post('/request', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Basic validation
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Block disposable/temporary emails
    if (isDisposableEmail(normalizedEmail)) {
      return res.status(400).json({
        error: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.',
      });
    }

    // Generic success message (always returned to prevent email enumeration)
    const genericSuccess = {
      success: true,
      message: 'If an account with that email exists, we\'ve sent a password reset link. Please check your inbox and spam folder.',
    };

    // Check if user exists (silently fail if not)
    const user = await prisma.users.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, password: true },
    });

    if (!user) {
      console.log(`🔍 Password reset requested for non-existent email: ${normalizedEmail}`);
      // Don't reveal that the email doesn't exist
      return res.json(genericSuccess);
    }

    // Note: We allow OAuth-only users to set a password via this flow.
    // Proving they own the email is sufficient verification.

    // Invalidate any existing unused tokens for this email
    await prisma.password_reset_tokens.updateMany({
      where: {
        email: normalizedEmail,
        used: false,
      },
      data: { used: true },
    });

    // Generate a cryptographically secure token
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    // Store the token
    await prisma.password_reset_tokens.create({
      data: {
        email: normalizedEmail,
        token,
        expires_at: expiresAt,
      },
    });

    // Build the reset URL
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

    // Send the email
    try {
      const emailResult = await sendPasswordResetEmail(normalizedEmail, resetUrl);
      if (emailResult.error) {
        console.error('❌ Resend API Error:', emailResult.error);
      } else {
        console.log(`📧 Password reset email sent successfully to: ${normalizedEmail}. ID: ${emailResult.data?.id}`);
      }
    } catch (emailError) {
      console.error('💥 Unexpected error sending password reset email:', emailError);
      // Don't expose email sending failures to the user
    }

    return res.json(genericSuccess);
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ error: 'An error occurred. Please try again later.' });
  }
});

/**
 * POST /api/password-reset/verify
 * 
 * Accepts { token }. Returns whether the token is valid and not expired.
 * Used by the frontend to decide whether to show the reset form or an error.
 */
passwordResetRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ valid: false, error: 'Token is required' });
    }

    const resetToken = await prisma.password_reset_tokens.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return res.status(400).json({ valid: false, error: 'Invalid or expired reset link' });
    }

    if (resetToken.used) {
      return res.status(400).json({ valid: false, error: 'This reset link has already been used' });
    }

    if (new Date() > resetToken.expires_at) {
      return res.status(400).json({ valid: false, error: 'This reset link has expired. Please request a new one.' });
    }

    return res.json({ valid: true, email: resetToken.email });
  } catch (error: any) {
    console.error('Token verify error:', error);
    return res.status(500).json({ valid: false, error: 'An error occurred. Please try again.' });
  }
});

/**
 * POST /api/password-reset/reset
 * 
 * Accepts { token, password }. Validates password strength, verifies the token,
 * hashes the new password, updates the user, and marks the token as used.
 */
passwordResetRouter.post('/reset', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Validate password strength
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: passwordCheck.message });
    }

    // Find and validate the token
    const resetToken = await prisma.password_reset_tokens.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    if (resetToken.used) {
      return res.status(400).json({ error: 'This reset link has already been used' });
    }

    if (new Date() > resetToken.expires_at) {
      // Mark as used so it can't be retried
      await prisma.password_reset_tokens.update({
        where: { id: resetToken.id },
        data: { used: true },
      });
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update the user's password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.users.update({
        where: { email: resetToken.email },
        data: {
          password: hashedPassword,
          updated_at: new Date(),
        },
      }),
      prisma.password_reset_tokens.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    console.log(`🔒 Password reset successful for: ${resetToken.email}`);

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (error: any) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'An error occurred. Please try again later.' });
  }
});
