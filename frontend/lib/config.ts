// BACKEND_URL: use env var if set, else Render production URL, else local dev
const rawBackendUrl = 
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://healthmate-hackathon-project.onrender.com');

export const BACKEND_URL = rawBackendUrl.trim().replace(/\/+$/, '');


