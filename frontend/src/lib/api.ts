/**
 * Authenticated API client for backend requests
 * 
 * This client calls the backend directly without using a proxy.
 * Authentication is handled via cookies or Authorization header.
 */

// Backend URL from environment variable - MUST be set
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

/**
 * Make an authenticated API request directly to the backend
 * 
 * @param endpoint - Backend API endpoint (e.g., '/api/profile')
 * @param options - Standard fetch options
 * @returns Parsed JSON response
 * @throws Error if request fails
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Normalize endpoint to ensure it starts with /api
  const normalizedEndpoint = endpoint.startsWith('/api')
    ? endpoint
    : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Call backend directly
  const backendUrl = `${BACKEND_URL}${normalizedEndpoint}`;

  const response = await fetch(backendUrl, {
    ...options,
    credentials: 'include', // Include cookies for authentication
    headers: {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  // Handle non-OK responses
  if (!response.ok) {
    // Handle authentication failures - redirect to login
    if (response.status === 401) {
      console.warn('Authentication failed (401) - redirecting to login');
      if (typeof window !== 'undefined') {
        // Clear any stale state and redirect to login
        window.location.href = '/login?error=session_expired';
        // Throw to prevent further processing
        throw new Error('Session expired - redirecting to login');
      }
    }

    const errorData = await response.json().catch(() => ({
      error: `Request failed with status ${response.status}`
    }));

    // Throw with detailed error message
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
      body: data ? JSON.stringify(data) : undefined
    }),

  put: <T = unknown>(endpoint: string, data?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    }),

  patch: <T = unknown>(endpoint: string, data?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    }),

  delete: <T = unknown>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: 'DELETE' }),
};

