import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

/**
 * TypeScript augmentations for NextAuth session and JWT types
 * Ensures type safety for user.id and custom session properties
 */
declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id: string;
            email: string;
            name?: string | null;
            image?: string | null;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        email: string;
        name?: string | null;
        image?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        email?: string;
        sub?: string;
    }
}
