import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000/api';
    // Just a fast ping to the backend root or health if it exists
    await fetch(`${backendUrl.replace('/api', '')}/`, { 
      method: 'GET',
      next: { revalidate: 0 }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    // Expected to fail if backend doesn't have a root route, but the connection attempt wakes it up!
    return NextResponse.json({ success: false, error: 'Pinged' });
  }
}
