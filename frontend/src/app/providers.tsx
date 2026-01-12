'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export function SessionProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextAuthSessionProvider
            refetchInterval={0}  // Disable automatic session polling
            refetchOnWindowFocus={false}  // Disable refetch on window focus
        >
            {children}
        </NextAuthSessionProvider>
    );
}
