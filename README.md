# WordSage

> **AI-powered writing assistant built for teams and individuals who write professionally.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-green?logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](https://postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-blueviolet?logo=prisma)](https://prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue?logo=docker)](https://docker.com/)

---

## Executive Summary

WordSage is a full-stack, production-grade AI writing platform that delivers intelligent text transformation across **15 industry-specific writing modes** (legal, medical, academic, business, technical, creative, and more). It combines a React rich-text editor, an OpenRouter-backed AI engine, a coin-based economy, team collaboration with style-guide enforcement, and a Razorpay payment system — all containerised with Docker and served behind Nginx.

---

## Problem Statement

Professional writers across domains spend disproportionate time on editing, reformatting, and tone-matching. Generic grammar checkers (Grammarly, etc.) are domain-agnostic. WordSage solves this by:

1. Understanding **domain context** — a legal clause is rewritten differently from a marketing email.
2. Enforcing **team brand voice** — forbidden words are detected in real time; AI output respects style guides.
3. Offering **advanced operations** — AI-bypass detection, plagiarism simulation, citation generation in 10+ academic formats.

---

## Why This Product Exists

Most writing tools treat all text the same. WordSage's architecture separates the action (what to do) from the mode (the domain context), producing dramatically higher-quality output. A single `/api/ai/process` request carries `action`, `tone`, and `mode` — and the backend assembles a composite system prompt from domain-expert knowledge baked into 15 industry-specific instruction sets.

---

## Core Value Proposition

| For | Value |
|---|---|
| Individual writers | 6 AI actions × 15 industry modes = context-aware editing on every request |
| Teams | Style guide enforcement, content library, team-aware AI processing |
| Students | Plagiarism simulation, humanize, AI-bypass, citation generation (APA/MLA/Chicago/Harvard/IEEE/…) |
| Developers | Fully open, typed, documented API with JWT auth |

---

## Key Features

### AI Writing Engine
- **Fix Grammar** — Comprehensive error detection: grammar, spelling, punctuation, capitalization, articles, prepositions (5 coins)
- **Improve** — Clarity, engagement, and tone enhancement (10 coins)
- **Rewrite** — Full content transformation preserving core message (15 coins)
- **Summarize** — 20–30% compression extracting key points (8 coins)
- **Expand** — 2–3× content growth with substantive additions (15 coins)
- **Custom Prompt** — Free-form AI instruction (20 coins)

### Advanced AI Features
- **Plagiarism Simulation** — Sentence-level analysis returning similarity score and flagged sources (30 coins)
- **Rewrite Unique** — Structural + syntactic transformation targeting 0% similarity (25 coins)
- **Humanize** — AI-detection evasion using natural language patterns (20 coins)
- **AI-Bypass Detector** — Perplexity/burstiness manipulation for undetectable output (20 coins)
- **Citation Generator** — 10+ academic citation formats (APA, MLA, Chicago, Harvard, IEEE, AMA, Vancouver, ACS, OSCOLA, Bluebook) (10 coins)

### Industry-Specific Modes
15 modes with dedicated system prompts: `general`, `academic`, `legal`, `medical`, `technical`, `marketing`, `journalism`, `creative`, `business`, `social_media`, `ecommerce`, `finance`, `hr_recruitment`, `education`, `real_estate`, `travel`

### Team Collaboration
- Create teams (up to 50 members), invite via email
- Team style guide: brand voice, tone, approved terms, forbidden terms, custom writing rules
- Real-time forbidden word detection in the editor
- Team-aware AI: all AI output filtered through team style guide constraints
- Content library with approval workflow
- Role-based access: `owner`, `admin`, `member`
- Document presence tracking and versioning

### Document Management
- Cloud-synced documents with auto-save (3-second debounce)
- Word count, character count, reading time tracking
- Favorite documents, version history
- Export: `.txt`, `.pdf` (jsPDF), `.docx` (docx.js)

### Authentication
- Email/password (bcryptjs, 12 rounds)
- Google OAuth
- GitHub OAuth
- 30-day JWT sessions (NextAuth v5 JWE)
- Password reset with 15-minute token expiry, disposable-email blocking, and email enumeration protection

### Economy System
- **SkillsCoins** — consumable currency for AI operations
- 100 welcome coins on signup
- 10 daily login bonus coins (streak-tracked)
- Top-up packs via Razorpay one-time orders
- Monthly subscription tiers (Pro: ₹999/mo, Team: ₹2,999/mo)
- Full transaction ledger and analytics

### Template Library
28+ categorised templates: email, content, business, marketing, social media, academic, technical, legal, HR, real estate, travel — each with AI prompt, variable placeholders, and structural sections

### Notifications System
- In-app notifications (daily bonus, welcome, team invites)
- Email notifications via Resend (team invites, password reset)

### Analytics
- Per-user AI usage analytics: action type, input/output length, coins spent
- Session event tracking
- Audit logs

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Nginx (Port 80)                   │
│              Reverse Proxy / Load Balancer           │
└────────────────┬────────────────┬───────────────────┘
                 │                │
    ┌────────────▼──────┐  ┌──────▼─────────────────┐
    │  Next.js Frontend  │  │  Express.js Backend    │
    │  (Port 3000)       │  │  (Port 4000)           │
    │  Next.js 16        │  │  TypeScript ESM        │
    │  NextAuth v5       │  │  Helmet + CORS         │
    │  TipTap Editor     │  │  Rate Limiting         │
    │  SWR Data Fetching │  │  16 API Routers        │
    │  Tailwind CSS      │  │  Prisma ORM            │
    └────────────────────┘  └────────┬───────────────┘
                                     │
              ┌──────────────────────▼──────────────────────┐
              │              PostgreSQL Database             │
              │  24 tables: users, documents, teams,        │
              │  ai_usage_analytics, coins_transactions,    │
              │  team_style_guides, document_versions, ...  │
              └─────────────────────────────────────────────┘
                                     │
              ┌──────────────────────▼──────────────────────┐
              │            OpenRouter AI Gateway            │
              │  Primary: openai/gpt-4o-mini               │
              │  Supported: GPT-4o, Claude 3, Gemini Pro   │
              └─────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1.6 | React framework, SSR, routing |
| TypeScript | 5.6 | Type safety |
| NextAuth | 5.0.0-beta.30 | Authentication (Google, GitHub, Credentials) |
| TipTap | 3.11 | Rich text editor (StarterKit, Placeholder, Heading, Lists) |
| Tailwind CSS | 3.4 | Utility CSS |
| SWR | 2.4.1 | Data fetching, cache invalidation |
| Framer Motion | 12.23 | Animations |
| jsPDF | 3.0.3 | PDF export |
| docx | 9.5.1 | DOCX export |
| file-saver | 2.0.5 | File download |
| react-hot-toast | 2.6 | Toast notifications |
| zod | 3.25 | Schema validation |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js (ESM) | 20 | Runtime |
| TypeScript | 5.6 | Type safety |
| Express | 4.18.2 | HTTP server |
| Helmet | 8.1 | Security headers |
| express-rate-limit | 8.2 | Rate limiting (100/min global, 20/15min auth, 5/15min password-reset) |
| compression | 1.8 | Gzip response compression |
| cors | 2.8 | CORS with environment-driven origins |
| cookie-parser | 1.4 | JWT cookie parsing |
| Prisma | 5.22 | Type-safe ORM |
| bcryptjs | 3.0 | Password hashing (12 rounds) |
| openai SDK | 4.104 | OpenRouter API client (baseURL override) |
| Razorpay | 2.9.6 | Payments (one-time orders, subscriptions, webhooks) |
| Resend | 6.4.2 | Transactional email |
| next-auth | 5.0-beta | JWT decode for backend middleware |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker + Docker Compose | Multi-service containerisation |
| Nginx (alpine) | Reverse proxy, port 80 |
| PostgreSQL | Primary database |
| AWS (optional) | Avatar/file storage (ap-south-1 region) |

---

## Frontend Architecture

The frontend is a **Next.js 16 App Router** application. All routes use the `/app` directory convention.

### Routes

| Route | Description |
|---|---|
| `/` | Landing page (hero, features, pricing, FAQ, referral) |
| `/login` | Email/password + OAuth login |
| `/signup` | Registration with optional referral code |
| `/forgot-password` | Password reset request |
| `/reset-password` | Token-based password update |
| `/editor` | Main writing workspace |
| `/dashboard` | User overview, documents, analytics widget |
| `/dashboard/analytics` | AI usage stats, coins history |
| `/dashboard/settings` | Profile, preferences, billing |
| `/dashboard/teams` | Team management |
| `/dashboard/teams/[teamId]` | Team detail, members, style guide, content library |
| `/profile` | User profile page |
| `/coin-store` | SkillsCoins purchase (Razorpay) |
| `/admin` | Admin panel |

### Key Components

| Component | Purpose |
|---|---|
| `editor.tsx` | TipTap-based rich text editor with inline AI toolbar |
| `editor/page.tsx` | Full editor page with auto-save, voice input, export, team style guide |
| `EditorToolbar.tsx` | Floating formatting toolbar |
| `AnalyticsCard.tsx` | Usage metrics card |
| `MobileBottomNav.tsx` | Mobile navigation |
| `NotificationCard.tsx` | In-app notification display |
| `ReferralSection.tsx` | Referral code display and sharing |
| `UpgradeButton.tsx` | Subscription upgrade CTA |
| `NewDocumentModal.tsx` | Document creation dialog |
| `RenameModal.tsx` | Document rename dialog |

### Authentication Flow

```
Browser → NextAuth (JWT strategy, 30-day sessions)
         ├── Credentials → POST /api/auth/verify → bcrypt compare
         ├── Google OAuth → signIn callback → POST /api/auth/oauth
         └── GitHub OAuth → signIn callback → POST /api/auth/oauth
                                              ↓
                                    User created/updated in PostgreSQL
                                    JWT sub = user.id (backend DB UUID)
```

The frontend proxy (`src/proxy.ts`) forwards requests to the backend, attaching the NextAuth session token as a `Bearer` header with `X-Auth-Salt` for the backend middleware to decode.

---

## Backend Architecture

The backend is an **Express.js TypeScript ESM** application with a clean separation of concerns:

```
src/
├── index.ts              # App bootstrap, middleware stack, route mounting
├── api/                  # 16 route modules
│   ├── ai.ts             # /api/ai/* — process, advanced, team-process, check-violations
│   ├── auth.ts           # /api/auth/* — verify, oauth, signup
│   ├── bonuses.ts        # /api/bonuses/* — daily, welcome
│   ├── analytics.ts      # /api/analytics/*
│   ├── documents.ts      # /api/documents/* — CRUD
│   ├── docs.ts           # /api/docs/*
│   ├── health.ts         # /api/health
│   ├── notifications.ts  # /api/notifications/*
│   ├── password-reset.ts # /api/password-reset/* — request, verify, reset
│   ├── payment.ts        # /api/payment/* — create-coin-order, verify-coin-payment, create-subscription-order, verify-subscription
│   ├── profile.ts        # /api/profile/*
│   ├── razorpay.ts       # /api/razorpay/* — create-subscription, webhook
│   ├── team-editor.ts    # /api/team-editor/*
│   ├── teams.ts          # /api/teams/* — full CRUD + invite/accept/reject + style guide
│   ├── templates.ts      # /api/templates/*
│   └── transactions.ts   # /api/transactions/*
├── config/
│   └── cors.ts           # Environment-driven CORS
├── emails/
│   ├── sendInviteEmail.ts      # Team invitation email (Resend)
│   └── sendPasswordResetEmail.ts # Password reset email (Resend)
├── lib/
│   ├── ai/modes.ts       # 6 industry mode configs with system prompts
│   ├── disposable-emails.ts    # Blocklist for disposable email domains
│   ├── prisma.ts         # Prisma client singleton
│   ├── utils/plagiarism.ts     # Plagiarism check (simulated, ready for real API)
│   └── validate-env.ts   # Startup environment validation
├── middleware/
│   └── auth.ts           # requireAuth, optionalAuth — NextAuth JWE decode
└── services/
    ├── ai.ts             # processAIRequest, processAdvancedAIRequest
    ├── team-ai.ts        # processTeamAwareAI, checkStyleViolations, getTeamContentSuggestions
    └── razorpay.ts       # Razorpay client singleton
```

### Middleware Stack (in order)

1. `helmet` — 15+ security headers
2. `compression` — Gzip for all responses
3. `rateLimit` — 100 req/min globally, 20/15min for auth, 5/15min for password reset
4. `cors` — Origin whitelist from `FRONTEND_URL`/`CORS_ORIGIN` env vars
5. `express.raw` — Raw body for `/api/razorpay/webhook` only (HMAC verification)
6. `cookie-parser` — Session cookie fallback for `requireAuth`
7. `express.json` — 10MB body limit

---

## Database Architecture

PostgreSQL with Prisma ORM. 24 tables across 3 conceptual domains.

### Core User Domain

```
users                    ← Central identity, subscription_tier, coin_balance
user_profiles            ← coins_balance, total_ai_requests, words_processed, daily_streak, referral_code
accounts                 ← OAuth provider accounts (Google, GitHub)
sessions                 ← NextAuth sessions
verification_tokens      ← Email verification
password_reset_tokens    ← 15-minute cryptographic reset tokens (SHA-256, 64 bytes hex)
notifications            ← In-app notification inbox
audit_logs               ← Admin audit trail
analytics                ← Session event tracking
```

### Document Domain

```
documents                ← title, content, word_count, char_count, is_public, version
revisions                ← Full content snapshots per AI action (tokens_used, cost_usd, model)
document_versions        ← Explicit version history with change notes
document_comments        ← Threaded comments with selection context and resolution state
document_presence        ← Real-time cursor/presence tracking per user per document
document_approvals       ← Approval workflow (draft → submitted → reviewed)
```

### Economy Domain

```
coins_transactions       ← Every debit/credit with action_type
transactions             ← AI operation ledger (action, coins_used, details JSON)
subscriptions            ← Razorpay subscription lifecycle (maps stripe_* fields to Razorpay IDs)
plagiarism_checks        ← Persisted plagiarism check results
ai_usage_analytics       ← Per-request telemetry: input_length, output_length, coins_spent, processing_time_ms
```

### Team Domain

```
teams                    ← name, owner_id, subscription_tier, max_members (50)
team_members             ← user ↔ team with role (owner/admin/member) and status (pending/active)
team_style_guides        ← brand_voice, tone, approved_terms[], forbidden_terms[], custom_rules JSON
team_content_library     ← Approved reusable content snippets, category, tags, usage_count
```

---

## AI Architecture

### Model Configuration
- **Default model**: `openai/gpt-4o-mini` (via OpenRouter)
- **Gateway**: OpenRouter at `https://openrouter.ai/api/v1` using the OpenAI SDK with `baseURL` override
- **Supported models**: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo, Claude 3 Haiku/Sonnet, Gemini Pro

### Prompt Engineering

Each AI request assembles a composite prompt:

```
[Industry Mode System Prompt]   ← domain expert context (15 modes)
        +
[Action-Specific Prompt]        ← grammar/improve/rewrite/summarize/expand/custom
        +
[Tone Instruction]              ← user-selected tone
        +
[User Text]                     ← the actual content
```

For team requests, an additional layer:

```
[Team Style Guide Constraints]  ← brand_voice, tone, approved_terms, forbidden_terms, custom_rules
        +
[AI-processed output]
        +
[Post-processing style violation check]
```

### Temperature & Token Budget

| Action | Temperature | Max Tokens |
|---|---|---|
| `fix_grammar` | 0.1 | 1,500 |
| `improve` | 0.5 | 2,000 |
| `rewrite` | 0.7 | 2,500 |
| `summarize` | 0.3 | 1,000 |
| `expand` | 0.6 | 4,096 |
| `custom` | 0.5 | 4,096 |
| `humanize` | 0.92 | 2,500 |
| `bypass_detector` | 0.95 | 2,500 |

### Response Cleaning

All AI output is post-processed by `cleanAIResponse()` which strips common AI preamble patterns:
- "Here is the corrected text:"
- "Certainly, here is..."
- "I have improved..."
etc.

---

## Authentication & Security

### Authentication

NextAuth v5 JWT strategy with JWE encoding. The backend decodes tokens using `next-auth/jwt`'s `decode()` function with the same `NEXTAUTH_SECRET`. The token `sub` claim carries the database user UUID.

**Multi-path token extraction** (priority order):
1. `Authorization: Bearer <token>` header
2. `__Secure-authjs.session-token` cookie
3. `authjs.session-token` cookie
4. `__Secure-next-auth.session-token` cookie
5. `next-auth.session-token` cookie

### Security Measures

| Layer | Implementation |
|---|---|
| HTTP Headers | Helmet (CSP, HSTS, X-Frame-Options, etc.) |
| Rate Limiting | express-rate-limit: 100/min global, 20/15min auth, 5/15min password-reset |
| Password Hashing | bcryptjs, 12 rounds |
| Password Reset Tokens | `crypto.randomBytes(64)` — 128 hex chars, 15-minute expiry, single-use |
| Payment Signatures | HMAC-SHA256 verification for Razorpay orders and webhooks |
| Webhook Body | `express.raw()` before JSON parsing — prevents signature bypass |
| Email Enumeration | Password reset always returns generic success message |
| Disposable Emails | Blocklist check on signup and password reset |
| CORS | Environment-driven whitelist (not wildcard) |
| DB Cascades | All user data deleted on user deletion (Prisma cascade) |

---

## End-to-End User Workflow

```
1. SIGNUP
   Browser → POST /api/auth/signup
          → bcrypt.hash(password, 12)
          → Prisma nested write: user + user_profile + notification (welcome)
          → 100 SkillsCoins balance set

2. LOGIN
   Browser → NextAuth Credentials → POST /api/auth/verify (backend)
          → bcrypt.compare → session JWT with sub = user.id

3. EDITOR
   Open editor → GET /api/profile (SWR)
              → GET /api/documents (recent 10)
              → GET /api/teams (user's teams)
              → User types → 3s debounce → POST/PUT /api/documents

4. AI REQUEST
   User selects text, clicks "Improve" →
   POST /api/ai/process { action: "improve", text, tone, mode } →
   Backend: coins check → AI call (OpenRouter) → Prisma transaction:
     [user_profiles.coins_balance--,  transactions.create, ai_usage_analytics.create]
   → Response: { result, coinsUsed, remainingCoins }

5. TEAM AI REQUEST
   POST /api/ai/team-process { action, text, teamId, mode } →
   Backend: team access check → coin check → fetchStyleGuide →
   buildTeamAwarePrompt → AI call → checkStyleViolations(result) →
   Prisma transaction → Response: { result, violations, styleGuideApplied }

6. PAYMENT (Coin Top-up)
   POST /api/payment/create-coin-order →
   Razorpay order created → Razorpay.js payment modal →
   POST /api/payment/verify-coin-payment →
   HMAC-SHA256 signature verify → user_profiles.coins_balance += coins

7. SUBSCRIPTION
   POST /api/payment/create-subscription-order →
   Razorpay subscription created → Payment modal →
   POST /api/payment/verify-subscription →
   Signature verify → user.subscription_tier = "pro"|"team"
   → Webhook: subscription.activated → idempotent coin credit
```

---

## Codebase Structure

```
WordSage-prod-grade/
├── backend/
│   ├── src/
│   │   ├── api/              (16 route modules)
│   │   ├── config/           (cors.ts)
│   │   ├── emails/           (Resend transactional emails)
│   │   ├── lib/              (AI modes, Prisma client, utilities)
│   │   ├── middleware/        (auth.ts — requireAuth, optionalAuth)
│   │   ├── services/         (ai.ts, team-ai.ts, razorpay.ts)
│   │   └── index.ts          (Express app, middleware, route mounting)
│   ├── prisma/
│   │   ├── schema.prisma     (24 models)
│   │   └── migrations/       (Prisma migration history)
│   ├── Dockerfile            (Node 20 Alpine, multi-stage)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/              (Next.js App Router — 11 routes)
│   │   ├── components/       (Editor, Dashboard, Notifications, etc.)
│   │   ├── lib/              (API client, utilities)
│   │   ├── types/            (TypeScript interfaces)
│   │   ├── auth.ts           (NextAuth v5 config)
│   │   └── proxy.ts          (Backend proxy)
│   ├── public/               (Static assets)
│   ├── Dockerfile            (Node 20 Alpine, standalone Next build)
│   └── package.json
├── nginx/
│   └── nginx.conf            (Reverse proxy config)
├── docker-compose.yml        (backend, frontend, nginx services)
├── .github/                  (CI/CD workflows)
└── README.md
```

---

## Development Workflow

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Docker + Docker Compose (for containerised dev)

### Local Setup

```bash
# Clone repository
git clone https://github.com/shiteshkhaw/WordSage.git
cd WordSage-prod-grade

# Backend setup
cd backend
cp .env.example .env
# Edit .env with your values (see Environment Variables below)
npm install

# Run Prisma migrations
npx prisma migrate dev
npx prisma generate

# Start backend dev server (tsx watch)
npm run dev

# Frontend setup (separate terminal)
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

### Environment Variables

#### Backend (`backend/.env`)

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/wordsage?sslmode=require"
PORT=4000
NODE_ENV=development

# Auth (must match frontend exactly)
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# CORS
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# AI
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxx
RAZORPAY_PRO_PLAN_ID=plan_xxxxxxxxxxxx
RAZORPAY_TEAM_PLAN_ID=plan_xxxxxxxxxxxx

# OAuth
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx

# Email
RESEND_API_KEY=re_xxxxxxxxxxxx
```

#### Frontend (`frontend/.env`)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<same as backend>
AUTH_SECRET=<same as backend>
BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
GOOGLE_CLIENT_ID=xxxxxxxxxxxx
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxx
GITHUB_CLIENT_ID=xxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxx
```

### Running Locally

```bash
# Backend (port 4000)
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && npm run dev

# Full stack with Docker
docker compose up -d --build
```

### Running with Docker

```bash
docker compose up -d --build

# Services:
# - nginx:    http://localhost:80
# - frontend: http://localhost:3000
# - backend:  http://localhost:4000
```

Docker Compose health checks ensure backend is healthy before frontend starts, and both are healthy before Nginx accepts traffic.

---

## Testing

> **Note**: Automated test suites are not yet implemented in this codebase. The following manual validation procedures are used during development.

### Manual API Testing

```bash
# Health check
curl http://localhost:4000/api/health

# Auth signup
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234","fullName":"Test User"}'

# AI process (requires Bearer token)
curl -X POST http://localhost:4000/api/ai/process \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"fix_grammar","text":"She dont know the answer","mode":"general"}'
```

---

## Deployment

### Docker Compose (Production)

```bash
# Set backend/.env and frontend/.env with production values
docker compose up -d --build
```

### AWS Amplify (Frontend)

An `amplify.yml` is present in the frontend directory for AWS Amplify CI/CD deployment.

### Environment Notes for Production

- Set `NODE_ENV=production` — enables Helmet CSP and reduces rate limits to 100/min
- `NEXTAUTH_SECRET` must be identical on both backend and frontend
- Razorpay live keys replace test keys
- `FRONTEND_URL` and `CORS_ORIGIN` must exactly match the production domain

---

## Performance Characteristics

| Metric | Details |
|---|---|
| AI Response Time | Dependent on OpenRouter/model (~1–3s for gpt-4o-mini) |
| Auto-save | 3-second debounce, non-blocking |
| Database Transactions | Post-AI analytics written in a single `prisma.$transaction()` (3 ops atomically) |
| Rate Limit | 100 req/min per IP (production) |
| Body Limit | 10MB JSON |
| Session Duration | 30 days |
| Password Reset Token | 15-minute expiry, single-use |
| Gzip Compression | Enabled via `compression` middleware |

---

## Security Considerations

- Password hashing: bcryptjs with cost factor 12 (computationally resistant to brute force)
- All DB writes after AI processing are wrapped in `prisma.$transaction()` — no partial updates
- Razorpay webhook signature verified via HMAC-SHA256 before any DB mutation
- Raw body preserved for webhook route (`express.raw`) to prevent signature tampering
- Password reset tokens are cryptographically random (64 bytes / 128 hex chars)
- Generic success responses prevent email enumeration on reset, signup
- Disposable email blocklist on sensitive endpoints
- Auth middleware verifies user exists in DB (prevents deleted-user access with valid tokens)

---

## Known Limitations

- **Plagiarism check** (`/api/ai/advanced`, action `plagiarism_check`) currently uses a **simulated implementation** — not connected to a real plagiarism API (Copyscape, etc.). Clearly marked in source: `backend/src/lib/utils/plagiarism.ts`.
- **Document presence** (`document_presence` table) is stored in PostgreSQL but real-time sync via WebSockets is not implemented — polling only.
- **Document comments and approvals** tables exist in the schema but the full commenting/approval UI is not visible in the audited frontend routes.
- **`subscriptions` table** reuses `stripe_*` field names for Razorpay IDs — a legacy naming inconsistency.
- No automated test suite is present.

---

## Roadmap / Future Enhancements

- [ ] Real-time collaborative editing (WebSocket-based, using `document_presence`)
- [ ] Real plagiarism API integration (Copyscape/PlagiarismCheck.org)
- [ ] Browser extension
- [ ] Automated unit and integration tests
- [ ] Document comment UI and approval workflow UI
- [ ] AI model selector exposed to users
- [ ] Export to Google Docs / Notion

---

## Architecture Diagrams

### Authentication Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant FE as Next.js Frontend
    participant NA as NextAuth v5
    participant BE as Express Backend
    participant DB as PostgreSQL

    B->>FE: POST /api/auth/signin (credentials)
    FE->>NA: authorize(credentials)
    NA->>BE: POST /api/auth/verify
    BE->>DB: findUnique(email)
    DB-->>BE: user record
    BE->>BE: bcrypt.compare(password, hash)
    BE-->>NA: {id, email, full_name}
    NA->>NA: jwt({sub: user.id})
    NA-->>B: Set-Cookie: authjs.session-token (JWE)

    B->>FE: GET /api/profile
    FE->>BE: GET /api/profile + Bearer token
    BE->>BE: decode(token, NEXTAUTH_SECRET)
    BE->>DB: findUnique({id: token.sub})
    DB-->>BE: user verified
    BE-->>FE: profile data
```

### AI Request Lifecycle

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant OR as OpenRouter
    participant DB as PostgreSQL

    U->>FE: Click "Improve" (selected text)
    FE->>BE: POST /api/ai/process {action, text, mode, tone}
    BE->>BE: requireAuth (decode JWT)
    BE->>DB: findUnique(user_profiles)
    DB-->>BE: {coins_balance: 150}
    BE->>BE: coins check (need 10, have 150) ✓
    BE->>BE: buildPrompt(action, mode, tone)
    BE->>OR: chat.completions.create(model, messages)
    OR-->>BE: {result: "Improved text..."}
    BE->>BE: cleanAIResponse(result)
    BE->>DB: $transaction([update profile, create transaction, create analytics])
    DB-->>BE: committed
    BE-->>FE: {result, coinsUsed: 10, remainingCoins: 140}
    FE->>U: Show suggestion panel
```

### Payment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant RZP as Razorpay
    participant DB as PostgreSQL

    U->>FE: Buy "500 Coins" package
    FE->>BE: POST /api/payment/create-coin-order {packageId, coins: 500, amount: 299}
    BE->>RZP: orders.create({amount: 29900, currency: INR})
    RZP-->>BE: {orderId, amount}
    BE-->>FE: {orderId, amount, coins}
    FE->>RZP: Razorpay checkout modal
    U->>RZP: Complete payment
    RZP-->>FE: {razorpay_order_id, razorpay_payment_id, razorpay_signature}
    FE->>BE: POST /api/payment/verify-coin-payment
    BE->>BE: HMAC-SHA256 verify signature
    BE->>DB: user_profiles.coins_balance += 500
    DB-->>BE: updated
    BE-->>FE: {success, coinsAdded: 500, newBalance}
```

---

## Engineering Challenges Solved

1. **Dual-table coin consistency** — `users.coin_balance` and `user_profiles.coins_balance` are kept in sync via explicit dual updates after every subscription event. Identified and documented as an architectural debt.

2. **JWT bridge between Next.js and Express** — NextAuth JWE tokens are decoded on the backend using the same `next-auth/jwt` library, with dynamic salt extraction from `X-Auth-Salt` headers sent by the proxy layer.

3. **Razorpay webhook security** — The webhook route uses `express.raw()` applied before any `express.json()` middleware, preserving the raw body needed for HMAC-SHA256 signature verification. Placing it after body parsing would corrupt the signature check.

4. **Atomic post-AI writes** — Three database writes after every AI call (profile update, transaction log, analytics) are wrapped in `prisma.$transaction([])` to guarantee atomicity — no partial state if one write fails.

5. **Composite prompt architecture** — 15 industry system prompts × 6 action prompts × N tone modifiers compose at runtime, producing domain-aware AI output without fine-tuning.

6. **Team style guide enforcement pipeline** — Text is checked for forbidden words client-side (real-time), then server-side pre-AI (violations report), then the AI prompt is augmented with constraints, then the output is re-checked post-AI for residual violations.

---

## Why This Project Demonstrates Senior-Level Engineering

- **Production infrastructure**: Dockerised multi-service deployment with health checks and dependency ordering.
- **Security depth**: Rate limiting at 3 tiers, HMAC webhook verification, anti-enumeration measures, disposable email blocking, bcrypt cost 12.
- **Database design**: 24 normalised tables covering identity, content, economy, and collaboration domains — not a CRUD toy.
- **AI prompt engineering**: Composite prompts combining domain expertise + action specificity + team constraints, with per-action temperature tuning.
- **Payment integration**: Full Razorpay lifecycle — order creation, HMAC verification, subscription management, webhook handling (activated/charged/cancelled/failed).
- **Economy design**: Coin-based economy with atomic transactions, welcome bonuses, daily streaks, and top-up purchases — not a trivial feature.
- **Team collaboration layer**: Style guide enforcement at the prompt level (not just UI), with violation reporting on both input and output.

---

## Recruiter Summary

WordSage is a **production-grade, full-stack SaaS** built with Next.js 16, Express.js, TypeScript, PostgreSQL, and Docker. It implements AI-powered writing assistance via OpenRouter, a team collaboration system with style guide enforcement, a coin-based economy backed by Razorpay payments, and secure authentication with three providers. The codebase demonstrates database architecture (24 tables), security engineering (HMAC, JWE, rate limiting, bcrypt), prompt engineering (15 domain modes × 6 actions), and real-world product thinking (streak systems, referrals, notifications, export).

---

## Resume Summary

> **WordSage** — Full-stack AI writing SaaS. Built with Next.js 16, Express.js (TypeScript), PostgreSQL (Prisma ORM), and Docker. Implemented OpenRouter-backed multi-model AI with 15 industry writing modes; team collaboration with real-time style guide enforcement; Razorpay subscription and coin-purchase payment system with HMAC webhook verification; NextAuth v5 JWT authentication (Google, GitHub, Credentials); and Docker Compose production deployment with Nginx reverse proxy. 24-table database schema covering user identity, document management, team collaboration, and economy systems.

---

## License

MIT License — © 2025 WordSage. CoFounder: Shitesh K Khaw.

---

## Contributors

- **Shitesh K Khaw** — Founder & Lead Engineer
