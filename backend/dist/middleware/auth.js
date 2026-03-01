import { decode } from 'next-auth/jwt';
import prisma from '../lib/prisma.js';
/**
 * Authentication Middleware
 *
 * SECURITY: This middleware decodes NextAuth JWE tokens using the same secret.
 * The token must have been encoded by the frontend proxy using next-auth/jwt.encode().
 *
 * The decoded token contains:
 * - sub: User ID (required)
 * - email: User email (optional, for logging)
 */
// Validate NEXTAUTH_SECRET at module load
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
if (!NEXTAUTH_SECRET) {
    console.error('❌ FATAL: NEXTAUTH_SECRET is not set. Authentication will fail.');
    console.error('   Set NEXTAUTH_SECRET in your environment variables.');
}
/**
 * Decode a NextAuth JWE token
 *
 * @param token - The JWE token string from Authorization header
 * @returns Decoded token payload if valid
 * @throws Error if token is invalid or expired
 */
async function decodeNextAuthToken(token) {
    if (!NEXTAUTH_SECRET) {
        throw new Error('Server configuration error: missing secret');
    }
    try {
        // Use next-auth's decode function with the same salt used by frontend
        const decoded = await decode({
            token,
            secret: NEXTAUTH_SECRET,
            salt: 'authjs.session-token', // Must match frontend proxy
        });
        return decoded;
    }
    catch (error) {
        console.warn('Token decode failed:', error instanceof Error ? error.message : 'Unknown error');
        return null;
    }
}
/**
 * Authentication middleware for protected routes
 *
 * SECURITY RULES:
 * ✅ Decode JWE token using next-auth/jwt.decode()
 * ✅ Extract user ID from 'sub' claim
 * ✅ Verify user exists in database
 * ❌ NO fallback authentication
 */
export async function requireAuth(req, res, next) {
    try {
        // Check server configuration
        if (!NEXTAUTH_SECRET) {
            console.error('Auth middleware: NEXTAUTH_SECRET not configured');
            return res.status(500).json({
                error: 'Server configuration error'
            });
        }
        // Check for Authorization header
        let token = req.headers.authorization;
        let salt;
        if (token) {
            // Strip "Bearer " prefix
            token = token.startsWith('Bearer ') ? token.substring(7) : token;
            // The proxy sends X-Auth-Salt = the cookie name it read the token from.
            // The cookie name IS the JWE salt in next-auth v5.
            // If the header is absent (e.g. direct calls), default to the most common salt.
            salt = req.headers['x-auth-salt'] || 'authjs.session-token';
        }
        else if (req.cookies) {
            // Fallback: read session token directly from cookies (non-proxy path)
            // Check priority: Secure authjs > authjs > Secure next-auth > next-auth
            if (req.cookies['__Secure-authjs.session-token']) {
                token = req.cookies['__Secure-authjs.session-token'];
                salt = '__Secure-authjs.session-token';
            }
            else if (req.cookies['authjs.session-token']) {
                token = req.cookies['authjs.session-token'];
                salt = 'authjs.session-token';
            }
            else if (req.cookies['__Secure-next-auth.session-token']) {
                token = req.cookies['__Secure-next-auth.session-token'];
                salt = '__Secure-next-auth.session-token';
            }
            else if (req.cookies['next-auth.session-token']) {
                token = req.cookies['next-auth.session-token'];
                salt = 'next-auth.session-token';
            }
            else {
                salt = 'authjs.session-token'; // no cookie found; will 401 below
            }
        }
        else {
            salt = 'authjs.session-token';
        }
        if (!token || token.trim() === '') {
            return res.status(401).json({
                error: 'Unauthorized - No token found in header or cookies'
            });
        }
        // Decode the NextAuth JWE token
        // Note: We need to pass the correct salt corresponding to the cookie name
        const decoded = await decode({
            token,
            secret: NEXTAUTH_SECRET,
            salt,
        });
        if (!decoded) {
            return res.status(401).json({
                error: 'Unauthorized - Invalid or expired token'
            });
        }
        // Validate required claims
        if (!decoded.sub) {
            return res.status(401).json({
                error: 'Unauthorized - Token missing user ID'
            });
        }
        const userId = decoded.sub;
        const userEmail = decoded.email;
        // Verify user exists in database
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { id: true, email: true },
        });
        if (!user) {
            return res.status(401).json({
                error: 'Unauthorized - User not found'
            });
        }
        // Attach verified user to request
        req.user = {
            id: user.id,
            email: user.email ?? userEmail,
        };
        next();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Auth middleware error:', errorMessage);
        return res.status(500).json({
            error: 'Internal server error during authentication'
        });
    }
}
/**
 * Optional auth middleware - attaches user if token present, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !NEXTAUTH_SECRET) {
        // No auth header or no secret - continue without user
        return next();
    }
    try {
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader;
        const decoded = await decodeNextAuthToken(token);
        if (decoded?.sub) {
            const user = await prisma.users.findUnique({
                where: { id: decoded.sub },
                select: { id: true, email: true },
            });
            if (user) {
                req.user = {
                    id: user.id,
                    email: user.email ?? decoded.email,
                };
            }
        }
    }
    catch {
        // Token invalid or expired - continue without user
    }
    next();
}
//# sourceMappingURL=auth.js.map