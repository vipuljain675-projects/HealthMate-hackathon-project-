export const BACKEND_URL = 
  process.env.NEXT_PUBLIC_BACKEND_URL 
    ? process.env.NEXT_PUBLIC_BACKEND_URL 
    : (typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || window.location.hostname !== 'localhost')
        ? window.location.origin 
        : 'http://localhost:8000');
