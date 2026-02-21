import { CorsOptions } from "cors";

/**
 * WordSage Centralized CORS Configuration
 *
 * This module enforces strict security policies for Cross-Origin Resource Sharing.
 * It strictly validates origins against environment variables and rejects
 * unknown origins with a standardized JSON error response.
 */

const isProduction = process.env.NODE_ENV === "production";

// Parse allowed origins from environment
const getAllowedOrigins = (): string[] => {
    const origins: string[] = [];

    // 1. Primary Frontend URL (Always allowed)
    if (process.env.FRONTEND_URL) {
        origins.push(process.env.FRONTEND_URL);
    }

    // 2. CORS_ORIGIN (explicit override, e.g. set on Render/Railway)
    if (process.env.CORS_ORIGIN) {
        origins.push(process.env.CORS_ORIGIN);
    }

    // 3. Additional configured origins (Comma separated)
    if (process.env.CORS_ALLOWED_ORIGINS) {
        const extra = process.env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim());
        origins.push(...extra);
    }

    // Remove duplicates and empty strings
    return [...new Set(origins)].filter(Boolean);
};

export const corsOptions: CorsOptions = {
    // Dynamic Origin Validation
    origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!requestOrigin) return callback(null, true);

        const allowedOrigins = getAllowedOrigins();

        if (allowedOrigins.includes(requestOrigin)) {
            return callback(null, true);
        }

        // In dev, usually we might be lenient, but for "Strict" mode requested,
        // explicitly blocked unless in the list.
        // However, if strict dev matching is needed, ensure all dev URLs are in getAllowedOrigins

        // Create a structured error that can be caught by global error handler 
        // or handled by cors middleware (though cors middleware just sends 500 usually if error passed)
        // We will just return error here, and Express/Cors will handle rejection.
        // To return specific JSON, we might need a custom wrapper, but standard CORS middleware
        // usually just blocks it.
        // The requirement asks for a SPECIFIC JSON response.
        // Standard cors middleware with an Error callback usually results in a 500.
        // To send 403 + JSON, we actually usually shouldn't throw an error here, but 
        // pass `false`.
        // BUT the 'cors' package documentation says: `callback(new Error('Not allowed by CORS'))`
        return callback(new Error(`CORS_BLOCK:${requestOrigin}`));
    },

    // Security Headers
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining"],
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
    optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Helper to handle the "CORS_BLOCK" error in the global error handler
// to ensure the specific JSON format requested.
export const handleCorsError = (err: any, req: any, res: any, next: any) => {
    if (err.message && err.message.startsWith("CORS_BLOCK")) {
        const blockedOrigin = err.message.split(":")[1] || "unknown";
        return res.status(403).json({
            success: false,
            code: "CORS_ORIGIN_BLOCKED",
            message: "Origin not allowed",
            meta: {
                origin: blockedOrigin,
            },
        });
    }
    next(err);
};
