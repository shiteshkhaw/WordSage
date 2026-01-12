"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function AuthErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    const errorMessages: Record<string, { title: string; message: string }> = {
        AccessDenied: {
            title: "Access Denied",
            message: "You do not have permission to sign in. Please contact support if you believe this is an error.",
        },
        Configuration: {
            title: "Configuration Error",
            message: "There is a problem with the server configuration. Please try again later.",
        },
        Verification: {
            title: "Verification Error",
            message: "The verification link has expired or has already been used.",
        },
        OAuthSignin: {
            title: "OAuth Sign In Error",
            message: "Could not start the OAuth sign in process. Please try again.",
        },
        OAuthCallback: {
            title: "OAuth Callback Error",
            message: "Could not complete the OAuth sign in. Please try again.",
        },
        OAuthCreateAccount: {
            title: "Account Creation Error",
            message: "Could not create an account with this OAuth provider.",
        },
        EmailCreateAccount: {
            title: "Email Account Error",
            message: "Could not create an account with this email.",
        },
        Callback: {
            title: "Callback Error",
            message: "There was an error during the authentication callback.",
        },
        OAuthAccountNotLinked: {
            title: "Account Not Linked",
            message: "This email is already associated with another account. Please sign in using the original method.",
        },
        Default: {
            title: "Authentication Error",
            message: "An unexpected error occurred during authentication. Please try again.",
        },
    };

    const { title, message } = errorMessages[error || ""] || errorMessages.Default;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
                <p className="text-slate-600 mb-6">{message}</p>

                {error && (
                    <p className="text-xs text-slate-400 mb-6 font-mono bg-slate-100 p-2 rounded">
                        Error code: {error}
                    </p>
                )}

                <div className="space-y-3">
                    <Link
                        href="/login"
                        className="block w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                        Try Again
                    </Link>
                    <Link
                        href="/"
                        className="block w-full px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
        }>
            <AuthErrorContent />
        </Suspense>
    );
}
