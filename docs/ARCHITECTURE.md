# WordSage Architecture Document

> **Audience**: Engineers, tech leads, and senior reviewers who need to understand the full technical implementation.

---

## System Overview

WordSage is a three-tier SaaS application: a **Next.js 16** frontend, an **Express.js TypeScript** backend, and a **PostgreSQL** database — containerised with Docker Compose and served behind Nginx.

The AI layer is externalised to **OpenRouter** (a model-routing proxy supporting GPT-4o, Claude 3, Gemini Pro, and others), accessed via the OpenAI SDK with a `baseURL` override. The payment layer runs on **Razorpay** (subscriptions and one-time coin purchases). Transactional email goes through **Resend**.

---

## Deployment Architecture

```
                        Internet
                           │
                ┌──────────▼──────────┐
                │    Nginx (alpine)    │
                │    Port 80           │
                │    Reverse Proxy     │
                └──────┬──────┬───────┘
                       │      │
          ┌────────────▼──┐ ┌─▼──────────────┐
          │  Next.js FE   │ │  Express BE     │
          │  Port 3000    │ │  Port 4000      │
          │  (depends_on  │ │  (healthcheck:  │
          │   BE healthy) │ │   /api/health)  │
          └───────────────┘ └─────────┬───────┘
                                      │
                         ┌────────────▼────────────┐
                         │     PostgreSQL           │
                         │     (external, cloud)    │
                         └──────────────────────────┘
                                      │
                      ┌───────────────┼───────────────┐
                      │               │               │
              ┌───────▼────┐ ┌───────▼────┐ ┌────────▼──────┐
              │ OpenRouter │ │  Razorpay  │ │    Resend      │
              │ AI Gateway │ │  Payments  │ │   Transact.    │
              └────────────┘ └────────────┘ └───────────────┘
```

### Docker Compose Health Check Order

Compose `depends_on` with `condition: service_healthy` enforces this startup order:
1. **Backend** — `wget -q --spider http://127.0.0.1:4000/api/health` every 30s, 3 retries, 60s start period
2. **Frontend** — starts after backend is healthy
3. **Nginx** — starts after both frontend and backend are healthy

This prevents race conditions where Nginx routes traffic before services are ready.

---

## Frontend Architecture

### Framework & Routing

Next.js 16 (App Router, `src/app/**`). All routes are server-side rendered by default, with explicit `"use client"` directives on interactive components.

### Route Map

```
/app
├── page.tsx                        ← Landing page
├── layout.tsx                      ← Root layout (SessionProvider, metadata)
├── login/                          ← Login page (Credentials + OAuth)
├── signup/                         ← Registration form
├── forgot-password/                ← Password reset request
├── reset-password/                 ← Password reset form (token-based)
├── editor/
│   ├── page.tsx                    ← Main writing workspace (899 lines)
│   └── components/
│       ├── ModeSelector.tsx        ← Industry mode selector
│       ├── TemplateLibrary.tsx     ← 28+ template browser
│       ├── Accordion.tsx           ← Collapsible sections
│       ├── FloatingSuggestion.tsx  ← AI suggestion overlay
│       ├── FloatingToolbar.tsx     ← Contextual toolbar
│       └── AdvancedPanel.tsx       ← Advanced AI features panel
├── dashboard/
│   ├── page.tsx                    ← Dashboard overview (28,872 bytes)
│   ├── layout.tsx                  ← Dashboard layout with sidebar (33,744 bytes)
│   ├── analytics/                  ← AI usage analytics page
│   ├── settings/                   ← Profile, billing, preferences
│   └── teams/                      ← Team management
│       └── [teamId]/               ← Team detail
├── profile/                        ← User profile
├── coin-store/                     ← Razorpay coin purchase
└── admin/                          ← Admin panel
```

### Editor Architecture (`/editor/page.tsx`)

The editor is a 899-line React component managing 20+ state variables:

| State | Purpose |
|---|---|
| `content` | Raw text content (not HTML) |
| `title` | Document title |
| `selectedMode` | Active industry mode |
| `selectedTone` | AI tone override |
| `selectedTeam` | Active team for style guide |
| `styleGuide` | Fetched team style guide (cached) |
| `suggestions` | Ordered suggestion history |
| `forbiddenWordsFound` | Real-time forbidden term detection result |
| `savedStatus` | `saved` / `saving` / `error` |
| `isListening` | Voice input state |
| `recentDocs` | Last 10 documents (auto-loaded) |

**Auto-save**: `useEffect` on `[content, title, selectedMode]` debounces via `setTimeout(saveDocument, 3000)`. Previous timer is cancelled on each keystroke (`clearTimeout`).

**Style guide enforcement pipeline** (client-side):
1. On `[content, styleGuide]` change: `checkForbiddenWords()` scans content for `forbidden_terms` using word-boundary matching.
2. `highlightForbiddenWords()` wraps matches in `<mark class="bg-red-200 text-red-800">`.
3. `buildStyleGuidePrompt()` assembles style guide constraints into the AI request body.
4. Server checks violations pre-AI, enforces via prompt, checks violations post-AI.

**Voice input**: Uses `webkitSpeechRecognition` / `SpeechRecognition` Web API with `continuous: true`, `interimResults: true`. Auto-restarts on `onend` event when still in listening state.

**Export implementations**:
- **TXT**: `Blob(['text/plain'])` → `file-saver`
- **PDF**: `jsPDF` — sets font, splits text to page width, saves
- **DOCX**: `docx.Document` + `Packer.toBlob()` → `file-saver`

### Authentication (`src/auth.ts`)

NextAuth v5 configuration with three providers:
- `Google` — OAuth with `profile()` callback POSTing to `/api/auth/oauth`
- `GitHub` — OAuth with identical callback
- `Credentials` — POSTs to `/api/auth/verify`, returns user on success

JWT strategy (not database sessions). JWT encoded as JWE with `NEXTAUTH_SECRET`. Session duration: 30 days (`maxAge: 30 * 24 * 60 * 60`).

`jwt()` callback attaches `id` to the token from the `user` object returned by providers. `session()` callback passes `id` down to the session object.

### Data Fetching

SWR (`useSWR`) for profile data, with manual `mutate()` calls after AI requests to immediately refresh coin balance in the UI without a page reload.

API calls route through `apiFetch()` in `src/lib/api.ts` which attaches the session token to the `Authorization` header.

---

## Backend Architecture

### Express Application Bootstrap (`src/index.ts`)

```typescript
// Middleware stack (order matters)
app.use(helmet())                         // Security headers
app.use(compression())                    // Gzip
app.use(generalLimiter)                   // 100 req/min global rate limit
app.use(cors(corsOptions))                // Origin whitelist
app.use('/api/razorpay/webhook', rawBody) // Raw body BEFORE JSON parser
app.use(cookieParser())                   // Session cookie fallback
app.use(express.json({ limit: '10mb' }))  // JSON body parser

// Route mounting
app.use('/api/auth', authRouter)
app.use('/api/ai', aiRouter)
app.use('/api/documents', documentsRouter)
app.use('/api/teams', teamsRouter)
app.use('/api/payment', paymentRouter)
app.use('/api/razorpay', razorpayRouter)
app.use('/api/bonuses', bonusesRouter)
app.use('/api/templates', templatesRouter)
app.use('/api/profile', profileRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/password-reset', passwordResetRouter)
app.use('/api/docs', docsRouter)
app.use('/api/health', healthRouter)
```

### Rate Limiting Configuration

```typescript
// Global: 100 req/15min per IP
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

// Auth: 20 req/15min (prevents credential stuffing)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

// Password reset: 5 req/15min (prevents token exhaustion)
const passwordResetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
```

### Authentication Middleware (`src/middleware/auth.ts`)

```typescript
export async function requireAuth(req, res, next) {
  // 1. Extract token from Authorization header or cookies
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  // 2. Decode NextAuth JWE
  const salt = req.headers['x-auth-salt'] as string;
  const decoded = await decode({ token, secret: NEXTAUTH_SECRET, salt });
  if (!decoded?.sub) return res.status(401).json({ error: 'Invalid token' });

  // 3. Verify user still exists in DB (deleted user protection)
  const user = await prisma.users.findUnique({ where: { id: decoded.sub } });
  if (!user) return res.status(401).json({ error: 'User not found' });

  req.user = { id: user.id, email: user.email, name: user.full_name };
  next();
}
```

Token extraction tries six sources (see Security section).

### AI Service Layer (`src/services/ai.ts`)

**`processAIRequest(action, text, tone, mode, customPrompt)`**

1. Retrieves `IndustryMode` config from `INDUSTRY_MODES[mode]`
2. Calls `enhancePromptWithMode(action, text, mode, tone)` to build composite prompt
3. Sets temperature and max_tokens by action type
4. Calls OpenRouter `chat.completions.create`
5. Calls `cleanAIResponse(result)` to strip AI preamble
6. Returns `{ result, model, usage }`

**`processAdvancedAIRequest(action, text, options)`**

Handles 5 advanced actions: `plagiarism_check`, `rewrite_unique`, `humanize`, `bypass_detector`, `generate_citation`. Each has a dedicated prompt + specific temperature:

| Action | Temperature | Purpose |
|---|---|---|
| `plagiarism_check` | 0.1 | Analytical, deterministic comparison |
| `rewrite_unique` | 0.9 | Highly creative rewrite for uniqueness |
| `humanize` | 0.92 | Natural, varied language patterns |
| `bypass_detector` | 0.95 | Maximum unpredictability |
| `generate_citation` | 0.0 | Exact format output |

**OpenRouter Client (lazy singleton)**

```typescript
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.FRONTEND_URL!,
        'X-Title': 'WordSage',
      },
    });
  }
  return openai;
}
```

The lazy singleton pattern avoids creating the HTTP client on import — important for startup performance and testability.

**`OPENAI_MODEL`** constant: `'openai/gpt-4o-mini'` (used across both `ai.ts` and `team-ai.ts`).

### Team AI Service (`src/services/team-ai.ts`)

**Style violation detection** (`checkStyleViolations`):

```
forbidden_terms   → word-boundary regex → severity: 'error'
missing_approved  → any-term check      → severity: 'suggestion'
tone_keywords     → keyword vocabulary  → severity: 'warning'
```

Tone keyword vocabulary is statically defined per tone:
- `formal`: utilize, facilitate, leverage, endeavor
- `friendly`: help, easy, simple, great
- `confident`: will, proven, guaranteed, definitely
- `empathetic`: understand, feel, appreciate, care

**Team-aware prompt structure**:
```
[basePrompt for action]
TEAM STYLE GUIDE REQUIREMENTS (CRITICAL):
1. **Brand Voice**: professional (Formal, authoritative, corporate-friendly)
2. **Tone**: formal (Respectful, proper, business-like)
3. **MUST USE these terms**: [approved_terms]
4. **NEVER USE these terms**: [forbidden_terms]
5. **Writing Style**: [custom_rules.writing_style]
6. **Sentence Length**: [custom_rules.sentence_length]
7. **Target Audience**: [custom_rules.target_audience]
IMPORTANT RULES: ...
Original Text: [text]
```

**`processTeamAwareAI`**:
1. Fetch style guide
2. Check violations on input
3. Build team-aware prompt
4. Call OpenRouter
5. Check violations on output
6. Return `{ result, violations, styleGuideApplied, mode }`

Falls back to `processAIRequest` (no style guide constraints) if no style guide is found for the team.

### AI API Routes (`src/api/ai.ts`)

**`POST /api/ai/process`** (standard AI)

```
1. Validate required fields (action, text)
2. requireAuth → user object on req
3. Get user_profile (coins_balance)
4. Calculate cost (COIN_COSTS[action])
5. Check sufficient coins
6. If teamId present: processTeamAwareAI()
   Else: processAIRequest()
7. prisma.$transaction([
     update user_profiles coins_balance,
     create transaction record,
     create ai_usage_analytics record
   ])
8. Return { result, coinsUsed, remainingCoins }
```

The three post-AI database writes are atomic. If any one fails, the entire transaction rolls back — no coin deduction without a successful record, no record without a coin deduction.

**`POST /api/ai/advanced`** (advanced AI)

Same flow, but calls `processAdvancedAIRequest` and uses different `COIN_COSTS`:
```typescript
const COIN_COSTS = {
  plagiarism_check: 30,
  rewrite_unique: 25,
  humanize: 20,
  bypass_detector: 20,
  generate_citation: 10,
};
```

**`POST /api/ai/team-process`** (team AI with violations)

Calls `processTeamAwareAI` explicitly and returns the violations array in the response for the frontend to display.

**`POST /api/ai/check-violations`** (style check only, no AI)

Fetches team style guide and runs `checkStyleViolations` — no AI call, no coin deduction.

### Payment Architecture

#### Coin Top-up Flow

```
POST /api/payment/create-coin-order
  → Razorpay orders.create({ amount, currency: 'INR' })
  → Return: { orderId, amount, coins }

POST /api/payment/verify-coin-payment
  → HMAC-SHA256: orderId + '|' + paymentId, key = RAZORPAY_KEY_SECRET
  → If valid: user_profiles.coins_balance += packageCoins
  → Return: { success, coinsAdded, newBalance }
```

#### Subscription Flow

```
POST /api/payment/create-subscription-order
  → Razorpay orders.create({ amount: 0, currency: 'INR' })
  → Return: { orderId, planId, planName }

POST /api/payment/verify-subscription
  → HMAC-SHA256 verify
  → users.subscription_tier = 'pro'|'team'
  → Subscription DB record created
```

#### Webhook Events Handled

| Event | Action |
|---|---|
| `subscription.activated` | Update tier, set coins (1000/5000), update DB |
| `subscription.charged` | Refresh coins on renewal |
| `subscription.cancelled` | Downgrade to free, coins → 100 |
| `subscription.halted` | Same as cancelled |
| `payment.failed` | Log (notification hook available) |

Webhook route uses `express.raw()` middleware to preserve raw body bytes for HMAC-SHA256 signature verification before any JSON parsing.

---

## Database Architecture

### Schema Overview (24 tables)

```
User Domain
├── users                   ← Primary identity record
├── user_profiles           ← Extended profile, coins, subscription
├── accounts                ← OAuth provider accounts
├── sessions                ← NextAuth database sessions (unused in JWT mode)
├── verification_tokens     ← Email verification tokens
├── password_reset_tokens   ← Password reset tokens (single-use, 15min TTL)
├── notifications           ← In-app notification inbox
├── audit_logs              ← Admin-level audit trail
└── analytics               ← Session/event tracking

Document Domain
├── documents               ← Core document record
├── revisions               ← AI action snapshots (tokens_used, cost_usd, model)
├── document_versions       ← Explicit version history
├── document_comments       ← Threaded comments with position context
├── document_presence       ← Real-time user presence per document
└── document_approvals      ← Approval workflow state machine

Economy Domain
├── coins_transactions      ← Detailed coin ledger
├── transactions            ← AI operation ledger (action, coins_used, details)
├── subscriptions           ← Razorpay subscription lifecycle
├── plagiarism_checks       ← Persisted plagiarism results
└── ai_usage_analytics      ← Per-request telemetry

Team Domain
├── teams                   ← Team record
├── team_members            ← User ↔ Team (role, status)
├── team_style_guides       ← Style guide config
└── team_content_library    ← Approved reusable content snippets
```

### Critical Relationships

```
users ──────── 1:1 ──── user_profiles
users ──────── 1:N ──── documents
users ──────── 1:N ──── transactions
users ──────── 1:N ──── notifications
users ──────── N:N ──── teams (via team_members)
teams ──────── 1:1 ──── team_style_guides
teams ──────── 1:N ──── team_content_library
documents ──── 1:N ──── revisions
documents ──── 1:N ──── document_comments
documents ──── 1:N ──── document_presence
```

### Notable Schema Design Decisions

**Dual coin balance** (`users.coin_balance` + `user_profiles.coins_balance`): Two coin balance columns exist across two tables. The backend updates both on subscription events (see `razorpay.ts` webhook handler). This is a documented legacy inconsistency — `user_profiles.coins_balance` is the source of truth used by the AI engine, while `users.coin_balance` is used by the session/JWT layer for quick access.

**`subscriptions` table uses `stripe_*` column names**: `stripe_subscription_id` and `stripe_customer_id` store Razorpay IDs. This is a naming inconsistency from an earlier payment provider migration.

**`transactions` table** uses a convention where `coins_used` is **negative** for credits and **positive** for debits. This allows sorting and summing across all transaction types uniformly.

**`document_presence`**: Stores user presence per document at the DB level. Real-time sync via WebSockets is not yet implemented — current implementation is DB-polling only.

---

## Industry Mode System

Defined in `src/lib/ai/modes.ts`. 6 modes are fully implemented with system prompts and keywords. The frontend supports 15+ modes (additional modes use the `general` fallback).

### Mode Configuration Interface

```typescript
interface IndustryMode {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  systemPrompt: string;   // Domain expert system prompt
  keywords: string[];      // Domain terminology hints
  tone: string;            // Default tone for this mode
  examples: string[];      // Use-case examples
}
```

### Implemented Modes (backend)

| Mode | System Prompt Focus |
|---|---|
| `general` | Versatile, clarity, readability |
| `legal` | Contractual language, legal clauses, AVOID ambiguity |
| `medical` | SOAP format, HIPAA placeholders, clinical standards |
| `technical` | Code blocks, numbered steps, prerequisites, troubleshooting |
| `academic` | Thesis, APA/MLA/Chicago citations, third-person |
| `business` | Executive summary, BLUF, ROI language, action-focused |

### Prompt Construction

```typescript
function enhancePromptWithMode(action, text, mode, customTone) {
  const modeConfig = getModeById(mode);

  // Layer 1: Domain system prompt
  const basePrompt = modeConfig.systemPrompt;

  // Layer 2: Tone
  const toneInstruction = customTone
    ? `\n\nTone: ${customTone}`
    : `\n\nTone: ${modeConfig.tone}`;

  // Layer 3: Domain keywords hint
  const keywordsHint = modeConfig.keywords.length > 0
    ? `\n\nUse appropriate terminology: ${modeConfig.keywords.slice(0, 10).join(', ')}`
    : '';

  // Layer 4: Action-specific instruction with text
  const actionPrompt = buildActionPrompt(action, text, mode);

  // Critical instruction: suppress AI preamble
  return `${basePrompt}${toneInstruction}${keywordsHint}\n\n${actionPrompt}\n\nCRITICAL INSTRUCTION: Return ONLY the processed text. No explanations...`;
}
```

---

## Security Architecture

### Defense-in-Depth Layers

```
Layer 1: Network
  └─ Nginx: Reverse proxy, no direct backend exposure

Layer 2: Transport
  └─ HTTPS (configured at Nginx/deployment level)

Layer 3: HTTP
  ├─ Helmet: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
  └─ CORS: Origin whitelist, no wildcard

Layer 4: Rate Limiting
  ├─ Global: 100 req/15min
  ├─ Auth: 20 req/15min
  └─ Password reset: 5 req/15min

Layer 5: Authentication
  ├─ JWT: NextAuth JWE, 30-day sessions
  ├─ bcrypt: cost factor 12 (~300ms/hash)
  ├─ Multi-path token extraction (header + 5 cookie names)
  └─ DB existence check (deleted user protection)

Layer 6: Input Validation
  ├─ Zod schemas on sensitive endpoints
  ├─ Email format validation (regex)
  ├─ Password strength validation (8 chars, upper, lower, digit)
  └─ Disposable email blocklist

Layer 7: Payment Security
  ├─ Razorpay order signature: HMAC-SHA256(orderId|paymentId)
  ├─ Webhook signature: HMAC-SHA256(raw body)
  └─ Raw body preservation for webhook route

Layer 8: Data Integrity
  └─ prisma.$transaction() wrapping all multi-step coin operations

Layer 9: Anti-Enumeration
  ├─ Password reset always returns generic success
  └─ Identical response timing for existing/non-existing emails
```

### Password Reset Security Design

1. Generate `crypto.randomBytes(64).toString('hex')` — 128 character token
2. Invalidate all existing unused tokens for the email before creating new one
3. Store token with `expires_at = now + 15 minutes`
4. Always return generic success (prevents email enumeration)
5. On reset: validate token, validate password strength, then atomic `$transaction([updateUser, markTokenUsed])`
6. Expired tokens are marked `used: true` on reset attempt

---

## Cost Architecture

### Coin Costs by Action

| Action | Coins | Rationale |
|---|---|---|
| `fix_grammar` | 5 | Lowest complexity, low token budget |
| `summarize` | 8 | Moderate input, compressed output |
| `improve` | 10 | Standard operation |
| `expand` | 15 | High output token budget (4096) |
| `rewrite` | 15 | Full content transformation |
| `custom` | 20 | Unbounded complexity |
| `humanize` | 20 | Complex linguistic transformation |
| `bypass_detector` | 20 | Highest temperature, max effort |
| `generate_citation` | 10 | Format-specific, deterministic |
| `rewrite_unique` | 25 | Structural + syntactic overhaul |
| `plagiarism_check` | 30 | Multi-sentence analysis |

### Subscription Tiers

| Tier | Monthly Cost | Coins/Month | Max Members |
|---|---|---|---|
| Free | — | 100 (welcome) | Solo |
| Pro | ₹999 | 1,000 | Solo |
| Team | ₹2,999 | 5,000 | 50 |

Coins are also purchasable as one-time top-ups:
- Starter Pack: 500 coins
- Standard Pack: 1,500 coins
- Premium Pack: 5,000 coins

(Prices and pack names from `payment.ts` — actual amounts depend on environment configuration.)

---

## Data Flow Diagrams

### AI Processing Flow

```
                    ┌─────────────────────────────────────────┐
Browser ──request──>│  POST /api/ai/process                   │
                    │  { action, text, tone, mode, teamId? }  │
                    └──────────────────┬──────────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────┐
                    │  requireAuth middleware       │
                    │  → decode JWT (JWE)           │
                    │  → verify user in DB          │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  Coin check                  │
                    │  → get user_profiles         │
                    │  → coins_balance >= cost?    │
                    └──────────────┬───────────────┘
                           No ─────┼────── Yes
                           │       │           │
                    400 ◄──┘       ▼           │
                           ┌───────────────────┤
                           │  teamId present?  │
                           └──────┬─────┬──────┘
                                  │     │
                                No │     │ Yes
                                  ▼     ▼
              processAIRequest()      processTeamAwareAI()
                    │                        │
                    │  getTeamStyleGuide()   │
                    │  checkViolations()     │
                    │  buildTeamPrompt()     │
                    └──────────┬─────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   OpenRouter API    │
                    │   gpt-4o-mini       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────────────────────────┐
                    │  cleanAIResponse(result)                │
                    │  [strip preamble patterns]              │
                    └──────────┬──────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────────────────────────┐
                    │  prisma.$transaction([                   │
                    │    update user_profiles.coins_balance,  │
                    │    create transactions record,          │
                    │    create ai_usage_analytics record     │
                    │  ])                                     │
                    └──────────┬──────────────────────────────┘
                               │
                               ▼
                    { result, coinsUsed, remainingCoins }
```

### Team Invitation Flow

```
Team owner → POST /api/teams/:id/invite { email }
           → check team membership limit (max 50)
           → check invitee not already member
           → create team_members { status: 'pending' }
           → sendInviteEmail() via Resend
           → return success

Invitee → POST /api/teams/invitations/accept { token }
        → validate invitation
        → update team_members { status: 'active' }
        → return team data

Invitee → POST /api/teams/invitations/reject { token }
        → delete team_members record
        → return success
```

---

## Template Architecture

28+ templates defined statically in `src/api/templates.ts` as an in-memory array. No DB persistence (templates are application-level configuration, not user data).

**Template structure**:
```typescript
{
  id: string;           // Kebab-case identifier
  name: string;         // Display name
  category: string;     // email | content | business | marketing | social | academic | technical | legal | hr | real_estate | travel
  mode: string;         // Maps to IndustryMode id
  icon: string;         // Emoji icon
  description: string;  // One-line description
  structure: {
    sections: string[]; // Section names (rendered as ## headings)
  };
  aiPrompt: string;     // AI-specific instruction when template is used
  variables: string[];  // Dynamic placeholder names
}
```

Routes:
- `GET /api/templates` — list all (filterable by `?category=&mode=`)
- `GET /api/templates/:id` — single template
- `GET /api/templates/meta/categories` — distinct category list

---

## Email Architecture

Resend is the email provider. Two templates implemented:

1. **Team Invite Email** (`sendInviteEmail.ts`) — Invites user to join a team
2. **Password Reset Email** (`sendPasswordResetEmail.ts`) — 15-minute reset link with HTML template

Both use `RESEND_API_KEY` from environment. Errors in email sending are caught and logged but do not surface to the API caller — the operation is considered best-effort.

---

## Environment Variable Map

| Variable | Used In | Purpose |
|---|---|---|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Both | JWT signing and JWE decryption |
| `OPENROUTER_API_KEY` | Backend | AI gateway API key |
| `RAZORPAY_KEY_ID` | Backend | Razorpay public key |
| `RAZORPAY_KEY_SECRET` | Backend | Razorpay secret (HMAC signing) |
| `RAZORPAY_WEBHOOK_SECRET` | Backend | Webhook HMAC verification |
| `RAZORPAY_PRO_PLAN_ID` | Backend | Razorpay plan ID for Pro tier |
| `RAZORPAY_TEAM_PLAN_ID` | Backend | Razorpay plan ID for Team tier |
| `RESEND_API_KEY` | Backend | Transactional email |
| `FRONTEND_URL` | Backend | CORS origin + OpenRouter HTTP-Referer |
| `CORS_ORIGIN` | Backend | Additional CORS origin |
| `GOOGLE_CLIENT_ID` | Frontend | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Frontend | Google OAuth |
| `GITHUB_CLIENT_ID` | Frontend | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | Frontend | GitHub OAuth |
| `BACKEND_URL` | Frontend | Backend base URL (internal Docker or localhost) |
| `NEXT_PUBLIC_API_URL` | Frontend | Public API base URL |
| `AUTH_SECRET` | Frontend | NextAuth v5 alias for `NEXTAUTH_SECRET` |

---

## Performance Characteristics

### Database Query Patterns

| Operation | Query Type | Notes |
|---|---|---|
| AI coin deduction | `$transaction([update, create, create])` | 3 ops atomic |
| Daily bonus | `$transaction(async tx => {...})` | Interactive transaction with 2 reads, 3 writes |
| Document save | `upsert` or `update` | Triggered max every 3 seconds |
| Team member check | `findFirst` | Role + status lookup before team ops |
| Style guide fetch | `findFirst` | Cached on client per session |

### Response Size

- AI responses: variable, up to 4,096 tokens (~16KB text)
- Document list: capped at 10 documents per request
- Template list: ~20KB (static, cached by browser)

### Token Budget by Action

| Action | Max Tokens | Approximate Output |
|---|---|---|
| `fix_grammar` | 1,500 | ~1,000 words corrected |
| `summarize` | 1,000 | ~700 word summary |
| `improve` | 2,000 | ~1,400 words improved |
| `rewrite` | 2,500 | ~1,700 words rewritten |
| `humanize` | 2,500 | ~1,700 words humanized |
| `bypass_detector` | 2,500 | ~1,700 words |
| `expand` / `custom` | 4,096 | ~2,700 words |

---

## Known Architectural Debt

1. **Dual coin balance** — `users.coin_balance` and `user_profiles.coins_balance` duplicated. Both updated on subscription changes. The AI engine uses `user_profiles.coins_balance` as authoritative.

2. **`stripe_*` column naming** — `subscriptions.stripe_subscription_id` and `stripe_customer_id` store Razorpay IDs. A migration to rename these columns would eliminate confusion.

3. **Plagiarism simulation** — `checkPlagiarism()` in `lib/utils/plagiarism.ts` uses a randomised simulation. The function signature and interface are production-ready; the implementation body needs replacing with Copyscape or PlagiarismCheck API.

4. **No WebSocket layer** — `document_presence` table is DB-backed but no real-time sync mechanism is implemented. Collaborative editing would require Socket.io or a similar layer.

5. **In-memory templates** — Templates in `api/templates.ts` are hardcoded. A DB-backed template store would allow team-level custom templates.

6. **No test suite** — No unit or integration tests present. Jest + Supertest would be the natural choice for the backend; Vitest + React Testing Library for the frontend.

---

## Glossary

| Term | Definition |
|---|---|
| SkillsCoins | The in-app currency consumed by AI operations |
| Industry Mode | Domain-specific AI context (15 modes: legal, medical, academic, etc.) |
| Style Guide | Team-level writing rules (brand voice, tone, approved/forbidden terms) |
| OpenRouter | AI model gateway routing to GPT-4o, Claude 3, Gemini, etc. |
| JWE | JSON Web Encryption — NextAuth v5 JWT format |
| `requireAuth` | Express middleware that decodes and validates the NextAuth JWT |
| Prisma `$transaction` | Atomic multi-operation DB call — rolls back on any failure |
| Daily Streak | Consecutive days of daily login bonus claims |
| Revision | A full document snapshot stored per AI action, with token/cost metadata |
| Violation | A forbidden term or tone mismatch found in text by `checkStyleViolations` |
