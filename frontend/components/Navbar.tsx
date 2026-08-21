'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Clock, 
  Pill, 
  PlusCircle, 
  Bell, 
  Calendar, 
  MessageSquareHeart, 
  User 
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

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

        {/* User Account Badge */}
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-gray-900 border border-gray-700/80 text-xs text-gray-200 hover:border-teal-500/40 transition-colors"
          >
            <User className="w-4 h-4 text-teal-400" />
            <span className="hidden sm:inline font-semibold">Rajesh Kumar</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
