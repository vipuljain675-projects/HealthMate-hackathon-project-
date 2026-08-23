'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          throw new Error(error?.message || 'Failed to retrieve Google Auth session');
        }

        const user = session.user;
        const email = user.email || '';
        const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0] || 'Google Patient';
        const stableKey = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const authToken = `mock_user_${stableKey}`;

        // Get or create patient profile in PostgreSQL cleanly without 400 errors
        try {
          await fetch('http://localhost:8000/api/me', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name, email })
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

        router.push('/overview');
      } catch (err: any) {
        console.error('Google Auth callback error:', err);
        setErrorMsg(err.message || 'Google Sign-In callback error');
        setTimeout(() => router.push('/'), 2500);
      }
    }

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070a11] text-white flex flex-col items-center justify-center p-6">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center border border-teal-500/30 space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
          {errorMsg ? <ShieldCheck className="w-7 h-7 text-red-400" /> : <Loader2 className="w-7 h-7 animate-spin" />}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">
            {errorMsg ? 'Authentication Note' : 'Completing Google Sign-In...'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {errorMsg ? errorMsg : 'Authenticating your patient account with HealthVault'}
          </p>
        </div>
      </div>
    </div>
  );
}
