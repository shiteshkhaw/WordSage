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
        // Use BACKEND_URL (runtime, for Docker)
        const backendUrl = process.env.BACKEND_URL;
        if (!backendUrl) {
            console.error("❌ BACKEND_URL is missing in API route");
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
