'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  ShieldCheck, 
  LogOut, 
  CheckCircle2, 
  Clock,
  FileText,
  X,
  UserX,
  Edit3,
  User,
  Save
} from 'lucide-react';

export default function HeaderBar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const [user, setUser] = useState({
    name: 'Vipul Jain',
    email: 'vipuljain675@gmail.com',
    age: '28 Yrs',
    gender: 'Male',
    patient_id: 'PID-456789'
  });

  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('Male');
  
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Load dynamic user session from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.name) {
          setUser(parsed);
          setEditName(parsed.name || '');
          setEditAge(parsed.age || '28 Yrs');
          setEditGender(parsed.gender || 'Male');
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hide Top Header on Auth / Login page
  if (pathname === '/') {
    return null;
  }

  const getBreadcrumbTitle = () => {
    switch (pathname) {
      case '/overview': return 'Overview';
      case '/timeline': return 'Health Timeline';
      case '/medications': return 'Medications';
      case '/entry/new': return 'Add Health Record & OCR Scan';
      case '/reminders': return 'Reminders';
      case '/appointments': return 'Appointments';
      case '/ask': return 'AI Health Assistant';
      default: return 'Overview';
    }
  };

  const getInitials = (nameStr: string) => {
    if (!nameStr) return 'VJ';
    const parts = nameStr.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return nameStr.slice(0, 2).toUpperCase();
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...user,
      name: editName.trim() || user.name,
      age: editAge.trim() || user.age,
      gender: editGender
    };
    setUser(updated);
    try {
      localStorage.setItem('user_session', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    setIsEditProfileOpen(false);
    window.location.reload();
  };

  // Temporary Exit: leaves account active, retains remembered_email so Email is pre-filled on Login screen
  const handleLogout = () => {
    setIsProfileOpen(false);
    try {
      localStorage.removeItem('user_session');
    } catch (e) {
      console.error(e);
    }
    router.push('/');
  };

  // Complete Exit: purges active session AND remembered_email so login fields start completely blank
  const handleSignOut = () => {
    setIsProfileOpen(false);
    try {
      localStorage.removeItem('user_session');
      localStorage.removeItem('remembered_email');
      sessionStorage.setItem('just_signed_out', 'true');
    } catch (e) {
      console.error(e);
    }
    window.location.href = '/?action=signout';
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#080d16]/95 backdrop-blur-md border-b border-gray-800/80 px-6 py-3.5 flex items-center justify-between">
        
        {/* Breadcrumb Left */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-gray-400 font-medium">My workspace</span>
          <span className="text-gray-600">/</span>
          <span className="text-white font-bold tracking-wide">{getBreadcrumbTitle()}</span>
        </div>

        {/* Right Controls: Search, Notifications, Profile Avatar */}
        <div className="flex items-center space-x-3">
          
          {/* Search Bar Button */}
          <button
            onClick={() => router.push('/ask')}
            className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-gray-900/90 border border-gray-800 text-xs text-gray-400 hover:text-white hover:border-teal-500/40 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-teal-400" />
            <span>Search records or ask AI...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-[10px] font-mono text-gray-500">⌘K</kbd>
          </button>

          {/* Notification Bell Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="w-9 h-9 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-300 hover:text-white hover:border-teal-500/40 transition-all relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-gray-300" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-400" />
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#090e17] border border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 z-[100]">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-teal-400" />
                    Health Notifications
                  </span>
                  <button onClick={() => setIsNotifOpen(false)} className="text-gray-500 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-gray-900/90 border border-teal-500/20 text-xs space-y-1">
                    <div className="flex items-center justify-between text-teal-300 font-bold">
                      <span>💊 Active Reminders Alert</span>
                      <span className="text-[10px] text-teal-400 font-mono">Live</span>
                    </div>
                    <p className="text-[11px] text-gray-400">Scheduled alarms & health updates ready for {user.name}.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Circle Avatar Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-2 p-1 pl-1.5 pr-2.5 rounded-full bg-gray-900 border border-gray-800 hover:border-teal-500/50 text-xs text-gray-200 transition-all focus:outline-none shadow-md group"
            >
              {/* Circle Avatar Logo */}
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                  {getInitials(user.name)}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-2 border-gray-900" />
              </div>

              <span className="hidden sm:inline font-semibold group-hover:text-teal-300 transition-colors">
                {user.name}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180 text-teal-400' : ''}`} />
            </button>

            {/* Profile Dropdown Popup Card (Solid non-overlapping background) */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2.5 w-72 rounded-2xl bg-[#090e17] border border-gray-800 shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150 z-[100]">
                
                {/* Patient Profile Header */}
                <div className="flex items-start space-x-3 pb-3 border-b border-gray-800">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-teal-500/20 flex-shrink-0">
                    {getInitials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          setIsEditProfileOpen(true);
                        }}
                        className="text-teal-400 hover:text-teal-300 px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                        title="Edit Age & Gender"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{user.email}</p>
                    
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-300 font-bold">
                        {user.patient_id || 'PID-456789'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {user.age || '28 Yrs'} / {user.gender || 'Male'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="px-3 py-2 rounded-xl bg-teal-950/50 border border-teal-500/30 flex items-center justify-between text-xs">
                  <span className="text-gray-300 flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    Authenticated Session
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>

                {/* Quick Links */}
                <div className="space-y-1 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-2 mb-1">
                    Quick Navigation
                  </p>
                  <Link
                    href="/overview"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-teal-300 hover:bg-gray-900 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>Workspace Overview</span>
                  </Link>
                  <Link
                    href="/medications"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-teal-300 hover:bg-gray-900 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-teal-400" />
                    <span>Medications Tracker</span>
                  </Link>
                </div>

                {/* Logout & Sign Out Action Buttons */}
                <div className="border-t border-gray-800 pt-2.5 space-y-1.5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-teal-500/40 text-gray-300 hover:text-white transition-all text-xs font-semibold group"
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="w-3.5 h-3.5 text-teal-400 group-hover:-translate-x-0.5 transition-transform" />
                      <span>Logout</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">Pre-fill Email</span>
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-red-950/30 border border-red-500/30 hover:bg-red-950/60 hover:border-red-500/50 text-red-300 hover:text-red-100 transition-all text-xs font-semibold group"
                  >
                    <span className="flex items-center gap-2">
                      <UserX className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
                      <span>Sign Out</span>
                    </span>
                    <span className="text-[10px] text-red-400/70 font-mono">Clear Saved</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Edit Profile Modal (Mounted at Screen Root z-[999] so it floats perfectly in viewport center) */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#090e17] border border-gray-800 rounded-3xl p-6 shadow-[0_30px_70px_rgba(0,0,0,0.95)] space-y-5 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-gray-800 pb-3.5">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <User className="w-4 h-4" />
                </div>
                <span>Edit Patient Profile</span>
              </div>
              <button 
                onClick={() => setIsEditProfileOpen(false)} 
                className="w-7 h-7 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:border-teal-500/40 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="text-gray-400 font-semibold uppercase tracking-wider block mb-1.5">
                  Full Name <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 font-semibold uppercase tracking-wider block mb-1.5">
                    Age
                  </label>
                  <input
                    type="text"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    placeholder="e.g. 28 Yrs"
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 font-semibold uppercase tracking-wider block mb-1.5">
                    Gender
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2.5 border-t border-gray-800/80">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 font-semibold hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl gradient-btn text-white font-bold flex items-center space-x-1.5 shadow-lg shadow-teal-500/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
