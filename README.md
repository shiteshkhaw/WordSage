# WordSage - AI Writing Assistant

<p align="center">
  <img src="frontend/public/logo.png" alt="WordSage Logo" width="120"/>
</p>

<p align="center">
  <strong>Transform your writing with AI-powered intelligence</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#project-structure">Structure</a> •
  <a href="#api-reference">API</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## Overview

WordSage is an AI-powered writing assistant that helps you write better, faster, and with more confidence. Whether you're crafting emails, writing reports, or creating content, WordSage provides real-time suggestions, grammar fixes, and intelligent rewriting capabilities.

## Features

### ✍️ AI-Powered Writing
- **Grammar & Spelling Check** - Instant corrections with explanations
- **Rewrite Suggestions** - Multiple ways to express your ideas
- **Tone Adjustment** - Switch between formal, casual, and professional tones
- **Summarization** - Condense long text into key points

### 📝 Smart Editor
- **Auto-save** - Never lose your work
- **Document Organization** - Folders and favorites
- **Templates** - Quick-start with pre-built structures
- **Voice Input** - Speak to write

### 👥 Team Collaboration
- **Team Style Guides** - Enforce brand voice and terminology
- **Shared Templates** - Consistent content across teams
- **Approved/Forbidden Terms** - Keep writing on-brand

### 💰 SkillsCoins Economy
- **Daily Bonuses** - Free coins every day
- **Referral Rewards** - Earn by inviting friends
- **Flexible Pricing** - Pay-as-you-go model

### 📤 Export Options
- **TXT** - Plain text export
- **PDF** - Formatted document export
- **DOCX** - Microsoft Word compatible

---

## Getting Started

### Prerequisites

- **Node.js** v18.18.0 or higher (v20+ recommended)
- **npm** v9+ or **yarn**
- **PostgreSQL** database (or Supabase)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/WordSage.git
   cd WordSage
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   npm install
   ```

4. **Configure environment variables**
   
   Create `.env` files in both `frontend/` and `backend/` directories:

   **Frontend (.env)**
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   
   # OAuth Providers
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GITHUB_ID=your-github-id
   GITHUB_SECRET=your-github-secret
   
   # API
   NEXT_PUBLIC_API_URL=http://localhost:5000
   
   # Payment (Razorpay)
   NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key
   ```

   **Backend (.env)**
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/wordsage
   JWT_SECRET=your-jwt-secret
   
   # AI Provider
   GROQ_API_KEY=your-groq-api-key
   OPENAI_API_KEY=your-openai-api-key
   
   # Razorpay
   RAZORPAY_KEY_ID=your-razorpay-key
   RAZORPAY_KEY_SECRET=your-razorpay-secret
   ```

5. **Run database migrations**
   ```bash
   cd backend
   npm run migrate
   ```

6. **Start the development servers**
   
   **Terminal 1 - Backend:**
   ```bash
   cd backend
   npm run dev
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

7. **Open the app**
   
   Visit [http://localhost:3000](http://localhost:3000)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router |
| **React 18** | UI library |
| **Tailwind CSS** | Utility-first styling |
| **NextAuth.js** | Authentication |
| **TipTap** | Rich text editor components |
| **Framer Motion** | Animations |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express** | Web framework |
| **PostgreSQL** | Database |
| **Prisma** | ORM |

### AI & Services
| Service | Purpose |
|---------|---------|
| **Groq** | Fast AI inference |
| **OpenAI** | Advanced language models |
| **Razorpay** | Payment processing |
| **Resend** | Email delivery |

---

## Project Structure

```
WordSage/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── dashboard/   # User dashboard
│   │   │   ├── editor/      # Writing editor
│   │   │   ├── login/       # Authentication
│   │   │   └── api/         # API routes
│   │   ├── components/      # React components
│   │   └── lib/             # Utilities
│   ├── public/              # Static assets
│   └── tailwind.config.js   # Tailwind configuration
│
├── backend/                  # Express API server
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   └── middleware/      # Auth, validation
│   └── prisma/              # Database schema
│
├── database/                 # SQL migrations
├── packages/                 # Shared packages
└── docker-compose.yml       # Container orchestration
```

---

## API Reference

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signin` | POST | Sign in with credentials |
| `/api/auth/signup` | POST | Create new account |
| `/api/auth/signout` | POST | Sign out |

### Documents
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents` | GET | List all documents |
| `/api/documents` | POST | Create document |
| `/api/documents/:id` | GET | Get document |
| `/api/documents/:id` | PUT | Update document |
| `/api/documents/:id` | DELETE | Delete document |

### AI Processing
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/process` | POST | Process text with AI |
| `/api/ai/grammar` | POST | Check grammar |
| `/api/ai/rewrite` | POST | Rewrite text |
| `/api/ai/summarize` | POST | Summarize text |

### Teams
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/teams` | GET | List user's teams |
| `/api/teams` | POST | Create team |
| `/api/teams/:id/style-guide` | GET | Get style guide |
| `/api/teams/:id/style-guide` | PUT | Update style guide |

### Coins
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profile` | GET | Get profile + balance |
| `/api/coins/daily` | POST | Claim daily bonus |
| `/api/coins/purchase` | POST | Purchase coins |

---

## Environment Variables

### Frontend Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_URL` | Yes | App URL (http://localhost:3000) |
| `NEXTAUTH_SECRET` | Yes | Session encryption key |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret |
| `GITHUB_ID` | No | GitHub OAuth app ID |
| `GITHUB_SECRET` | No | GitHub OAuth secret |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | No | Razorpay public key |

### Backend Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing key |
| `GROQ_API_KEY` | Yes* | Groq API key |
| `OPENAI_API_KEY` | Yes* | OpenAI API key |
| `RAZORPAY_KEY_ID` | No | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | No | Razorpay secret |

*At least one AI provider is required

---

## Scripts

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Backend
```bash
npm run dev      # Start with hot reload
npm run start    # Start production server
npm run migrate  # Run database migrations
npm run seed     # Seed database
```

---

## Deployment

### Docker
```bash
docker-compose up -d
```

### Vercel (Frontend)
1. Connect GitHub repository
2. Set environment variables
3. Deploy

### Railway/Render (Backend)
1. Connect GitHub repository
2. Set environment variables
3. Configure PostgreSQL addon
4. Deploy

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is proprietary software. All rights reserved.

---

## Support

- 📧 Email: shiteshkhaw@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/Makhija-Quantum-AI/WordSageissues)

---

<p align="center">
  Made with Consciousness by <a href="#">Makhija Quantum AI</a>
</p>
