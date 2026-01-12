import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email?: string;
    };
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
export declare function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void | Response>;
/**
 * Optional auth middleware - attaches user if token present, but doesn't require it
 */
export declare function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map