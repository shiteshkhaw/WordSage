import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const isLocalUrl = (url?: string) => {
      if (!url) return true;
      return url.includes('localhost') || url.includes('127.0.0.1') || url.includes('wordsage-backend');
    };

    const getBackendUrl = () => {
      const bUrl = process.env.BACKEND_URL;
      const pUrl = process.env.NEXT_PUBLIC_API_URL;
      if (process.env.VERCEL) {
        if (bUrl && !isLocalUrl(bUrl)) return bUrl;
        if (pUrl && !isLocalUrl(pUrl)) return pUrl;
        return 'https://wordsage-l10x.onrender.com';
      }
      return bUrl || pUrl || 'http://localhost:4000';
    };

    const backendUrl = getBackendUrl() + '/api';
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
