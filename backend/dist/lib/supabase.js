import { createClient } from '@supabase/supabase-js';
// Server-side Supabase client with service role key
export function createSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
    }
    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
// Client-side Supabase client (for requests with auth headers)
export function createSupabaseClientFromHeaders(authHeader) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables. Check SUPABASE_URL and SUPABASE_ANON_KEY');
    }
    // Ensure authHeader is properly formatted
    const headers = {};
    if (authHeader) {
        // If it doesn't start with Bearer, add it
        headers['Authorization'] = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
    }
    const client = createClient(supabaseUrl, supabaseKey, {
        global: {
            headers,
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
    return client;
}
//# sourceMappingURL=supabase.js.map