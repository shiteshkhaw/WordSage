import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { Response } from 'express';
import { processAIRequest, processAdvancedAIRequest } from '../services/ai.js';
import { processTeamAwareAI, checkStyleViolations, getTeamContentSuggestions } from '../services/team-ai.js';
import prisma from '../lib/prisma.js';

export const aiRouter = Router();

/**
 * Normalize AI response to extract text content safely.
 * Handles various response formats: string, { result }, { content }, { text }, etc.
 */
function normalizeAIResponse(response: unknown): { result: string; mode?: string } {
  // Handle undefined/null
  if (!response) {
    throw new Error('AI returned empty response');
  }

  // Handle string response
  if (typeof response === 'string') {
    return { result: response };
  }

  // Handle object response
  if (typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    const text = obj.result || obj.content || obj.text;

    if (typeof text === 'string' && text.trim()) {
      return {
        result: text,
        mode: typeof obj.mode === 'string' ? obj.mode : undefined,
      };
    }
  }

  throw new Error('AI returned invalid response format');
}

// POST /api/ai/process - Regular AI processing (no team)
aiRouter.post('/process', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action, text, tone, mode, customPrompt } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const profile = await prisma.user_profiles.findUnique({
      where: { id: req.user.id },
      select: { coins_balance: true, total_ai_requests: true, words_processed: true },
    });

    const coinsRequired = action === 'fix_grammar' ? 5 :
      action === 'improve' ? 10 :
        action === 'rewrite' ? 15 :
          action === 'summarize' ? 8 :
            action === 'expand' ? 15 :
              action === 'custom' ? 20 : 10;

    if (!profile || profile.coins_balance < coinsRequired) {
      return res.status(402).json({
        error: `Insufficient coins. Need ${coinsRequired} coins.`,
      });
    }

    const rawResult = await processAIRequest(action, text, tone, mode, customPrompt);
    const normalizedResult = normalizeAIResponse(rawResult);

    const newBalance = profile.coins_balance - coinsRequired;
    const newTotalRequests = (profile.total_ai_requests || 0) + 1;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const newWordsProcessed = (profile.words_processed || 0) + wordCount;

    await prisma.user_profiles.update({
      where: { id: req.user.id },
      data: {
        coins_balance: newBalance,
        total_ai_requests: newTotalRequests,
        words_processed: newWordsProcessed
      },
    });

    await prisma.transactions.create({
      data: {
        user_id: req.user.id,
        action: `${action}_${mode || 'general'}`,
        coins_used: coinsRequired,
        details: {
          action,
          mode: mode || 'general',
          text_length: text.length,
          word_count: wordCount,
          tone: tone || 'default',
        },
      },
    });

    // Log to ai_usage_analytics for accurate daily stats
    const outputLength = normalizedResult.result?.length || 0;
    await prisma.ai_usage_analytics.create({
      data: {
        user_id: req.user.id,
        action_type: action,
        input_length: text.length,
        output_length: outputLength,
        coins_spent: coinsRequired,
      },
    });

    res.json({
      result: normalizedResult.result,
      coinsUsed: coinsRequired,
      remainingCoins: newBalance,
      mode: normalizedResult.mode || mode || 'general',
    });
  } catch (error: any) {
    console.error('AI Process Error:', error);
    res.status(500).json({
      error: error.message || 'AI processing failed',
    });
  }
});

// POST /api/ai/advanced - Advanced AI features
aiRouter.post('/advanced', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action, text, citationStyle } = req.body;

    if (!text || !action) {
      return res.status(400).json({
        error: 'Text and action are required',
      });
    }

    const profile = await prisma.user_profiles.findUnique({
      where: { id: req.user.id },
      select: { coins_balance: true, total_ai_requests: true, words_processed: true },
    });

    const coinsRequired = action === 'plagiarism_check' ? 30 :
      action === 'rewrite_unique' ? 25 :
        action === 'humanize' ? 20 :
          action === 'bypass_detector' ? 20 :
            action === 'generate_citation' ? 10 : 20;

    if (!profile || profile.coins_balance < coinsRequired) {
      return res.status(402).json({
        error: `Insufficient coins. Need ${coinsRequired} coins.`,
      });
    }

    const rawResult = await processAdvancedAIRequest(
      action,
      text,
      { citationStyle }
    );
    const normalizedResult = normalizeAIResponse(rawResult);

    const newBalance = profile.coins_balance - coinsRequired;
    const newTotalRequests = (profile.total_ai_requests || 0) + 1;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const newWordsProcessed = (profile.words_processed || 0) + wordCount;

    await prisma.user_profiles.update({
      where: { id: req.user.id },
      data: {
        coins_balance: newBalance,
        total_ai_requests: newTotalRequests,
        words_processed: newWordsProcessed
      },
    });

    await prisma.transactions.create({
      data: {
        user_id: req.user.id,
        action: action,
        coins_used: coinsRequired,
        details: {
          action,
          text_length: text.length,
          word_count: wordCount,
        },
      },
    });

    // Log to ai_usage_analytics for accurate daily stats
    const outputLength = normalizedResult.result?.length || 0;
    await prisma.ai_usage_analytics.create({
      data: {
        user_id: req.user.id,
        action_type: action,
        input_length: text.length,
        output_length: outputLength,
        coins_spent: coinsRequired,
      },
    });

    res.json({
      success: true,
      result: normalizedResult.result,
      coinsUsed: coinsRequired,
      remainingCoins: newBalance,
    });
  } catch (error: any) {
    console.error('Advanced AI Error:', error);
    res.status(500).json({
      error: error.message || 'Processing failed',
    });
  }
});

// ========================================
// 🎨 NEW: TEAM-AWARE AI ENDPOINTS
// ========================================

// POST /api/ai/team-process - Process AI request with team style guide
aiRouter.post('/team-process', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log('🎨 POST /api/ai/team-process - Team-aware AI request');

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action, text, teamId, tone, mode, customPrompt } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required for team-aware processing' });
    }

    console.log(`📝 Action: ${action}, Team: ${teamId}, Mode: ${mode || 'general'}`);
    console.log(`📏 Text length: ${text.length} characters`);

    // Check if user has access to this team
    const teamAccess = await prisma.teams.findFirst({
      where: {
        id: teamId,
        owner_id: req.user.id,
      },
    });

    if (!teamAccess) {
      const memberAccess = await prisma.team_members.findFirst({
        where: {
          team_id: teamId,
          user_id: req.user.id,
          status: 'active',
        },
      });

      if (!memberAccess) {
        return res.status(403).json({ error: 'You do not have access to this team' });
      }
    }

    // Check user's coin balance
    const profile = await prisma.user_profiles.findUnique({
      where: { id: req.user.id },
      select: { coins_balance: true, total_ai_requests: true, words_processed: true },
    });

    const coinsRequired = action === 'fix_grammar' ? 5 :
      action === 'improve' ? 10 :
        action === 'rewrite' ? 15 :
          action === 'summarize' ? 8 :
            action === 'expand' ? 12 :
              10;

    if (!profile || profile.coins_balance < coinsRequired) {
      return res.status(402).json({
        error: 'Insufficient coins',
        required: coinsRequired,
        current: profile?.coins_balance || 0
      });
    }

    console.log(`💰 Coins: ${profile.coins_balance} (requires ${coinsRequired})`);

    // Process with team-aware AI
    const result = await processTeamAwareAI(
      action,
      text,
      teamId,
      req.user.id,
      prisma,
      mode,
      tone,
      customPrompt
    );

    // Count words processed
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // Update analytics
    const newBalance = profile.coins_balance - coinsRequired;
    const newTotalRequests = (profile.total_ai_requests || 0) + 1;
    const newWordsProcessed = (profile.words_processed || 0) + wordCount;

    await prisma.user_profiles.update({
      where: { id: req.user.id },
      data: {
        coins_balance: newBalance,
        total_ai_requests: newTotalRequests,
        words_processed: newWordsProcessed,
      },
    });

    // Log transaction
    await prisma.transactions.create({
      data: {
        user_id: req.user.id,
        action: `${action}_${mode || 'general'}_team`,
        coins_used: coinsRequired,
        details: {
          action,
          mode: mode || 'general',
          team_id: teamId,
          style_guide_applied: result.styleGuideApplied,
          violations_count: result.violations.length,
          text_length: text.length,
          word_count: wordCount,
          tone: tone || 'default',
        },
      },
    });

    // Log to ai_usage_analytics for accurate daily stats
    const outputLength = typeof result.result === 'string' ? result.result.length : 0;
    await prisma.ai_usage_analytics.create({
      data: {
        user_id: req.user.id,
        action_type: `${action}_team`,
        input_length: text.length,
        output_length: outputLength,
        coins_spent: coinsRequired,
      },
    });

    // Normalize the team AI result
    const output = typeof result.result === 'string' ? result.result : String(result.result || '');
    if (!output) {
      throw new Error('Team AI returned empty response');
    }

    console.log(`✅ Team AI processing complete: ${wordCount} words, ${coinsRequired} coins`);

    res.json({
      result: output,
      violations: result.violations || [],
      styleGuideApplied: result.styleGuideApplied || false,
      mode: result.mode || mode || 'general',
      coinsUsed: coinsRequired,
      wordsProcessed: wordCount,
      remainingCoins: newBalance,
    });

  } catch (error: any) {
    console.error('❌ Team AI processing error:', error);
    res.status(500).json({
      error: error.message || 'AI processing failed',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/ai/team-suggestions - Get content suggestions from team library
aiRouter.get('/team-suggestions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teamId, query } = req.query;

    if (!teamId || !query) {
      return res.status(400).json({ error: 'Team ID and query are required' });
    }

    const suggestions = await getTeamContentSuggestions(
      query as string,
      teamId as string,
      prisma
    );

    res.json({ suggestions });

  } catch (error: any) {
    console.error('❌ Team suggestions error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch suggestions' });
  }
});

// POST /api/ai/check-violations - Check text for style violations (real-time)
aiRouter.post('/check-violations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { text, teamId } = req.body;

    if (!text || !teamId) {
      return res.status(400).json({ error: 'Text and team ID are required' });
    }

    const styleGuide = await prisma.team_style_guides.findFirst({
      where: { team_id: teamId },
    });

    if (!styleGuide) {
      return res.json({ violations: [], styleGuide: null });
    }

    const violations = checkStyleViolations(text, styleGuide);

    res.json({
      violations,
      styleGuide: {
        brandVoice: styleGuide.brand_voice,
        tone: styleGuide.tone,
        approvedTerms: styleGuide.approved_terms,
        forbiddenTerms: styleGuide.forbidden_terms,
      }
    });

  } catch (error: any) {
    console.error('❌ Check violations error:', error);
    res.status(500).json({ error: error.message || 'Failed to check violations' });
  }
});
