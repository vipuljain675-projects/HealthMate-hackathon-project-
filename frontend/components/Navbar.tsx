'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Clock, 
  Pill, 
  PlusCircle, 
  Bell, 
  Calendar, 
  MessageSquareHeart, 
  User, 
  LogOut,
  ChevronDown,
  ShieldCheck,
  FileText,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hide Navbar on Login/Signup Page
  if (pathname === '/') {
    return null;
  }

  const navLinks = [
    { name: 'Timeline', href: '/timeline', icon: Clock },
    { name: 'Medications', href: '/medications', icon: Pill },
    { name: 'Add Record', href: '/entry/new', icon: PlusCircle },
    { name: 'Reminders', href: '/reminders', icon: Bell },
    { name: 'Appointments', href: '/appointments', icon: Calendar },
    { name: 'AI Assistant', href: '/ask', icon: MessageSquareHeart },
  ];

  const handleLogout = () => {
    setIsOpen(false);
    // Clear local session storage if any
    try {
      localStorage.removeItem('user_session');
      sessionStorage.clear();
    } catch (e) {
      console.error(e);
    }
    // Redirect to Auth / Login page
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-50 glass-nav px-4 lg:px-8 py-3">
      <div className="max-w-[96%] xl:max-w-[1650px] mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/timeline" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center p-1.5 group-hover:scale-105 transition-transform overflow-hidden">
            <img src="/logo.png" alt="HealthVault Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              Health<span className="gradient-text">Vault</span>
            </span>
            <span className="text-[10px] text-teal-400/80 tracking-widest uppercase block -mt-1 font-semibold">
              Personal Health Platform
            </span>
          </div>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-lg shadow-teal-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-gray-400'}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>

        {/* User Account Circle Avatar & Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-gray-900/90 border border-gray-700/80 hover:border-teal-500/50 text-xs text-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/30 shadow-md group"
          >
            {/* Circle Avatar */}
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                RK
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-gray-900" />
            </div>

            <span className="hidden sm:inline font-semibold group-hover:text-teal-300 transition-colors">
              Rajesh Kumar
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-teal-400' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl glass-card bg-gray-950/95 border border-gray-800 shadow-2xl p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
              
              {/* Profile Info Header */}
              <div className="flex items-start space-x-3 pb-3 border-b border-gray-800/80">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-teal-500/20 flex-shrink-0">
                  RK
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">Rajesh Kumar</h4>
                  <p className="text-[11px] text-gray-400 truncate">rajesh.kumar@example.com</p>
                  
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-300">
                      PID-456789
                    </span>
                    <span className="text-[10px] text-gray-400">
                      56Y / Male
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="px-3 py-2 rounded-xl bg-teal-950/40 border border-teal-500/20 flex items-center justify-between text-xs">
                <span className="text-gray-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  Supabase Authenticated
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>

              {/* Navigation Quick Links */}
              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-2 mb-1">
                  Quick Navigation
                </p>
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-teal-300 hover:bg-gray-900 transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5 text-teal-400" />
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-800/80 pt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 hover:bg-red-900/40 hover:border-red-500/50 transition-all text-xs font-bold shadow-md group"
                >
                  <LogOut className="w-4 h-4 text-red-400 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Sign Out / Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}
