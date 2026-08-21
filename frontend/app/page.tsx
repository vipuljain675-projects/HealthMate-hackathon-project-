'use client';

import React, { useState } from 'react';
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
  CheckCircle2
} from 'lucide-react';

export default function AuthPage() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('Rajesh Kumar');
  const [email, setEmail] = useState('rajesh.kumar@example.com');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthSuccess(true);
    setTimeout(() => {
      window.location.href = '/timeline';
    }, 700);
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
              <span>Next-Gen Personal Health Records</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {authMode === 'signin' ? 'Welcome Back to' : 'Create Your'} <span className="gradient-text">HealthVault</span>
            </h1>
            <p className="text-xs text-gray-400 leading-relaxed">
              Sign in to access your unified medical timeline, AI OCR scan extractions, and natural language medical Q&A.
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
                Sign In
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
                Create Account
              </button>
            </div>

            {authSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Authentication successful! Opening patient dashboard...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                      required
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
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
                className="w-full py-3.5 rounded-xl font-bold text-white gradient-btn flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/20"
              >
                <span>{isLoggingIn ? 'Authenticating...' : authMode === 'signin' ? 'Sign In to Workspace' : 'Register Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-2 text-center">
              <Link
                href="/timeline"
                className="text-xs text-teal-400 hover:text-teal-300 font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Enter Demo Patient Account Directly</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: AI Medical Graphic Visualization (7 cols) */}
        <div className="lg:col-span-7 relative flex items-center justify-center">
          
          {/* Ambient Glow Backdrops */}
          <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl blur-3xl opacity-60" />
          
          <div className="relative w-full rounded-3xl border border-teal-500/30 overflow-hidden shadow-2xl bg-gray-950/80 group">
            
            {/* Generated Futuristic AI Medical Image */}
            <img
              src="/healthvault_hero.png"
              alt="AI Health Visualization"
              className="w-full h-[520px] object-cover opacity-90 group-hover:scale-102 transition-transform duration-700"
            />

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070a11] via-transparent to-transparent opacity-80" />

            {/* Floating Live Tech Badges */}
            <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 gap-3">
              
              <div className="glass-card p-3 rounded-2xl border border-teal-500/30 backdrop-blur-md flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-white block">Groq AI Vision</span>
                  <span className="text-[9px] text-teal-300">OCR Scan Parser</span>
                </div>
              </div>

              <div className="glass-card p-3 rounded-2xl border border-blue-500/30 backdrop-blur-md flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-white block">ChromaDB RAG</span>
                  <span className="text-[9px] text-blue-300">Vector Search</span>
                </div>
              </div>

              <div className="glass-card p-3 rounded-2xl border border-emerald-500/30 backdrop-blur-md flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-white block">Live Supabase DB</span>
                  <span className="text-[9px] text-emerald-300">Encrypted Postgres</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-gray-500 border-t border-gray-800/40">
        © 2026 HealthVault Personal Health Platform. Powered by FastAPI, Supabase, Groq & ChromaDB.
      </footer>
    </div>
  );
}
