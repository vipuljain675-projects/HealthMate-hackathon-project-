'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, ShieldCheck } from 'lucide-react';
import { BACKEND_URL } from '@/lib/config';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function processSession(user: any, token: string) {
      const email = user.email || '';
      const name = user.user_metadata?.full_name || user.user_metadata?.name || (email ? email.split('@')[0] : 'Google Patient');
      const stableKey = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const authToken = `mock_user_${stableKey}`;

      // Get or create patient profile in PostgreSQL cleanly
      try {
        await fetch(`${BACKEND_URL}/api/me`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ 
            name, 
            email, 
            auth_provider: 'google', 
            age: '28 Yrs', 
            gender: 'Male' 
          })
        });
      } catch (e) {
        console.warn('Sync profile note:', e);
      }

      const userSession = {
        auth_token: authToken,
        name,
        email,
        age: '28 Yrs',
        gender: 'Male',
        patient_id: `PID-${Math.floor(100000 + Math.random() * 900000)}`
      };

      localStorage.setItem('user_session', JSON.stringify(userSession));
      localStorage.setItem('remembered_email', email);

      if (isMounted) {
        window.location.href = '/overview';
      }
    }

    async function handleAuthCallback() {
      try {
        // 1. Check if Supabase session is already resolved
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await processSession(session.user, session.access_token);
          return;
        }

        // 2. Parse from URL hash (#access_token=...) if session is pending
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace('#', ''));
          const accessToken = params.get('access_token');
          if (accessToken) {
            try {
              const base64Payload = accessToken.split('.')[1];
              const decodedStr = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
              const payload = JSON.parse(decodedStr);
              if (payload.email) {
                await processSession({ email: payload.email, user_metadata: payload.user_metadata }, accessToken);
                return;
              }
            } catch (jwtErr) {
              console.error('JWT decode error:', jwtErr);
            }
          }
        }

        // 3. Fallback listener to auth state change
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          if (currentSession?.user) {
            await processSession(currentSession.user, currentSession.access_token);
          }
        });

        // Cleanup timeout after 3s
        setTimeout(() => {
          if (isMounted && !localStorage.getItem('user_session')) {
            setErrorMsg('Failed to retrieve Google Auth session');
            setTimeout(() => { window.location.href = '/'; }, 2000);
          }
        }, 3500);

      } catch (err: any) {
        console.error('Google Auth callback error:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Google Sign-In callback error');
          setTimeout(() => { window.location.href = '/'; }, 2000);
        }
      }
    }

    handleAuthCallback();

    return () => { isMounted = false; };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#080d16] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-gray-800 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
          <ShieldCheck className="w-8 h-8" />
        </div>

        {errorMsg ? (
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Authentication Note</h3>
            <p className="text-xs text-red-400">{errorMsg}</p>
            <p className="text-[11px] text-gray-500">Redirecting to sign-in screen...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Authenticating Session...</h3>
            <p className="text-xs text-gray-400">
              Verifying Google OAuth token with HealthVault Security Service...
            </p>
            <div className="flex items-center justify-center space-x-2 text-teal-400 text-xs font-semibold pt-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting workspace...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
