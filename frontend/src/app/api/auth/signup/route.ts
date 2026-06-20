import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { email, password, fullName, country, currency } = await req.json();

        // Validation
        if (!email || !password || !fullName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Call backend API to create user
        const isLocalUrl = (url?: string) => {
            if (!url) return true;
            return url.includes('localhost') || url.includes('127.0.0.1') || url.includes('wordsage-backend');
        };

        const getBackendUrl = () => {
            const bUrl = process.env.BACKEND_URL;
            const pUrl = process.env.NEXT_PUBLIC_API_URL;
            if (process.env.VERCEL) {
                if (bUrl && !isLocalUrl(bUrl)) {
                    return bUrl;
                }
                if (pUrl && !isLocalUrl(pUrl)) {
                    return pUrl;
                }
                return 'https://wordsage-l10x.onrender.com';
            }
            return bUrl || pUrl || 'http://localhost:4000';
        };

        const backendUrl = getBackendUrl();
        if (!backendUrl) {
            console.error("❌ BACKEND_URL/NEXT_PUBLIC_API_URL could not be resolved in signup route");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const response = await fetch(`${backendUrl}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName, country, currency }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Signup failed' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            userId: data.userId,
            message: data.message || 'Account created successfully!',
        });
    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Failed to create account' },
            { status: 500 }
        );
    }
}
