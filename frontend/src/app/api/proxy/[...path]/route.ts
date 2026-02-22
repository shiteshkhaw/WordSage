/**
 * Backend Proxy API Route
 *
 * Solves the cross-origin cookie problem:
 * - The frontend (Vercel) and backend (Render) are on different domains.
 * - Browsers block cross-origin cookies, so `credentials: 'include'` can't
 *   deliver the NextAuth session cookie to the backend.
 *
 * This proxy runs server-side inside Next.js (same origin as the browser),
 * reads the NextAuth JWT token from the HttpOnly cookie using `getToken()`,
 * then forwards the request to the backend with `Authorization: Bearer <token>`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Server-side backend URL (never exposed to the browser)
const BACKEND_URL = process.env.BACKEND_URL;
if (!BACKEND_URL) {
    console.error('❌ BACKEND_URL is not set. Proxy route will fail.');
}

// Headers that must not be forwarded to the backend (request side)
const HOP_BY_HOP_REQUEST_HEADERS = new Set([
    'connection',
    'keep-alive',
    'transfer-encoding',
    'te',
    'trailer',
    'upgrade',
    'proxy-authorization',
    'proxy-authenticate',
    'host',
]);

// Headers that must not be forwarded back to the browser (response side).
// IMPORTANT: Node's fetch auto-decompresses gzip/br/deflate responses from the
// backend. If we forward Content-Encoding: gzip the browser tries to
// decompress an already-decompressed body → ERR_CONTENT_DECODING_FAILED + 500.
// Stripping both content-encoding and content-length fixes this.
const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
    'connection',
    'keep-alive',
    'transfer-encoding',
    'te',
    'trailer',
    'upgrade',
    'proxy-authorization',
    'proxy-authenticate',
    'content-encoding',  // ← body is already decoded by Node fetch
    'content-length',    // ← length no longer matches decoded body
]);

async function proxyRequest(req: NextRequest, pathSegments: string[]): Promise<NextResponse> {
    if (!BACKEND_URL) {
        return NextResponse.json(
            { error: 'Server misconfiguration: BACKEND_URL not set' },
            { status: 500 }
        );
    }

    // 1. Get the raw JWT from the NextAuth session cookie (server-side only)
    const rawToken = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET!,
        // next-auth v5 uses 'authjs.session-token' as the cookie/salt name in dev,
        // and '__Secure-authjs.session-token' in production (HTTPS).
        // getToken handles this automatically via the cookieName option below.
        cookieName:
            req.headers.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production'
                ? '__Secure-authjs.session-token'
                : 'authjs.session-token',
    });

    // 2. Build the upstream URL (replace /api/proxy/ with nothing, keep the rest)
    const upstreamPath = '/' + pathSegments.join('/');
    const upstreamUrl = new URL(upstreamPath, BACKEND_URL);

    // Forward query parameters
    req.nextUrl.searchParams.forEach((value, key) => {
        upstreamUrl.searchParams.set(key, value);
    });

    // 3. Build forwarded headers (strip hop-by-hop, inject Authorization)
    const forwardedHeaders = new Headers();
    req.headers.forEach((value, key) => {
        if (!HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) {
            forwardedHeaders.set(key, value);
        }
    });

    // Tell the backend NOT to compress the response.
    // Node's fetch auto-decompresses gzip but we can't re-set Content-Encoding,
    // so uncompressed responses are the safest option.
    forwardedHeaders.set('accept-encoding', 'identity');

    // Set the correct host for the backend
    forwardedHeaders.set('host', new URL(BACKEND_URL).host);

    // Inject the JWT as a Bearer token so backend requireAuth middleware can verify it
    if (rawToken) {
        // getToken returns the decoded payload, but we need the raw encoded JWE.
        // next-auth/jwt does NOT expose the raw token from getToken().
        // Instead, we read the raw cookie value directly.
        const cookieName =
            process.env.NODE_ENV === 'production'
                ? '__Secure-authjs.session-token'
                : 'authjs.session-token';

        const rawCookieValue = req.cookies.get(cookieName)?.value
            ?? req.cookies.get('__Secure-authjs.session-token')?.value
            ?? req.cookies.get('authjs.session-token')?.value
            ?? req.cookies.get('next-auth.session-token')?.value
            ?? req.cookies.get('__Secure-next-auth.session-token')?.value;

        if (rawCookieValue) {
            forwardedHeaders.set('Authorization', `Bearer ${rawCookieValue}`);
        }
    }

    // Remove cookies from forwarded headers (backend uses Bearer token instead)
    forwardedHeaders.delete('cookie');

    // 4. Forward the request body for mutations
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    let body: BodyInit | null = null;
    if (hasBody) {
        body = await req.blob();
    }

    // 5. Call the backend
    let backendResponse: Response;
    try {
        backendResponse = await fetch(upstreamUrl.toString(), {
            method: req.method,
            headers: forwardedHeaders,
            body: hasBody ? body : undefined,
            // Don't follow redirects — pass them through to the browser
            redirect: 'manual',
        });
    } catch (error) {
        console.error('[proxy] Backend unreachable:', error);
        return NextResponse.json(
            { error: 'Backend unreachable. Please try again later.' },
            { status: 502 }
        );
    }

    // 6. Stream the backend response back to the browser
    // Use HOP_BY_HOP_RESPONSE_HEADERS to strip content-encoding/content-length
    // since Node's fetch already decoded the body.
    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
        if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
            responseHeaders.set(key, value);
        }
    });

    return new NextResponse(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders,
    });
}

// Route handlers for all HTTP methods
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
