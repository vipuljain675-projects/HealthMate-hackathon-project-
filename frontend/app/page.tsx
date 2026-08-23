'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Mail, 
  User, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Activity,
  Check
} from 'lucide-react';

import { BACKEND_URL } from '@/lib/config';

export default function AuthPage() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepMeSignedIn, setKeepMeSignedIn] = useState(true);
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
        const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
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
        if (keepMeSignedIn) {
          localStorage.setItem('remembered_email', patientEmail);
        }
        setAuthSuccess(true);

        setTimeout(() => {
          window.location.href = '/overview';
        }, 500);

      } else {
        // REAL SIGN UP VALIDATION against PostgreSQL DB
        const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
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
        if (keepMeSignedIn) {
          localStorage.setItem('remembered_email', patientEmail);
        }
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
    <div className="min-h-screen bg-gradient-to-br from-[#071324] via-[#0a192f] to-[#040a14] text-gray-100 flex flex-col justify-between -mt-8 -mx-4 lg:-mx-8 relative overflow-hidden selection:bg-teal-500/30">
      
      {/* Background Radial Glow Spheres (Deep Teal & Cyan Atmosphere) */}
      <div className="absolute top-1/4 -left-36 w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-5 right-5 w-[650px] h-[650px] bg-cyan-600/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-10 right-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Logo Bar */}
      <header className="px-8 lg:px-16 py-6 flex items-center justify-between border-b border-[#142847]/70 backdrop-blur-md bg-[#071324]/70 z-20">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-gray-950 font-bold shadow-lg shadow-teal-500/20">
            <Activity className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white font-mono lowercase">
            healthvault
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs text-gray-300">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span className="hidden sm:inline">Your health data, kept private.</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
        </div>
      </header>

      {/* Main Container Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center px-8 lg:px-16 py-12 z-10">
        
        {/* Left Column: Brand Hero & Narrative Highlights (7 cols) */}
        <div className="lg:col-span-7 space-y-8 pr-0 lg:pr-8">
          
          <div className="space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-teal-400 font-bold flex items-center gap-2">
              <span className="text-teal-300">✳</span> PERSONAL HEALTH INTELLIGENCE
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.08]">
              Your health story,<br />
              <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                made clear.
              </span>
            </h1>
            
            <p className="text-sm text-gray-300 leading-relaxed max-w-lg">
              A calmer way to understand your medical records. HealthVault brings every detail into focus, so you can make decisions with confidence.
            </p>
          </div>

          {/* 3 Numbered Feature Highlights */}
          <div className="space-y-5 max-w-lg border-t border-[#162a48]/80 pt-6">
            
            <div className="flex items-start space-x-4 group">
              <span className="text-xs font-mono text-gray-400 pt-0.5 font-bold">01</span>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">One secure home</h4>
                <p className="text-xs text-gray-300/80 mt-0.5">Records, prescriptions and clinical notes — finally connected.</p>
              </div>
            </div>

            <div className="border-t border-[#162a48]/60 pt-4 flex items-start space-x-4 group">
              <span className="text-xs font-mono text-gray-400 pt-0.5 font-bold">02</span>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">Answers with context</h4>
                <p className="text-xs text-gray-300/80 mt-0.5">Ask questions and get grounded answers from your own history.</p>
              </div>
            </div>

            <div className="border-t border-[#162a48]/60 pt-4 flex items-start space-x-4 group">
              <span className="text-xs font-mono text-gray-400 pt-0.5 font-bold">03</span>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">Built for peace of mind</h4>
                <p className="text-xs text-gray-300/80 mt-0.5">Your health story stays private, organized and ready when needed.</p>
              </div>
            </div>

          </div>

          {/* Records in Focus Live RAG Index Card */}
          <div className="max-w-lg rounded-2xl bg-gradient-to-r from-[#0c1f38]/90 via-[#0a182d]/90 to-[#061120]/90 border border-teal-500/25 p-5 relative overflow-hidden shadow-2xl group">
            <div className="relative z-10 space-y-1">
              <div className="flex items-center space-x-2 text-[10px] font-mono text-teal-400 font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span>LIVE RAG INDEX</span>
              </div>
              <h4 className="text-base font-bold text-white">Records in focus</h4>
              <p className="text-xs text-gray-300 font-mono">12 documents · 4 insights surfaced</p>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-44 opacity-35 group-hover:opacity-55 transition-opacity pointer-events-none">
              <img src="/healthvault_auth_hero.png" alt="Live RAG Index" className="w-full h-full object-cover rounded-r-2xl" />
            </div>
          </div>

        </div>

        {/* Right Column: Floating Auth Workspace Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Top Form Subheader */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 font-bold block mb-1">
              WELCOME TO HEALTHVAULT
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {authMode === 'signin' ? 'Pick up where you left off.' : 'Create your private account.'}
            </h2>
            <p className="text-xs text-gray-300 mt-0.5">
              {authMode === 'signin' ? 'Sign in to your private health workspace.' : 'Join HealthVault to unify your medical records.'}
            </p>
          </div>

          {/* Form Container */}
          <div className="rounded-3xl bg-[#09172c]/90 border border-[#183157] p-7 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-4">
            
            {/* Minimalist Tab Switcher */}
            <div className="flex border-b border-[#162c4e] pb-1 space-x-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                className={`pb-2.5 transition-all relative ${
                  authMode === 'signin' ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>Sign in</span>
                {authMode === 'signin' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>
              
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                className={`pb-2.5 transition-all relative ${
                  authMode === 'signup' ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>Create account</span>
                {authMode === 'signup' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="w-full py-3 px-4 rounded-xl bg-[#0e213d] hover:bg-[#132a4e] border border-[#1c3863] hover:border-teal-500/50 text-white font-semibold text-xs flex items-center justify-center space-x-3 transition-all shadow-md group disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
              <span className="text-gray-400 group-hover:text-teal-300 transition-colors">↗</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-[#172d4e] w-full" />
              <span className="bg-[#09172c] px-3 text-[10px] text-gray-400 uppercase tracking-widest font-mono">
                or use your email
              </span>
            </div>

            {/* Error Alert Box */}
            {authError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Authentication Note</p>
                  <p className="text-red-300/90 mt-0.5">{authError}</p>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {authSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Account authenticated! Opening patient workspace...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {authMode === 'signup' && (
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider block mb-1">
                    Full Name <span className="text-teal-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      name="name"
                      autoComplete="name"
                      placeholder="e.g. Vipul Jain"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#051020] border border-[#162d4e] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-teal-500 focus:outline-none transition-colors"
                      required={authMode === 'signup'}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider block mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#051020] border border-[#162d4e] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-teal-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                {hasRememberedEmail && authMode === 'signin' && (
                  <div className="flex items-center justify-between text-[10px] text-teal-400/90 mt-1.5 px-1 font-mono">
                    <span>💡 Remembered from last session</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('');
                        setHasRememberedEmail(false);
                        try { localStorage.removeItem('remembered_email'); } catch (_) {}
                      }}
                      className="text-gray-400 hover:text-red-400 underline transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {authMode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider block mb-1">Age</label>
                    <input
                      type="text"
                      placeholder="e.g. 28 Yrs"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-[#051020] border border-[#162d4e] rounded-xl px-3 py-2.5 text-xs text-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider block mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-[#051020] border border-[#162d4e] rounded-xl px-3 py-2.5 text-xs text-white focus:border-teal-500 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete={authMode === 'signup' ? "new-password" : "current-password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#051020] border border-[#162d4e] rounded-xl pl-10 pr-10 py-2.5 text-xs text-white focus:border-teal-500 focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Checkbox and Forgot Password Row */}
              <div className="flex items-center justify-between text-[11px] text-gray-300 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepMeSignedIn}
                    onChange={(e) => setKeepMeSignedIn(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-900 text-teal-400 focus:ring-0 accent-teal-400 cursor-pointer"
                  />
                  <span>Keep me signed in</span>
                </label>

                {authMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setAuthError("Contact support or sign in via Google to reset your password.")}
                    className="text-gray-300 hover:text-teal-300 underline text-[11px] transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {/* Submit Gradient Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-600 hover:from-teal-300 hover:to-blue-500 flex items-center justify-center space-x-2 text-xs shadow-xl shadow-teal-500/20 disabled:opacity-50 transition-all group mt-3"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{authMode === 'signin' ? 'Authenticating...' : 'Creating Account...'}</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Enter my workspace' : 'Create my account'}</span>
                    <span className="text-white group-hover:translate-x-0.5 transition-transform">↗</span>
                  </>
                )}
              </button>

              {/* Security Footer inside Card */}
              <div className="pt-2 text-center text-[10px] text-gray-400 font-mono flex items-center justify-center space-x-1">
                <Check className="w-3 h-3 text-teal-400" />
                <span>End-to-end encrypted · Never sold · Always yours</span>
              </div>

            </form>
          </div>

          {/* External Terms Footer */}
          <p className="text-center text-[10px] text-gray-400">
            By continuing, you agree to our <span className="text-gray-300 underline cursor-pointer">Terms</span> and <span className="text-gray-300 underline cursor-pointer">Privacy Policy</span>
          </p>

        </div>

      </div>
    </div>
  );
}
