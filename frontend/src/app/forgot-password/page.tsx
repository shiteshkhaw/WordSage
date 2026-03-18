'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/proxy/api/password-reset/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Something went wrong. Please try again.');
          return;
        }

        setSuccess(true);
      } catch {
        setError('Network error. Please check your connection and try again.');
      }
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Forgot Password?
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            No worries! Enter your email and we&apos;ll send you a secure reset link.
          </p>
        </div>

        {/* Success State */}
        {success ? (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <h3 className="text-green-800 font-semibold text-sm">Check your email</h3>
                  <p className="text-green-700 text-sm mt-1">
                    If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link. The link expires in 15 minutes.
                  </p>
                  <p className="text-green-600 text-xs mt-2">
                    Don&apos;t see it? Check your spam folder.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="w-full py-3 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Send another link
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={isPending}
                  autoComplete="email"
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isPending ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              Remember your password?{' '}
              <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}

        {/* Security Note */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs text-gray-500">
              For security, reset links expire in 15 minutes and can only be used once. Temporary or disposable email addresses are not accepted.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
