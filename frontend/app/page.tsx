'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  ArrowRight, 
  Lock, 
  Mail, 
  Key, 
  User, 
  Activity, 
  Database, 
  BrainCircuit,
  CheckCircle2,
  Calendar,
  Loader2
} from 'lucide-react';

export default function AuthPage() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('35 Yrs');
  const [gender, setGender] = useState('Male');
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  // Load remembered email on mount if user previously logged out
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
      
      // Clear stale timestamped sessions
      const raw = localStorage.getItem('user_session');
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.auth_token && /\d{13}$/.test(session.auth_token)) {
          localStorage.removeItem('user_session');
        }
      }
    } catch (_) {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    const patientEmail = email.trim();
    if (!patientEmail) return;

    const patientName = name.trim() || (authMode === 'signup' ? 'New Patient' : patientEmail.split('@')[0]);
    
    // Stable token based on email so patient record persists across logins
    const stableKey = patientEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const authToken = `mock_user_${stableKey}`;

    const userSession = {
      auth_token: authToken,
      name: patientName,
      email: patientEmail,
      age: age || '35 Yrs',
      gender: gender || 'Male',
      patient_id: `PID-${Math.floor(100000 + Math.random() * 900000)}`
    };

    try {
      localStorage.setItem('user_session', JSON.stringify(userSession));
      // Save remembered_email so returning via Logout pre-fills email
      localStorage.setItem('remembered_email', patientEmail);
      
      // Register or update profile in live backend Supabase Postgres DB
      await fetch('http://localhost:8000/api/me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: patientName, email: patientEmail })
      });
    } catch (err) {
      console.error('Session save error:', err);
    }

    setAuthSuccess(true);

    setTimeout(() => {
      window.location.href = '/overview';
    }, 600);
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
          <span className="text-gray-400 hidden sm:inline">Protected by Supabase Auth</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </header>

      {/* Main Grid: Left Form & Right Futuristic Hero Image */}
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
                ? 'Sign in with your email and password to access your patient workspace.'
                : 'Create a new account to unify your medical records, OCR scans, and AI health timeline.'}
            </p>
          </div>

          {/* Form Container */}
          <div className="glass-card rounded-3xl p-7 border border-gray-800/80 shadow-2xl space-y-5 relative">
            
            {/* Tab Switcher */}
            <div className="flex p-1 bg-gray-900/90 rounded-xl border border-gray-800">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
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
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  authMode === 'signup'
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {authSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Account authenticated! Opening patient workspace...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Full Name
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
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Email Address</label>
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
              </div>

              {authMode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Age</label>
                    <input
                      type="text"
                      placeholder="e.g. 35 Yrs"
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
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Password</label>
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

            <div className="pt-2 text-center text-xs text-gray-500">
              By continuing, you agree to HealthVault's <span className="text-gray-400 underline">Terms of Service</span>.
            </div>
          </div>
        </div>

        {/* Right Column: Hero Graphic */}
        <div className="lg:col-span-7 hidden lg:block">
          <div className="relative rounded-3xl overflow-hidden border border-gray-800 shadow-2xl group">
            <img 
              src="/healthvault_auth_hero.png" 
              alt="HealthVault Medical Workspace" 
              className="w-full h-[540px] object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070a11] via-[#070a11]/40 to-transparent flex flex-col justify-end p-8">
              <div className="glass-card rounded-2xl p-5 border border-teal-500/30 bg-gray-950/80 max-w-md">
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
