/**
 * Backend Proxy API Route
 *
 * Solves the cross-origin cookie problem:
 * - The frontend (Vercel) and backend (Render) are on different domains.
 * - Browsers block cross-origin cookies, so `credentials: 'include'` can't
 *   deliver the NextAuth session cookie to the backend.
 *
 * This proxy runs server-side inside Next.js (same origin as the browser),
 * reads the raw NextAuth JWT cookie directly, then forwards the request to
 * the backend with `Authorization: Bearer <token>`.
 *
 * NO getToken() is used — we read the raw cookie value directly.
 * This avoids any next-auth v5 beta compatibility issues with getToken().
 */

import { NextRequest, NextResponse } from 'next/server';

// Server-side backend URL (never exposed to the browser)
const BACKEND_URL = process.env.BACKEND_URL;

// Headers that must NOT be forwarded upstream (request)
const SKIP_REQUEST_HEADERS = new Set([
    'connection', 'keep-alive', 'transfer-encoding',
    'te', 'trailer', 'upgrade',
    'proxy-authorization', 'proxy-authenticate',
    'host',
]);

// Headers that must NOT be forwarded back to the browser (response).
// Node's fetch auto-decompresses gzip — forwarding Content-Encoding: gzip
// causes the browser to double-decompress → ERR_CONTENT_DECODING_FAILED.
const SKIP_RESPONSE_HEADERS = new Set([
    'connection', 'keep-alive', 'transfer-encoding',
    'te', 'trailer', 'upgrade',
    'proxy-authorization', 'proxy-authenticate',
    'content-encoding',   // body already decoded by Node fetch
    'content-length',     // length no longer accurate after decode
]);

/** Find the raw NextAuth session cookie from the request.
 *  Returns both the token value and the cookie name (which is the JWE salt).
 */
function getSessionCookie(req: NextRequest): { value: string; cookieName: string } | undefined {
    // Next-auth v5 on HTTPS uses __Secure-authjs.session-token
    // On HTTP (dev) it uses authjs.session-token
    // Also check legacy next-auth v4 cookie names for safety
    const cookies = [
        '__Secure-authjs.session-token',
        'authjs.session-token',
        '__Secure-next-auth.session-token',
        'next-auth.session-token',
    ] as const;

    for (const cookieName of cookies) {
        const value = req.cookies.get(cookieName)?.value;
        if (value) return { value, cookieName };
    }
    return undefined;
}

async function proxyRequest(
    req: NextRequest,
    pathSegments: string[]
): Promise<NextResponse> {
    // --- Guard: BACKEND_URL must be set ---
    if (!BACKEND_URL) {
        console.error('[proxy] ❌ BACKEND_URL is not configured in environment variables.');
        return NextResponse.json(
            { error: 'Server misconfiguration: BACKEND_URL is not set. Set it in Vercel Environment Variables.' },
            { status: 500 }
        );
    }

    try {
        // 1. Build upstream URL
        const upstreamPath = '/' + pathSegments.join('/');
        const upstreamUrl = new URL(upstreamPath, BACKEND_URL);

        // Forward query parameters
        req.nextUrl.searchParams.forEach((value, key) => {
            upstreamUrl.searchParams.set(key, value);
        });

        // 2. Build forwarded request headers
        const forwardedHeaders = new Headers();
        req.headers.forEach((value, key) => {
            if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) {
                forwardedHeaders.set(key, value);
            }
        });

        // Tell the backend not to gzip-compress (prevents double-decode issues)
        forwardedHeaders.set('accept-encoding', 'identity');

        // Set correct host for the backend
        forwardedHeaders.set('host', new URL(BACKEND_URL).host);

        // 3. Inject Authorization from session cookie
        // We read the raw JWE token directly — no getToken() needed.
        // We also forward the cookie name as X-Auth-Salt so the backend can
        // decode with the correct salt (cookie name == JWE salt in next-auth v5).
        const sessionCookie = getSessionCookie(req);
        if (sessionCookie) {
            forwardedHeaders.set('Authorization', `Bearer ${sessionCookie.value}`);
            forwardedHeaders.set('X-Auth-Salt', sessionCookie.cookieName);
        }

        // Remove browser cookies from upstream request (we use Bearer instead)
        forwardedHeaders.delete('cookie');

        // 4. Read request body for mutations
        const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
        const body = hasBody ? await req.blob() : undefined;

        // 5. Fetch from backend
        const backendResponse = await fetch(upstreamUrl.toString(), {
            method: req.method,
            headers: forwardedHeaders,
            body,
            redirect: 'manual',  // pass redirects through to the browser
        });

        // 6. Build response headers (strip encoding/length — body already decoded)
        const responseHeaders = new Headers();
        backendResponse.headers.forEach((value, key) => {
            if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
                responseHeaders.set(key, value);
            }
        });

        return new NextResponse(backendResponse.body, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            headers: responseHeaders,
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[proxy] Unhandled error:', message);
        return NextResponse.json(
            { error: `Proxy error: ${message}` },
            { status: 502 }
        );
    }
}

// Export handlers for all HTTP methods
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(req, path);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(req, path);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(req, path);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(req, path);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(req, path);
}
export async function OPTIONS(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(req, path);
}
