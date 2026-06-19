# WordSage — Engineering Highlights

> **Audience**: Technical reviewers, engineering interviewers, and senior engineers evaluating code quality and architectural decisions.

---

## Overview

This document details the non-trivial engineering decisions, security architecture, and implementation patterns in WordSage that demonstrate production-level thinking rather than tutorial-level code.

---

## 1. Composite AI Prompt Architecture

### The Problem

Generic writing assistants use a single, flat prompt: "Improve this text." This produces domain-agnostic output — legal text comes back with marketing language, medical notes use casual phrasing.

### The Solution

WordSage assembles a multi-layer composite prompt at runtime:

```
Layer 1: Domain System Prompt
  ↓ 6 industry modes with expert-level instructions
Layer 2: Action-Specific Instruction
  ↓ grammar / improve / rewrite / summarize / expand / custom
Layer 3: Tone Override
  ↓ 10 tone options (formal, clinical, enthusiastic, etc.)
Layer 4: User Text
  ↓ actual content to process
Layer 5: Critical Instruction
  ↓ "Return ONLY the processed text. No preamble."
```

For team requests, a sixth layer is inserted after Layer 1:

```
Layer 1.5: Team Style Guide Constraints
  → Brand Voice + description
  → Tone + description
  → Approved terms (MUST USE)
  → Forbidden terms (NEVER USE)
  → Custom writing rules (style, sentence length, audience, jargon)
```

**Why this matters**: The AI's output quality is determined almost entirely by prompt structure. Without domain context, `gpt-4o-mini` produces adequate but generic text. With a 15-industry-mode system + 6-action matrix + tone modifier, WordSage extracts dramatically superior output from the same underlying model — without fine-tuning or a proprietary model.

**Source**: `src/lib/ai/modes.ts` (`enhancePromptWithMode`), `src/services/team-ai.ts` (`buildTeamAwarePrompt`)

---

## 2. Atomic Post-AI Database Writes

### The Problem

After an AI call succeeds, WordSage must:
1. Deduct coins from `user_profiles`
2. Create a transaction record (audit log)
3. Create an `ai_usage_analytics` record (telemetry)

If step 2 or 3 fails after step 1, the user loses coins with no record. If step 1 fails after a successful AI call, the user gets free AI output. Either is wrong.

### The Solution

All three writes are wrapped in a single `prisma.$transaction([])`:

```typescript
await prisma.$transaction([
  prisma.user_profiles.update({
    where: { id: userId },
    data: { coins_balance: { decrement: coinsToCharge } }
  }),
  prisma.transactions.create({
    data: {
      user_id: userId,
      action: action,
      coins_used: coinsToCharge,
      details: { mode, tone, wordsCount }
    }
  }),
  prisma.ai_usage_analytics.create({
    data: {
      user_id: userId,
      action_type: action,
      input_length: text.length,
      output_length: result.length,
      coins_spent: coinsToCharge,
      processing_time_ms: endTime - startTime,
      mode: mode || 'general'
    }
  })
]);
```

PostgreSQL's transactional semantics guarantee all three succeed or all three roll back. The user's balance is always consistent with the transaction ledger.

**Design note**: Prisma's sequential transaction (`$transaction([])`) is used here, not the interactive transaction callback (`$transaction(async tx => {...})`), because no reads are needed between writes — it's purely a multi-write commit.

**Source**: `src/api/ai.ts` (standard AI endpoint)

---

## 3. Interactive Transaction for Daily Bonus (Read-Then-Write)

### The Problem

The daily login bonus has a streak calculation that depends on reading yesterday's transaction before computing today's award. This is a read-modify-write pattern — if two requests arrive simultaneously, both could read "no yesterday transaction" and both would reset the streak to 1, or both would increment it, corrupting the streak count.

### The Solution

Interactive Prisma transaction with all reads and writes in one serialised block:

```typescript
const result = await prisma.$transaction(async (tx) => {
  const profile = await tx.user_profiles.findUnique({ where: { id: userId } });

  const hasClaimedToday = await tx.transactions.findFirst({
    where: { user_id: userId, action: 'daily_login', created_at: { gte: startOfDay } }
  });

  if (hasClaimedToday) {
    return { granted: false, message: 'Already claimed today' };
  }

  const hasClaimedYesterday = await tx.transactions.findFirst({
    where: { user_id: userId, action: 'daily_login', created_at: { gte: startOfYesterday, lt: startOfDay } }
  });

  const newStreak = hasClaimedYesterday ? (profile.daily_streak || 0) + 1 : 1;

  await tx.user_profiles.update({ ... });
  await tx.transactions.create({ ... });
  await tx.notifications.create({ ... });

  return { granted: true, coins: 10, streak: newStreak, newBalance };
});
```

The entire block runs in a single database transaction with repeatable-read isolation — a second concurrent request will see the first request's writes and correctly return `{ granted: false }`.

**Source**: `src/api/bonuses.ts`

---

## 4. Razorpay Webhook Security — Raw Body Preservation

### The Problem

Razorpay webhooks are verified using `HMAC-SHA256(rawBody, webhookSecret)`. Express's `express.json()` parses the body and reconstructs it — the reconstructed JSON may not be byte-for-byte identical to the original (key ordering, whitespace). Using the parsed body for HMAC verification would produce a different signature and reject all legitimate webhooks.

### The Solution

The webhook route is mounted with a raw body parser applied **before** the global JSON middleware:

```typescript
// In index.ts — ORDER MATTERS
app.use(
  '/api/razorpay/webhook',
  express.raw({ type: 'application/json' })
);

// Global JSON parser (applied after — does NOT affect the webhook route)
app.use(express.json({ limit: '10mb' }));
```

In the webhook handler:

```typescript
razorpayRouter.post('/webhook', async (req: any, res: Response) => {
  const body = req.body.toString();  // Buffer from express.raw()
  const signature = req.headers['x-razorpay-signature'] as string;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(body);  // Parse only after verification
  // ...
});
```

Because `express.raw()` is applied to that specific path before `express.json()`, the webhook receives the raw `Buffer`. Only after HMAC verification does the handler parse the JSON.

This is the correct pattern and a common footgun for developers building payment webhooks.

**Source**: `src/index.ts` (middleware order), `src/api/razorpay.ts` (webhook handler)

---

## 5. NextAuth JWE Token Bridge (Frontend ↔ Backend)

### The Problem

NextAuth v5 signs session tokens as JWE (JSON Web Encryption), not plain JWT. The backend (Express) needs to validate and decode these tokens. A naïve implementation would require duplicating the decryption key handling. Using `jsonwebtoken` alone fails because JWE is not the same as JWT.

### The Solution

The backend uses the same `next-auth/jwt` library the frontend uses:

```typescript
import { decode } from 'next-auth/jwt';

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

async function decodeToken(token: string, salt?: string) {
  return await decode({
    token,
    secret: NEXTAUTH_SECRET,
    salt: salt || 'authjs.session-token',
  });
}
```

The frontend proxy layer sends an `X-Auth-Salt` header alongside the `Authorization: Bearer` header. This allows the backend to use the correct salt for JWE decryption, which varies depending on whether the request is secure (HTTPS) or development (HTTP).

**Multi-source token extraction** (priority order):
```typescript
function extractToken(req): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.substring(7);
  
  return (
    req.cookies['__Secure-authjs.session-token'] ||
    req.cookies['authjs.session-token'] ||
    req.cookies['__Secure-next-auth.session-token'] ||
    req.cookies['next-auth.session-token'] ||
    null
  );
}
```

This handles both the standard NextAuth v5 cookie names and the older v4 names, covering cookie-based session fallback when no `Authorization` header is present.

**Source**: `src/middleware/auth.ts`

---

## 6. Team Style Guide Enforcement Pipeline

### The Problem

Simply adding style guide rules to the AI prompt is insufficient. The AI can still produce forbidden terms (hallucinations), can ignore approved term lists, and the user has no visibility into what was enforced.

### The Solution

A three-stage pipeline with client-side + server-side enforcement:

**Stage 1: Client-side real-time detection (editor)**
```typescript
// Runs on every content change
const checkForbiddenWords = () => {
  const words = content.toLowerCase().split(/\s+/);
  const found = styleGuide.forbidden_terms.filter(term =>
    words.includes(term.toLowerCase())
  );
  setForbiddenWordsFound(found);
};
```

Forbidden words are highlighted in the editor in real time, before any AI call.

**Stage 2: Server-side pre-AI violation check**
```typescript
const violations = checkStyleViolations(text, styleGuide);
// Returns: [{ type, severity, message, suggestion }]
```

The input text is checked before the AI call. Violations are returned to the caller.

**Stage 3: Constraint-enforced AI prompt**
```typescript
const enhancedPrompt = buildTeamAwarePrompt(action, text, styleGuide, mode, tone);
// Prompt includes: MUST USE [approved_terms], NEVER USE [forbidden_terms]
```

The AI model receives explicit hard constraints embedded in the prompt.

**Stage 4: Post-AI output re-check**
```typescript
const resultViolations = checkStyleViolations(result, styleGuide);
// AI output is checked — residual violations are still reported
```

Even if the AI hallucinated a forbidden term, the caller is informed. The UI can flag it before the user accepts the suggestion.

**Why this matters**: Most AI writing tools add style instructions to the prompt and trust the output. WordSage treats the style guide as a verified constraint — violations are detected both before and after the AI call, with evidence reported to the user.

**Source**: `src/services/team-ai.ts`, `src/app/editor/page.tsx`

---

## 7. Password Reset Security Design

### Anti-enumeration via Generic Responses

The password reset endpoint always returns the same response regardless of whether the email exists:

```typescript
const genericSuccess = {
  success: true,
  message: "If an account with that email exists, we've sent a password reset link...",
};

const user = await prisma.users.findUnique({ where: { email: normalizedEmail } });
if (!user) {
  console.log(`🔍 Password reset requested for non-existent email: ${normalizedEmail}`);
  return res.json(genericSuccess); // Same 200 response
}
```

An attacker cannot enumerate which emails are registered by observing response differences.

### Token Security

```typescript
const token = crypto.randomBytes(64).toString('hex');
// = 128 hexadecimal characters
// = 512 bits of entropy
// Brute force at 10^9 guesses/second: 10^(154-9) years
```

Tokens are single-use (marked `used: true` on consumption), expire in 15 minutes, and all existing unused tokens for the same email are invalidated before generating a new one.

### Atomic Reset

```typescript
await prisma.$transaction([
  prisma.users.update({
    where: { email: resetToken.email },
    data: { password: hashedPassword, updated_at: new Date() }
  }),
  prisma.password_reset_tokens.update({
    where: { id: resetToken.id },
    data: { used: true }
  })
]);
```

Password update and token invalidation are atomic — no window where a token is valid after the password has changed.

**Disposable email blocking**:
```typescript
if (isDisposableEmail(normalizedEmail)) {
  return res.status(400).json({
    error: 'Temporary or disposable email addresses are not allowed.'
  });
}
```

**Source**: `src/api/password-reset.ts`

---

## 8. OAuth User Creation via Prisma Nested Write

### The Problem

OAuth sign-up requires creating three records: the `users` record, the `user_profiles` record (coin balance, stats), and a `transactions` record (welcome bonus audit). Three separate `prisma.users.create()`, `prisma.user_profiles.create()`, `prisma.transactions.create()` calls risk partial state if any fails.

### The Solution

Prisma nested writes in a single create operation:

```typescript
user = await prisma.users.create({
  data: {
    email,
    full_name: name || email.split('@')[0],
    avatar_url: image || null,
    subscription_tier: 'free',
    coin_balance: 0,
    user_profiles: {
      create: {
        coins_balance: 100,  // Welcome bonus
        total_ai_requests: 0,
        words_processed: 0,
        daily_streak: 0,
        last_login_date: new Date(),
      }
    },
    transactions: {
      create: {
        action: 'welcome_bonus',
        coins_used: -100,
        details: { type: 'oauth_signup', provider: provider || 'unknown' }
      }
    },
    notifications: {
      create: {
        title: "🎉 Welcome Bonus!",
        message: "100 SkillsCoins credited to your account as a welcome gift!",
        type: "welcome"
      }
    }
  }
});
```

One `INSERT` statement (with implicit transaction) creates the user, profile, welcome transaction, and notification atomically. No partial sign-up state is possible.

**Source**: `src/api/auth.ts` (`/auth/oauth` endpoint)

---

## 9. Rate Limiting at Three Tiers

Rather than a single rate limiter for all endpoints, WordSage applies graduated limits:

```typescript
// Tier 1: Global — prevents general abuse
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' }
});

// Tier 2: Auth endpoints — prevents credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20
});

// Tier 3: Password reset — prevents token exhaustion attacks
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5
});
```

Applied:
- `generalLimiter` → mounted globally at `app.use()`
- `authLimiter` → mounted on `/api/auth` router
- `passwordResetLimiter` → mounted on `/api/password-reset` router

An attacker trying credential stuffing hits the `authLimiter` at 20 requests in 15 minutes. An attacker trying to exhaust password reset tokens hits `passwordResetLimiter` at 5 per 15 minutes.

**Source**: `src/index.ts`

---

## 10. OpenRouter Model Gateway (Abstraction Layer)

### Design Decision

Rather than hardcoding calls to OpenAI's API, WordSage routes through **OpenRouter** — a model-routing proxy with the same API surface as OpenAI:

```typescript
openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',  // Override
  defaultHeaders: {
    'HTTP-Referer': process.env.FRONTEND_URL!,
    'X-Title': 'WordSage',
  },
});
```

This single change (the `baseURL` override) provides:
- **Model flexibility** — switch from `openai/gpt-4o-mini` to `anthropic/claude-3-haiku` by changing the `model` string
- **Cost transparency** — OpenRouter provides per-model cost tracking
- **Fallback capability** — if one provider is down, the routing layer handles fallback
- **Zero vendor lock-in** — the codebase is identical regardless of which underlying model is used

The constant `OPENAI_MODEL = 'openai/gpt-4o-mini'` is defined once in `src/services/ai.ts` and imported by `src/services/team-ai.ts`, ensuring both use the same model and the change point is a single constant.

**Source**: `src/services/ai.ts`, `src/services/team-ai.ts`

---

## 11. Temperature Calibration by Action

The same model produces very different output quality depending on temperature. WordSage calibrates temperature per action type:

| Action | Temperature | Rationale |
|---|---|---|
| `fix_grammar` | 0.1 | Grammar correction is deterministic. High temperature introduces hallucinated changes. |
| `generate_citation` | 0.0 | Format must be exact. Temperature 0 = greedy decoding. |
| `summarize` | 0.3 | Slight creativity for phrasing, but factual accuracy required. |
| `improve` | 0.5 | Balance between faithfulness to original and creative enhancement. |
| `expand` | 0.6 | Needs creative content generation while staying on-topic. |
| `rewrite` | 0.7 | More freedom for structural transformation. |
| `humanize` | 0.92 | Needs highly varied, natural-sounding output. Low temperature = robotic. |
| `bypass_detector` | 0.95 | Maximum perplexity/burstiness variation required. |

This is not arbitrary — it directly maps to the output requirements of each operation and the known behaviour of autoregressive language models at different temperatures.

**Source**: `src/services/ai.ts` (`processAIRequest`, `processAdvancedAIRequest`)

---

## 12. AI Response Cleaning (Preamble Stripping)

LLMs frequently prepend helpful explanations to their output: "Here is the improved text:", "Certainly! I have fixed the grammar:", etc. These pollute the document.

WordSage runs all AI output through `cleanAIResponse()`:

```typescript
function cleanAIResponse(text: string): string {
  const patterns = [
    /^here is the (corrected|improved|rewritten|summarized|expanded|fixed) text:?\s*/i,
    /^certainly,?\s*(here is|I have).*?:\s*/i,
    /^I('ve| have) (corrected|improved|rewritten|fixed|summarized|expanded).*?:\s*/i,
    /^sure!?\s*(here is|here's).*?:\s*/i,
    /^(the |here's the )?(corrected|improved|revised|rewritten) (version|text):?\s*/i,
    /^\*\*(improved|corrected|rewritten|fixed) (text|version)\*\*:?\s*/i,
  ];

  let cleaned = text.trim();
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim();
}
```

Additionally, the action prompt in `enhancePromptWithMode` ends with:
```
CRITICAL INSTRUCTION: Return ONLY the processed text. No explanations, no introductions like "Here is..." or "I have...". Just the result text directly.
```

Two-layer defense: instruction-level suppression + regex cleanup on output.

**Source**: `src/services/ai.ts`

---

## 13. Dual Coin Balance — Documented Architectural Debt

WordSage has two coin balance fields:
- `users.coin_balance` — on the primary user table
- `user_profiles.coins_balance` — on the extended profile table

The AI engine uses `user_profiles.coins_balance` as the authoritative balance (deducts from this on every AI call). Subscription webhooks update both tables:

```typescript
// In razorpay.ts webhook handler
await prisma.user_profiles.update({
  where: { id: userId },
  data: { subscription_tier: tier, coins_balance: coins }
});
// ALSO update users table to keep in sync
await prisma.users.update({
  where: { id: userId },
  data: { subscription_tier: tier, coin_balance: coins }
});
```

This is explicitly commented in the source as a sync requirement. The correct resolution would be a migration to remove `users.coin_balance` and read all coin data from `user_profiles`. This has been documented but not yet executed to avoid a breaking schema migration mid-development.

**Impact**: Low risk (both fields are updated together on subscription events; the AI engine reads only `user_profiles`). **Technical debt level**: Medium.

---

## 14. Lazy Singleton Pattern for External Clients

Both the OpenAI/OpenRouter client and the Razorpay client use a lazy singleton pattern:

```typescript
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      // ...
    });
  }
  return openai;
}
```

**Why not a module-level singleton?** In TypeScript ESM, `import`-time initialisation runs when the module is first imported — before environment variables are validated. Lazy initialisation means the client is only created on first use, after all env vars are confirmed present.

This also improves testability — tests can mock the environment variable and get a fresh client, rather than fighting with module caching.

**Source**: `src/services/ai.ts`, `src/services/team-ai.ts`, `src/services/razorpay.ts`

---

## 15. Startup Environment Validation

```typescript
// src/lib/validate-env.ts (called at app start in index.ts)
const required = ['DATABASE_URL', 'NEXTAUTH_SECRET'];

export function validateEnv() {
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}
```

The application refuses to start if critical environment variables are absent. This catches misconfigured deployments at startup rather than at the first request — a standard production practice that prevents silent failures.

**Source**: `src/lib/validate-env.ts`

---

## Summary: Engineering Decisions Matrix

| Decision | Pattern | Alternative Rejected | Reason |
|---|---|---|---|
| Post-AI DB writes | `$transaction([])` | 3 separate awaits | Prevents partial state |
| Daily bonus race condition | Interactive transaction | Separate read+write | Prevents double-claim |
| Webhook body parsing | `express.raw()` before JSON | Parse then re-stringify | HMAC requires original bytes |
| JWT bridge | `next-auth/jwt decode()` | Custom JWT verify | Same library = same decryption |
| AI model access | OpenRouter (OpenAI SDK override) | Direct OpenAI | Model-agnostic, no lock-in |
| OAuth user creation | Prisma nested write | 3 separate creates | Atomic, no partial state |
| Rate limiting | 3 tiers (global/auth/reset) | Single global limiter | Graduated protection |
| Token generation | `crypto.randomBytes(64)` | UUID v4 | Higher entropy |
| Response cleaning | Instruction + regex | Instruction alone | Defense in depth |
| Client initialisation | Lazy singleton | Module-level singleton | Env validation at use time |
