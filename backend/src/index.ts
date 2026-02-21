import "dotenv/config";
import { validateEnv } from "./lib/validate-env.js";

// Validate environment before starting
validateEnv();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { healthRouter } from "./api/health.js";
import { authRouter } from "./api/auth.js";
import { docsRouter } from "./api/docs.js";
import { aiRouter } from "./api/ai.js";
import { paymentRouter } from "./api/payment.js";
import { razorpayRouter } from "./api/razorpay.js";
import { teamsRouter } from "./api/teams.js";
import { profileRouter } from "./api/profile.js";
import { docsRouter as documentsRouter } from "./api/documents.js";
import { transactionsRouter } from "./api/transactions.js";
import { bonusesRouter } from "./api/bonuses.js";
import { templatesRouter } from "./api/templates.js";
import { analyticsRouter } from "./api/analytics.js";
import { teamEditorRouter } from "./api/team-editor.js";

/* ---------------------------------------------
   ENVIRONMENT VALIDATION (STARTUP)
---------------------------------------------- */
const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
   console.error('❌ FATAL: Missing required environment variables:');
   missingEnvVars.forEach(v => console.error(`   - ${v}`));
   console.error('');
   console.error('Please set these variables in your .env file or environment.');
   console.error('See .env.example for reference.');
   process.exit(1);
}

console.log('✅ Environment validation passed');

const app = express();
const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

/* ---------------------------------------------
   SECURITY HEADERS (Helmet)
---------------------------------------------- */
app.use(helmet({
   contentSecurityPolicy: isProduction ? undefined : false, // Disable CSP in dev for hot reload
   crossOriginEmbedderPolicy: false, // Allow embedding for OAuth flows
}));

/* ---------------------------------------------
   COMPRESSION (Gzip for production)
---------------------------------------------- */
app.use(compression());

/* ---------------------------------------------
   RATE LIMITING (DDoS protection)
---------------------------------------------- */
const limiter = rateLimit({
   windowMs: 60 * 1000, // 1 minute
   max: isProduction ? 100 : 1000, // More lenient in dev
   message: { error: 'Too many requests, please try again later.' },
   standardHeaders: true,
   legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 minutes
   max: 20, // 20 attempts per 15 min
   message: { error: 'Too many auth attempts, please try again later.' },
});

/* ---------------------------------------------
   CORS CONFIG (Production-ready)
---------------------------------------------- */
import { corsOptions, handleCorsError } from "./config/cors.js";

/* ---------------------------------------------
   CORS CONFIG (Production-ready)
   Centralized configuration from src/config/cors.ts
---------------------------------------------- */
app.use(cors(corsOptions));
// Explicitly handle preflight for all routes to ensure proper OPTIONS handling
app.options("*", cors(corsOptions));

import cookieParser from "cookie-parser";

/* ---------------------------------------------
   RAZORPAY WEBHOOK (RAW BODY)
---------------------------------------------- */
// MUST be above any express.json() usage
app.use(
   "/api/razorpay/webhook",
   express.raw({ type: "application/json" })
);

/* ---------------------------------------------
   COOKIE PARSER
---------------------------------------------- */
app.use(cookieParser());

/* ---------------------------------------------
   BODY PARSERS
---------------------------------------------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ---------------------------------------------
   ROUTES
---------------------------------------------- */
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/docs", docsRouter);
app.use("/api/documents", documentsRouter); // New documents endpoint
app.use("/api/profile", profileRouter); // New profile endpoint
app.use("/api/transactions", transactionsRouter); // ⚡ NEW
app.use("/api/bonuses", bonusesRouter); // ⚡ NEW
app.use("/api/templates", templatesRouter); // Templates endpoint
app.use("/api/analytics", analyticsRouter); // Analytics endpoint
app.use("/api/ai", aiRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/razorpay", razorpayRouter);

// Teams router (needs JSON + auth already applied above)
app.use("/api/teams", teamsRouter);
app.use("/api/team-editor", teamEditorRouter); // Team editor advanced features

/* ---------------------------------------------
   ROOT
---------------------------------------------- */
app.get("/", (req, res) => {
   res.json({ message: "WorkSage Backend API", version: "1.0.0" });
});

// ... (other imports)

// ... (rest of middleware)

/* ---------------------------------------------
   GLOBAL ERROR HANDLER
---------------------------------------------- */
// Handle CORS errors specifically
app.use(handleCorsError);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
   console.error("GLOBAL ERROR:", err);

   return res.status(err.status || 500).json({
      error: err.message || "Internal server error",
   });
});

/* ---------------------------------------------
   START SERVER
---------------------------------------------- */
const server = app.listen(PORT, () => {
   console.log(`🚀 Backend server running on port ${PORT}`);
   console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
   console.log(`📍 API root: http://localhost:${PORT}/`);
});

/* ---------------------------------------------
   GRACEFUL SHUTDOWN
---------------------------------------------- */
process.on("SIGTERM", () => {
   console.log("SIGTERM received: closing server...");
   server.close(() => console.log("Server closed"));
});

process.on("SIGINT", () => {
   console.log("SIGINT received: closing server...");
   server.close(() => {
      console.log("Server closed");
      process.exit(0);
   });
})