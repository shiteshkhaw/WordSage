import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"

// Validate required environment variables at module load
const NEXTAUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!NEXTAUTH_SECRET) {
    console.error("❌ AUTH_SECRET / NEXTAUTH_SECRET is not set. Authentication will fail.");
}

// For server-side auth calls, use BACKEND_URL (Docker runtime)
// STRICT MODE: No fallback to client-side vars.
const API_URL = process.env.BACKEND_URL;
if (!API_URL) {
    throw new Error("❌ BACKEND_URL is not set in environment. Required for server-side auth.");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    basePath: "/api/auth",
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }),
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                // Call backend API to verify credentials
                try {
                    const response = await fetch(`${API_URL}/api/auth/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    })

                    if (!response.ok) {
                        return null
                    }

                    const user = await response.json()
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.full_name,
                        image: user.avatar_url,
                    }
                } catch (error) {
                    console.error('Auth error:', error)
                    return null
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            // For OAuth providers (Google, GitHub), create user in backend
            if (account?.provider === 'google' || account?.provider === 'github') {
                try {
                    const response = await fetch(`${API_URL}/api/auth/oauth`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            provider: account.provider,
                        }),
                    });

                    if (!response.ok) {
                        console.error('Failed to create OAuth user in backend');
                        return false;
                    }

                    const backendUser = await response.json();
                    // Update user ID from backend (critical for JWT sub claim)
                    user.id = backendUser.id;
                } catch (error) {
                    console.error('OAuth backend error:', error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            // On initial sign-in, populate token with user data
            if (user) {
                token.sub = user.id;  // sub is the standard JWT claim for subject (user ID)
                token.id = user.id;
                token.email = user.email;
            }
            return token;
        },
        async session({ session, token }) {
            // Expose user ID and email to the session (for server components)
            if (session.user) {
                session.user.id = token.sub as string;
                session.user.email = token.email as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        signOut: "/",
        error: "/auth/error",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: NEXTAUTH_SECRET,
    trustHost: true, // Required for Docker/proxy deployments
})

