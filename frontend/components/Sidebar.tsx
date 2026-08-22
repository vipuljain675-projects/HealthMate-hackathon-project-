'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Clock, 
  Pill, 
  FileText, 
  Calendar, 
  Bell, 
  MessageSquareHeart, 
  PlusCircle
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [timelineCount, setTimelineCount] = useState<string>('1');

  useEffect(() => {
    // Fetch real timeline records count dynamically
    fetch('http://localhost:8000/api/timeline', {
      headers: { 'Authorization': 'Bearer mock_token_dev' }
    })
      .then(res => res.json())
      .then(data => {
        const count = data?.timeline_events?.visits?.length || 0;
        setTimelineCount(count.toString());
      })
      .catch(() => setTimelineCount('1'));
  }, []);

  // Hide Sidebar on Login/Signup page
  if (pathname === '/') {
    return null;
  }

  const navItems = [
    { name: 'Overview', href: '/overview', icon: LayoutDashboard },
    { name: 'Health timeline', href: '/timeline', icon: Clock, badge: timelineCount },
    { name: 'Medications', href: '/medications', icon: Pill },
    { name: 'Documents', href: '/entry/new', icon: FileText },
    { name: 'Appointments', href: '/appointments', icon: Calendar },
    { name: 'Reminders', href: '/reminders', icon: Bell },
    { name: 'AI Assistant', href: '/ask', icon: MessageSquareHeart, badge: 'AI' },
  ];

  return (
    <aside className="w-64 bg-[#080d16] border-r border-gray-800/80 flex flex-col justify-between hidden md:flex min-h-screen sticky top-0 h-screen overflow-y-auto">
      <div>
        {/* Top Logo Header */}
        <div className="p-6 border-b border-gray-800/60">
          <Link href="/overview" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center p-1.5 group-hover:scale-105 transition-transform overflow-hidden shadow-lg shadow-teal-500/10">
              <img src="/logo.png" alt="HealthVault Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
                Health<span className="gradient-text">Vault</span>
              </span>
              <span className="text-[9px] text-teal-400/80 tracking-widest uppercase block -mt-1 font-semibold">
                Personal Health OS
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Section */}
        <div className="p-4 space-y-6">
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
              MY WORKSPACE
            </p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-md shadow-teal-500/5 font-bold'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-gray-400'}`} />
                      <span>{item.name}</span>
                    </div>

                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        item.badge === 'AI'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA Card */}
      <div className="p-4 border-t border-gray-800/60">
        <Link
          href="/entry/new"
          className="w-full py-3 px-4 rounded-xl gradient-btn text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/20 hover:scale-[1.02] transition-transform"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Health Record</span>
        </Link>
      </div>
    </aside>
  );
}
