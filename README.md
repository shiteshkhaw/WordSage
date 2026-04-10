<div align="center">
  <img src="https://via.placeholder.com/150/4F46E5/FFFFFF?text=WordSage" alt="WordSage Logo" width="120" />
  <h1>WordSage</h1>
  <p><strong>Premium, Next-Generation AI Writing & Content Assistant</strong></p>
  
  <p>
    <a href="#features">Features</a> • 
    <a href="#architecture">Architecture</a> • 
    <a href="#getting-started">Getting Started</a> • 
    <a href="#tech-stack">Tech Stack</a>
  </p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
  [![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748)](https://www.prisma.io/)
  [![SWR](https://img.shields.io/badge/SWR-Data%20Fetching-EF4444)](https://swr.vercel.app/)
</div>

---

## 🎬 Application Demo

<div align="center">
  <img src="docs/demo.webp" alt="WordSage Demonstration" width="100%" />
</div>

*(Demonstrating the optimized Zero-Latency SWR Dashboard and AI workflows).*

---

## ✨ Features

- **Brain-to-Text AI Models**: Powered natively by `openai/gpt-4o` for unmatched contextual accuracy and reasoning.
- **Zero-Latency Global State**: Implemented with SWR (`stale-while-revalidate`), utilizing aggressive optimistic UI updates for real-time SkillCoins balance synchronization.
- **Stealth-Warming Infrastructure**: Intelligent background polling dynamically preempts cloud cold-starts during authentication flows, mitigating FCP (First Contentful Paint) delays.
- **Advanced Document Editor**: Feature-rich, highly optimized text workspace with integrated grammar, style-guide compliance, and real-time word tracing.
- **Comprehensive Analytics Engine**: Rich client-side data visualizations with robust exporting (CSV/PDF) to monitor content performance daily.

---

## 🏗 System Architecture

The application is structured into decoupled microservices, communicating securely through Next.js API routes and robust Express middleware.

```mermaid
graph TD
    %% FAANG Architecture Diagram
    subgraph Client [Frontend / Next.js Client]
        UI[React UI Components]
        SWR[(SWR Global Cache)]
        UI -->|Subscribes| SWR
    end

    subgraph API [Next.js API Layer]
        AuthRoute[/api/auth/*]
        ProxyRoute[/api/proxy/*]
    end

    subgraph Backend [Express Microservices]
        Sec[Auth & Rate Limiting]
        Core[Document & Profile Services]
        AIEngine[AI Routing & OpenRouter]
    end

    subgraph Database [PostgreSQL / Neon DB]
        Prisma[Prisma Prisma Client]
    end

    Client -->|REST & JWT| API
    API -->|Protected Internal Requests| Backend
    Backend -->|Atomic Transactions| Database
    AIEngine -->|Inference Requests| OpenRouter[OpenRouter API (GPT-4o)]
```

### Core Design Decisions
1. **SWR for UI Orchestration**: Rather than using bloated state managers, global application state (like User Profiles & Analytics) is dynamically bound to cached SWR hooks yielding instantaneous `0ms` component repaints.
2. **PostgreSQL Atomic Writes**: User `SkillCoins` manipulation during AI inferences leverages strict Prisma ACID transactions to prevent race conditions during parallel AI requests.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Postgres Database (Neon DB recommended)
- OpenRouter API Key

### 1. Backend Setup
```bash
cd backend
npm install

# Environment variables
cp .env.example .env
# Make sure to populate DATABASE_URL, JWT_SECRET, and OPENROUTER_API_KEY

npx prisma db push
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install

# Environment variables
cp .env.example .env
# Set NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

npm run dev
```
Visit `http://localhost:3000` to interact with WordSage.

---

## 🛡 Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Frontend** | Next.js 14, React, Tailwind CSS | High-performance isomorphic JavaScript framework |
| **State** | SWR | Stale-while-revalidate caching and real-time syncing |
| **Backend** | Node.js, Express.js | Scalable API orchestration and business logic |
| **Database** | PostgreSQL, Prisma ORM | Relational data persistence with strict typings |
| **AI/ML** | OpenRouter (GPT-4o) | Routing layer for state-of-the-art LLM inference |
| **Security** | NextAuth, JWT, Bcrypt | Cryptographically robust session and identity management |

---
<div align="center">
  <i>Engineered for scale and precision.</i>
</div>
