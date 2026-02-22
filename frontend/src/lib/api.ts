/**
 * Authenticated API client for backend requests
 *
 * All requests are routed through the Next.js proxy at /api/proxy/...
 * The proxy runs server-side, reads the NextAuth session cookie, and
 * forwards requests to the backend with an Authorization: Bearer header.
 *
 * This solves the cross-origin cookie problem that occurred when calling
 * the Render backend directly from the Vercel frontend.
 */

/**
 * Make an authenticated API request via the internal Next.js proxy
 *
 * @param endpoint - Backend API endpoint (e.g., '/api/profile')
 * @param options  - Standard fetch options
 * @returns Parsed JSON response
 * @throws Error if the request fails
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Normalize endpoint to ensure it starts with /api
  const normalizedEndpoint = endpoint.startsWith('/api')
    ? endpoint
    : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Route through the Next.js proxy (same origin — no cross-origin cookie issues)
  // /api/proxy/api/profile  →  proxy reads cookie server-side  →  backend
  const proxyUrl = `/api/proxy${normalizedEndpoint}`;

  const isFormData = options.body instanceof FormData;

  const response = await fetch(proxyUrl, {
    ...options,
    headers: isFormData
      ? { ...((options.headers as Record<string, string>) || {}) }
      : {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      },
  });

  // Handle non-OK responses
  if (!response.ok) {
    // Handle authentication failures — redirect to login
    if (response.status === 401) {
      console.warn('Authentication failed (401) — redirecting to login');
      if (typeof window !== 'undefined') {
        window.location.href = '/login?error=session_expired';
        throw new Error('Session expired — redirecting to login');
      }
    }

    const errorData = await response.json().catch(() => ({
      error: `Request failed with status ${response.status}`,
    }));

    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Convenience methods for common HTTP operations
 */
export const api = {
  get: <T = unknown>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: 'GET' }),

  post: <T = unknown>(endpoint: string, data?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = unknown>(endpoint: string, data?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = unknown>(endpoint: string, data?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = unknown>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: 'DELETE' }),
};
