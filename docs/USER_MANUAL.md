# WordSage User Manual

> **Audience**: End users — individual writers and team administrators.

---

## Getting Started

### Creating Your Account

WordSage supports three sign-up methods:

**Email and Password**
1. Navigate to `/signup`
2. Enter your full name, email address, and a password
   - Password requirements: 8+ characters, at least one uppercase letter, one lowercase letter, one number
3. Click **Create Account**
4. **100 SkillsCoins** are automatically credited to your account as a welcome bonus

**Google Sign-In**
1. Navigate to `/login`
2. Click **Continue with Google**
3. Authorise the app in the Google consent screen
4. Your account is created automatically; **100 SkillsCoins** are credited

**GitHub Sign-In**
1. Navigate to `/login`
2. Click **Continue with GitHub**
3. Authorise the app
4. Your account is created; **100 SkillsCoins** are credited

> **Note**: If you sign up with Google or GitHub and later try to sign in with email/password, your login will be rejected because no password is set. Use the same provider you signed up with.

---

### Password Reset

If you forget your password:

1. Navigate to `/forgot-password`
2. Enter your registered email address
3. Click **Send Reset Link**
   - A generic confirmation message is shown regardless of whether the email exists (security measure)
4. Check your inbox for a password reset email from WordSage
5. Click the reset link — it is valid for **15 minutes**
6. Enter your new password (same strength requirements apply)
7. Sign in with your new password

> **Disposable email addresses** (e.g., mailinator.com, 10minutemail.com) are not accepted on this form.

---

## The Dashboard

After signing in, you arrive at the **Dashboard** (`/dashboard`). The dashboard is your command centre:

- **Document overview** — your recent documents with word count and last-updated time
- **Coin balance** — your current SkillsCoins balance, prominently displayed
- **Analytics summary** — AI requests made, words processed, coins spent (links to `/dashboard/analytics`)
- **Daily streak** — your consecutive daily login bonus streak
- **Quick links** to the Editor, Team management, Settings, and Coin Store

### Dashboard Navigation (Sidebar)

| Section | What It Does |
|---|---|
| Dashboard | Home overview |
| Editor | Open the writing workspace |
| Analytics | Detailed AI usage statistics |
| Teams | Create or manage teams |
| Settings | Profile, preferences, billing |
| Coin Store | Buy more SkillsCoins |

---

## The Editor

Navigate to `/editor` (or click **Editor** in the sidebar). This is where all writing and AI work happens.

### Layout Overview

```
┌──────────────────────────────────────────────────────┐
│ ☰  ←  [Document Title]  ⭐  |  Saved ✓  | 💰 150  🎤  ↓ │  ← Top Toolbar
├──────────────────────────────────────────────────────┤
│ [Mode Selector]  [Templates]  [Style Guide]          │  ← Feature Bar
├──────────────────────────────────────────────────────┤
│                                                      │
│   Your document text...                             │  ← Writing Area
│                                                      │
├──────────────────────────────────────────────────────┤
│ 📄 247 words | 🔤 1,432 chars | ⏱️ 2 min           │  ← Status Bar
└──────────────────────────────────────────────────────┘
```

### Top Toolbar Buttons

| Button | Function |
|---|---|
| ☰ (hamburger) | Open/close Documents sidebar |
| ← (arrow) | Return to Dashboard |
| Document title input | Click to rename the document |
| ⭐ | Toggle favourite status for the saved document |
| Saved / Saving indicator | Auto-save status |
| 💰 [number] | Your current SkillsCoins balance |
| 🎤 | Toggle voice input (requires microphone permission) |
| ↓ (download) | Export document (TXT, PDF, DOCX) |

---

### Documents Sidebar

Click the ☰ button to reveal the Documents sidebar:
- Lists your last 10 documents sorted by most recently updated
- **+ New Document** button clears the editor for a fresh document
- Click any document to load it
- Each entry shows title, word count, and last-updated date
- A ⭐ icon appears on favourited documents
- **Delete** removes the document permanently

---

### Writing Modes

The **Mode Selector** in the Feature Bar lets you choose the domain context for AI processing.

Selecting a mode changes how the AI interprets your text and what terminology, tone, and structure it applies.

| Mode | Best For |
|---|---|
| 📝 General | Blogs, articles, everyday writing |
| ⚖️ Legal | Contracts, NDAs, legal briefs, terms of service |
| 🏥 Medical | Patient notes, case studies, SOAP-format reports |
| 💻 Technical | API docs, user manuals, README files, developer guides |
| 🎓 Academic | Research papers, essays, literature reviews, dissertations |
| 💼 Business | Proposals, executive summaries, reports, business emails |
| 📣 Marketing | Ad copy, landing pages, product descriptions |
| 📰 Journalism | Press releases, news articles |
| ✍️ Creative | Short stories, creative essays |
| 📱 Social Media | Posts for Twitter, LinkedIn, Instagram |
| 🛍️ E-Commerce | Product listings, category descriptions |
| 💰 Finance | Financial reports, investment summaries |
| 👥 HR | Job descriptions, performance reviews, HR policies |
| 🎓 Education | Lesson plans, curriculum content |
| 🏠 Real Estate | Property listings, neighbourhood guides |
| ✈️ Travel | Destination guides, travel itineraries |

> Your preferred mode is saved to your profile when you change it. It will be pre-selected the next time you open the editor.

---

### AI Actions

The AI panel is on the right side of the editor. Each action has a **coin cost** displayed next to it.

#### Standard Actions

**Fix Grammar** *(5 coins)*
Corrects grammar, spelling, punctuation, capitalisation errors, incorrect articles, and preposition usage. Use this when you want your original content preserved but errors fixed.

**Improve** *(10 coins)*
Enhances clarity, readability, and engagement while preserving your voice. The AI adapts to your selected mode and tone.

**Rewrite** *(15 coins)*
Fully restructures and rewrites your content. The core message is preserved but the phrasing, structure, and flow are transformed. Use for significant quality improvement.

**Summarize** *(8 coins)*
Compresses your text to approximately 20–30% of its original length while retaining all key points. Ideal for creating abstracts, executive summaries, or TL;DRs.

**Expand** *(15 coins)*
Grows your bullet points or outline into full paragraphs. Useful for drafting content from notes.

**Custom Prompt** *(20 coins)*
Type any instruction — "Make this sound more British", "Convert to Q&A format", "Add statistics", etc. The AI will follow your exact instruction.

---

#### Advanced AI Features

Click the **Advanced** panel in the editor to access:

**Plagiarism Check** *(30 coins)*
Analyses your text for potential similarity to existing online sources. Returns a similarity percentage and a list of flagged source URLs.

> ⚠️ Note: The plagiarism detection feature is currently in simulation mode and does not query live external databases. Treat results as indicative only.

**Rewrite Unique** *(25 coins)*
Performs deep structural and syntactic transformation targeting maximum originality. Goes beyond surface-level rewrites to produce text with low similarity scores.

**Humanize** *(20 coins)*
Transforms robotic or AI-generated text into natural, varied human-sounding prose. Useful for making templated content feel authentic.

**AI-Bypass Detector** *(20 coins)*
Adjusts your text using linguistic diversity techniques (perplexity and burstiness manipulation) to produce output that scores as human-written in AI-detection tools.

**Citation Generator** *(10 coins)*
Takes your source details and generates a properly formatted citation. Supported formats:
- APA 7th Edition
- MLA 9th Edition
- Chicago (Author-Date)
- Harvard
- IEEE
- AMA (American Medical Association)
- Vancouver
- ACS (American Chemical Society)
- OSCOLA (legal citations)
- Bluebook (legal citations)

---

### Tone Selection

Below the mode selector, you can set the tone for AI output:

| Tone | Description |
|---|---|
| Neutral | Balanced, no strong stylistic preference |
| Formal | Professional, business-appropriate |
| Casual | Conversational and approachable |
| Academic | Scholarly, third-person, evidence-focused |
| Friendly | Warm and personable |
| Confident | Assertive and decisive |
| Empathetic | Understanding and caring |
| Enthusiastic | Energetic and passionate |
| Technical | Precise, jargon-appropriate |
| Creative | Expressive and imaginative |

---

### Template Library

Click **📄 Templates** in the Feature Bar to open the template browser. Templates pre-fill the editor with a structured outline, saving you time on formatting.

**Available Template Categories**:

| Category | Examples |
|---|---|
| 📧 Email | Professional Email, Cold Outreach, Follow-up |
| 📝 Content | Blog Post, LinkedIn Article, How-To Guide |
| 💼 Business | Meeting Notes, Executive Summary, Project Proposal, Case Study |
| 📢 Marketing | Product Description, Landing Page, Ad Copy, Press Release |
| 📱 Social Media | Social Post, Twitter Thread, LinkedIn Post |
| 🎓 Academic | Research Summary, Thesis Statement |
| 🔧 Technical | API Documentation, README.md, Release Notes |
| ⚖️ Legal | Terms of Service, Privacy Policy |
| 👥 HR | Job Description, Performance Review |
| 🏠 Real Estate | Property Listing |
| ✈️ Travel | Destination Guide |

When you select a template:
1. The editor mode switches to match the template's domain
2. The document title is set to the template name
3. The content area fills with structured sections as headings
4. Each section has a `[Write your content here]` placeholder

---

### Voice Input

If your browser supports the Web Speech API (Chrome, Edge), a microphone button (🎤) appears in the top toolbar.

**To use voice input**:
1. Click 🎤 — the browser will request microphone permission on first use
2. Speak clearly — transcribed text is appended to your document in real time
3. Click 🎤 again to stop listening

> Voice input uses `continuous: true` mode — it keeps listening until you click stop. The button pulses red while active.

---

### Exporting Documents

Click the **↓** button in the top toolbar to see export options:

| Format | What You Get |
|---|---|
| 📄 Export as TXT | Plain text file with title and content |
| 📕 Export as PDF | PDF with formatted title in bold and body text |
| 📘 Export as DOCX | Microsoft Word document with styled title and body |

---

### AI Suggestion History

Every AI response generates a **suggestion card** in the suggestions panel. Each card shows:
- The AI action performed
- The original text (trimmed)
- The AI-generated suggestion
- Timestamp
- An **Accept** button to replace your document content with the suggestion

You can accumulate multiple suggestions during a session and choose which to accept.

---

## SkillsCoins

SkillsCoins are the currency consumed by AI operations.

### Earning Coins

| Source | Amount | Conditions |
|---|---|---|
| Welcome bonus | 100 coins | Once, on account creation |
| Daily login bonus | 10 coins | Once per calendar day (UTC) |
| Pro subscription | 1,000 coins | Monthly, on renewal |
| Team subscription | 5,000 coins | Monthly, on renewal |
| Coin top-up packs | Varies | Purchased via Coin Store |

### Daily Login Bonus

- Visit the dashboard or editor each day to claim your **10 coins**
- Your **streak count** increases each consecutive day you claim
- Missing a day resets your streak to 1

### Buying Coins

Navigate to `/coin-store` to purchase additional coins:
1. Select a coin package
2. Click **Buy**
3. Complete payment via the Razorpay checkout modal (cards, UPI, net banking)
4. Coins are credited instantly to your balance

### Coin Spending

All AI operations deduct coins from your `user_profiles.coins_balance`. If your balance is insufficient for an operation, the request is rejected with a clear error message before any AI call is made.

---

## Teams

Teams allow multiple users to collaborate using shared **style guides** and **content libraries**.

### Creating a Team

1. Navigate to **Dashboard → Teams**
2. Click **Create Team**
3. Enter a team name
4. Your subscription tier is shown (Team tier supports up to 50 members)

### Inviting Members

1. Open your team (click it in the Teams list)
2. Click **Invite Member**
3. Enter the invitee's email address
4. They receive an invitation email with an accept/reject link

### Member Roles

| Role | Permissions |
|---|---|
| Owner | All permissions, can delete team, change subscription |
| Admin | Invite/remove members, edit style guide, manage content library |
| Member | Use team style guide in editor, view content library |

### Team Roles and Status

A member's invitation starts with status `pending`. Once accepted, status becomes `active`. You can remove members or change roles from the Team settings page.

---

## Style Guides

A **Style Guide** is the most powerful team feature. It makes the AI automatically enforce your organisation's writing standards.

### Configuring a Style Guide

Go to **Dashboard → Teams → [Your Team] → Style Guide**.

**Brand Voice** — The overall personality of your writing:
- Professional, Casual, Technical, Creative, Persuasive, Educational

**Tone** — The emotional register:
- Formal, Friendly, Confident, Empathetic, Enthusiastic, Neutral

**Approved Terms** — Words your team prefers. The AI will use these when relevant.
- Example: "customer" instead of "user"; "solution" instead of "product"

**Forbidden Terms** — Words your team bans. The AI will never produce these.
- Example: "cheap", "unfortunately", competitor brand names

**Custom Rules**:
- Writing Style: e.g., "Use active voice only"
- Sentence Length: e.g., "Keep sentences under 20 words"
- Paragraph Structure: e.g., "One idea per paragraph"
- Formatting Preferences: e.g., "Use numbered lists for steps"
- Industry Jargon: Specialist terms that are acceptable
- Target Audience: e.g., "Senior HR professionals"

---

### Using a Style Guide in the Editor

1. Open the editor (`/editor`)
2. In the Feature Bar, you'll see a **Style Guide** dropdown if you belong to any teams
3. Select your team from the dropdown
4. The active style guide panel appears, showing:
   - Brand Voice and Tone
   - Approved terms (green badges)
   - Forbidden terms (red badges)

**Real-time enforcement**: As you type, the editor scans your content for forbidden terms. Any matches appear in a red warning bar with the offending words highlighted.

**AI enforcement**: When you run any AI action with a style guide active, the backend:
1. Checks your input for violations (reported in the UI)
2. Builds an AI prompt that instructs the model to use approved terms and avoid forbidden terms
3. Checks the AI output for residual violations (reported in the UI)

The AI output respects your brand voice, tone, and all custom rules.

---

## Team Content Library

The **Content Library** stores approved reusable content snippets for your team — standard boilerplate, approved product descriptions, company background paragraphs, legal disclaimers, etc.

### Adding Content to the Library

1. Go to **Dashboard → Teams → [Your Team] → Content Library**
2. Click **Add Content**
3. Enter a title, the content body, category, and tags
4. Submit for approval (admins can approve immediately; members submit for admin review)

### Using Content from the Library

When working in the editor with a team selected, the system can suggest approved content snippets matching your current context.

---

## Analytics

### Personal Analytics (`/dashboard/analytics`)

Tracks your AI usage:
- Total AI requests by action type
- Words processed (input + output)
- Coins spent over time
- Most-used modes
- Daily usage pattern

### How Data Is Captured

Every AI request creates a record in `ai_usage_analytics` with:
- `action_type` — what was requested
- `input_length` — characters in your text
- `output_length` — characters in the AI output
- `coins_spent` — cost of the operation
- `processing_time_ms` — response time
- `mode` — selected industry mode

---

## Settings

Navigate to **Dashboard → Settings** to manage:

### Profile Settings
- Full name
- Avatar URL
- Country and currency (used for billing localisation)

### Writing Preferences
- Default mode (applied when you open a new document)
- Preferred tone

### Subscription & Billing
- Current subscription tier (Free / Pro / Team)
- Upgrade button (redirects to Razorpay checkout)

### Password
- Change password (email/password accounts only)

### Delete Account
- Permanently deletes your account and all associated data

---

## Notifications

In-app notifications appear in the notification centre (bell icon in the dashboard):

| Notification Type | When |
|---|---|
| Welcome bonus | On account creation |
| Daily login bonus | On each daily bonus claim (shows streak count) |
| Team invite | When someone invites you to a team |
| Subscription activated | When your Razorpay subscription becomes active |

Notifications are persistent (stored in the database, not ephemeral toast only) and can be dismissed from the notification centre.

---

## Subscription Tiers

| Feature | Free | Pro | Team |
|---|---|---|---|
| SkillsCoins on signup | 100 | — | — |
| Monthly coins (subscription) | — | 1,000 | 5,000 |
| Monthly price | Free | ₹999/month | ₹2,999/month |
| AI writing modes | All 15 | All 15 | All 15 |
| Document storage | Unlimited | Unlimited | Unlimited |
| Team collaboration | — | — | Up to 50 members |
| Style guide | — | — | ✓ |
| Content library | — | — | ✓ |
| Export formats | TXT, PDF, DOCX | TXT, PDF, DOCX | TXT, PDF, DOCX |
| Daily login bonus | ✓ | ✓ | ✓ |

---

## Frequently Asked Questions

**Q: Do my SkillsCoins expire?**
A: No. Purchased coins do not expire. Monthly subscription coins are refreshed on each billing cycle.

**Q: What happens if I run out of coins mid-operation?**
A: The operation is rejected before it reaches the AI. Your content is not modified and no coins are deducted.

**Q: Can I use multiple style guides?**
A: You can belong to multiple teams, each with its own style guide. In the editor, you select one active style guide at a time via the team dropdown.

**Q: Can I undo an AI suggestion?**
A: AI suggestions are shown in the suggestion panel — they do not automatically replace your content. You must click **Accept** to apply a suggestion. If you accepted by mistake, the previous content is visible in the suggestion panel as "Original" until your session ends.

**Q: Can I cancel my subscription?**
A: Yes. Razorpay subscriptions can be cancelled from your billing settings. On cancellation, your subscription downgrades to Free and your coin balance resets to 100.

**Q: Is my document data private?**
A: Documents are stored in your account and are not public by default. Documents have a `is_public` field — the default is private.

**Q: Why is my daily bonus not showing?**
A: The daily bonus resets at UTC midnight. If you already claimed it today, the next claim becomes available after UTC 00:00.

**Q: What citation formats are supported?**
A: APA 7th, MLA 9th, Chicago (Author-Date), Harvard, IEEE, AMA, Vancouver, ACS, OSCOLA, and Bluebook.

**Q: Can I use voice input on mobile?**
A: Voice input uses the Web Speech API, which is supported in Chrome on Android. It is not supported in all mobile browsers (e.g., Firefox Mobile, Safari on older iOS).

**Q: How is my password stored?**
A: Passwords are hashed using bcryptjs with a cost factor of 12. Your plaintext password is never stored.

---

## Keyboard Shortcuts

The editor textarea accepts standard OS-level text editing shortcuts. The following editor actions have implicit shortcuts via the AI toolbar buttons.

| Action | How to Trigger |
|---|---|
| Save document | Automatic (3-second debounce after any change) |
| New document | Click **+ New Document** in the sidebar |
| Toggle sidebar | Click ☰ in the top toolbar |
| Open templates | Click **📄 Templates** in the Feature Bar |
| Voice input | Click 🎤 in the top toolbar |

---

## Troubleshooting

**The AI returned an error saying "Insufficient coins"**
→ Your balance is too low for the requested action. Visit `/coin-store` to top up, or wait for your daily login bonus.

**The AI returned a strange response with a preamble like "Here is the improved text:"**
→ This should not normally happen — the backend strips common preamble patterns. If you see it, the response cleaning step did not catch the pattern. Use the suggestion as-is or re-run the action.

**My document did not save**
→ Check the auto-save indicator. If it shows "error", check your internet connection and try again. You can also manually save by refreshing the page (your last auto-save attempt will be the document state).

**Voice input stopped working**
→ Ensure the browser has microphone permission (check your browser's site settings). If using Chrome, try reloading the page. Safari and Firefox have limited Web Speech API support.

**I accepted an AI suggestion but want the original back**
→ Check the suggestion panel — your original text is visible in the "Original" field of the suggestion card. You can manually copy it back.

**Team style guide is not appearing in the editor**
→ Ensure you are an active member of the team (invitation must be accepted). Reload the editor page. The team must have a style guide configured — if it was just created, allow a few seconds and reload.

**Password reset email did not arrive**
→ Check your spam folder. Reset links are sent from a WordSage Resend-verified domain. Ensure you used the exact email address registered to your account. Wait up to 2 minutes before requesting another link.
