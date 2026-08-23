'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  ArrowRight, 
  Lock, 
  Mail, 
  User, 
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function AuthPage() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('28 Yrs');
  const [gender, setGender] = useState('Male');
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasRememberedEmail, setHasRememberedEmail] = useState(false);

  // Load remembered email on mount OR clear completely if user signed out
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const isSignedOut = params.get('action') === 'signout' || sessionStorage.getItem('just_signed_out') === 'true';

      if (isSignedOut) {
        // SIGN OUT (Complete Exit) -> Purge form inputs completely so fields are 100% BLANK
        setEmail('');
        setPassword('');
        setName('');
        setHasRememberedEmail(false);
        localStorage.removeItem('remembered_email');
        localStorage.removeItem('user_session');
        sessionStorage.removeItem('just_signed_out');
      } else {
        // LOGOUT (Temporary Exit) -> Pre-fill remembered email for browser autofill
        const savedEmail = localStorage.getItem('remembered_email');
        if (savedEmail) {
          setEmail(savedEmail);
          setHasRememberedEmail(true);
        }
      }
    } catch (_) {}
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      // Clear local session first so Google forces account selection dialog
      await supabase.auth.signOut();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-In failed');
      setIsLoggingIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);

    const patientEmail = email.trim().toLowerCase();
    if (!patientEmail) {
      setAuthError('Email address is required.');
      setIsLoggingIn(false);
      return;
    }

    try {
      if (authMode === 'signin') {
        // REAL LOGIN VALIDATION against PostgreSQL DB
        const res = await fetch('http://localhost:8000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: patientEmail, password })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Failed to authenticate. Please check your credentials.');
        }

        // Valid Login
        const userSession = {
          auth_token: data.auth_token,
          name: data.patient?.name || patientEmail.split('@')[0],
          email: patientEmail,
          age: data.patient?.age || '28 Yrs',
          gender: data.patient?.gender || 'Male',
          patient_id: `PID-${Math.floor(100000 + Math.random() * 900000)}`
        };

        localStorage.setItem('user_session', JSON.stringify(userSession));
        localStorage.setItem('remembered_email', patientEmail);
        setAuthSuccess(true);

        setTimeout(() => {
          window.location.href = '/overview';
        }, 500);

      } else {
        // REAL SIGN UP VALIDATION against PostgreSQL DB
        const res = await fetch('http://localhost:8000/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim() || 'New Patient',
            email: patientEmail,
            password,
            age,
            gender
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Sign up failed.');
        }

        // Valid Sign Up
        const userSession = {
          auth_token: data.auth_token,
          name: data.patient?.name || name.trim() || 'New Patient',
          email: patientEmail,
          age: age || '28 Yrs',
          gender: gender || 'Male',
          patient_id: `PID-${Math.floor(100000 + Math.random() * 900000)}`
        };

        localStorage.setItem('user_session', JSON.stringify(userSession));
        localStorage.setItem('remembered_email', patientEmail);
        setAuthSuccess(true);

        setTimeout(() => {
          window.location.href = '/overview';
        }, 500);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a11] text-gray-100 flex flex-col justify-between -mt-8 -mx-4 lg:-mx-8">
      {/* Top Header Logo Bar */}
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between border-b border-gray-800/60 backdrop-blur-md bg-gray-950/40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center p-1.5 overflow-hidden">
            <img src="/logo.png" alt="HealthVault Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
              Health<span className="gradient-text">Vault</span>
            </span>
            <span className="text-[10px] text-teal-400/80 tracking-widest uppercase block -mt-1 font-semibold">
              AI Personal Health Platform
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-gray-400 hidden sm:inline">Protected by Supabase Auth & Google OAuth</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </header>

      {/* Main Grid: Left Form & Right Hero Graphic */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center px-6 lg:px-12 py-8">
        
        {/* Left Column: Login / Signup Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Next-Gen Personal Health OS</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {authMode === 'signin' ? 'Welcome Back to' : 'Create Your'} <span className="gradient-text">HealthVault</span>
            </h1>
            <p className="text-xs text-gray-400 leading-relaxed">
              {authMode === 'signin' 
                ? 'Sign in with Google OAuth or your registered email to access your workspace.'
                : 'Create a new account or connect with Google to unify your medical records & OCR scans.'}
            </p>
          </div>

          {/* Form Container */}
          <div className="glass-card rounded-3xl p-7 border border-gray-800/80 shadow-2xl space-y-4 relative">
            
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="w-full py-3 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700/80 hover:border-teal-500/50 text-white font-semibold text-xs flex items-center justify-center space-x-3 transition-all shadow-md group disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-gray-800 w-full" />
              <span className="bg-[#080d17] px-3 text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                or sign in with email
              </span>
            </div>

            {/* Tab Switcher */}
            <div className="flex p-1 bg-gray-900/90 rounded-xl border border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  authMode === 'signin'
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign In / Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  authMode === 'signup'
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Error Alert Box */}
            {authError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Authentication Note</p>
                  <p className="text-red-300/90 mt-0.5">{authError}</p>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {authSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Account authenticated! Opening patient workspace...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {authMode === 'signup' && (
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Full Name <span className="text-teal-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      name="name"
                      autoComplete="name"
                      placeholder="e.g. Vipul Jain"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                      required={authMode === 'signup'}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Email Address <span className="text-teal-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    placeholder="e.g. user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                    required
                  />
                </div>
                {hasRememberedEmail && authMode === 'signin' && (
                  <div className="flex items-center justify-between text-[11px] text-teal-400/90 mt-1.5 px-1">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-teal-400" />
                      Remembered from last session (Autofill ready)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('');
                        setHasRememberedEmail(false);
                        try { localStorage.removeItem('remembered_email'); } catch (_) {}
                      }}
                      className="text-gray-500 hover:text-red-400 underline text-[10px] transition-colors"
                    >
                      Clear Saved
                    </button>
                  </div>
                )}
              </div>

              {authMode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Age</label>
                    <input
                      type="text"
                      placeholder="e.g. 28 Yrs"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Password <span className="text-teal-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    name="password"
                    autoComplete={authMode === 'signup' ? "new-password" : "current-password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 rounded-xl font-bold text-white gradient-btn flex items-center justify-center space-x-2 text-sm shadow-xl shadow-teal-500/20 disabled:opacity-50 mt-2"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{authMode === 'signin' ? 'Authenticating...' : 'Creating Account...'}</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Login to Workspace' : 'Sign Up & Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-1 text-center text-xs text-gray-500">
              By continuing, you agree to HealthVault's <span className="text-gray-400 underline">Terms of Service</span>.
            </div>
          </div>
        </div>

        {/* Right Column: Hero Graphic Image */}
        <div className="lg:col-span-7 hidden lg:block">
          <div className="relative rounded-3xl overflow-hidden border border-gray-800/80 shadow-2xl group bg-gray-950">
            <img 
              src="/healthvault_auth_hero.png" 
              alt="HealthVault Medical Workspace Dashboard" 
              className="w-full h-[540px] object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070a11] via-transparent to-transparent flex flex-col justify-end p-8">
              <div className="glass-card rounded-2xl p-5 border border-teal-500/30 bg-gray-950/85 max-w-md">
                <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs mb-1">
                  <BrainCircuit className="w-4 h-4" />
                  <span>Multimodal Clinical RAG Architecture</span>
                </div>
                <h3 className="text-base font-bold text-white">Unified Medical Timeline & OCR Ingestion</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Automatically structure doctor prescriptions, track active medications, and query clinical notes with AI grounding.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
