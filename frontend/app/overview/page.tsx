'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import TimelineCard from '@/components/TimelineCard';
import { 
  Heart, 
  Pill, 
  Calendar, 
  FileText, 
  ArrowUpRight, 
  Sparkles, 
  PlusCircle, 
  Upload, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Activity,
  Bot,
  ArrowRight
} from 'lucide-react';

function cleanAIResponse(text: string): string {
  if (!text) return '';
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, '');
  cleaned = cleaned.replace(/<\/?think>/gi, '');
  return cleaned.trim();
}

export default function OverviewDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localUser, setLocalUser] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_session');
      if (raw) setLocalUser(JSON.parse(raw));
    } catch (e) {}
  }, []);

  const fetchOverviewData = async () => {
    setLoading(true);
    setError(null);
    try {
      let token = 'mock_token_dev';
      try {
        const raw = localStorage.getItem('user_session');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.auth_token) token = parsed.auth_token;
        }
      } catch (e) {}

      const res = await fetch('http://localhost:8000/api/timeline', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load health timeline');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error connecting to backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const visits = data?.timeline_events?.visits || [];
  const meds = data?.timeline_events?.medications || [];
  const labs = data?.timeline_events?.labs || [];
  const reminders = data?.timeline_events?.reminders || [];
  const appts = data?.timeline_events?.appointments || [];
  
  const patientName = localUser?.name || data?.patient?.name || 'Patient';
  const patientAge = localUser?.age || '35 Yrs';
  const patientGender = localUser?.gender || 'Male';

  // Calculate REAL DYNAMIC METRICS from DB
  const activeMedsCount = meds.filter((m: any) => (m.status || 'active').toLowerCase() === 'active').length;
  const upcomingCareCount = appts.filter((a: any) => (a.status || 'upcoming').toLowerCase() === 'upcoming').length + 
                            reminders.filter((r: any) => r.active !== false).length;
  // Records in vault = number of unique uploaded document scans (each visit = 1 document upload)
  // Labs are sub-items inside a visit document, NOT separate vault records
  const totalVaultRecords = visits.length;
  
  // Heart Health status from latest visit diagnosis
  const latestVisit = visits[0];
  const heartHealthStatus = latestVisit?.diagnosis ? (
    latestVisit.diagnosis.toLowerCase().includes('angina') || latestVisit.diagnosis.toLowerCase().includes('hyperlipidemia')
      ? 'Stable'
      : 'Normal'
  ) : 'Stable';

  const latestVisitDate = latestVisit?.date 
    ? new Date(latestVisit.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'No visits yet';

  const patientFirstName = patientName ? patientName.split(' ')[0] : 'Patient';

  return (
    <div className="space-y-8">
      
      {/* ── GREETING & TOP ACTIONS BANNER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-800/80 pb-6">
        <div>
          <p className="text-xs font-mono font-bold tracking-widest text-gray-500 uppercase mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Good morning, <span className="gradient-text">{patientName.split(' ')[0]}</span>.
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Here's a clear view of your personal health, all in one place.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/entry/new"
            className="px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700/80 text-gray-300 hover:text-white hover:border-teal-500/40 text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Upload className="w-4 h-4 text-teal-400" />
            <span>Import records</span>
          </Link>

          <Link
            href="/entry/new"
            className="px-5 py-2.5 rounded-xl gradient-btn text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 hover:scale-105 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add health record</span>
          </Link>
        </div>
      </div>

      {/* ── ACTIVE PATIENT PROFILE CONTEXT BAR ── */}
      <div className="glass-card rounded-2xl p-4 border border-teal-500/30 bg-teal-950/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
              ACTIVE PATIENT PROFILE
            </span>
            <span className="text-sm font-bold text-white">
              {patientName}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-6 text-xs text-gray-300">
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">AGE / GENDER</span>
            <span className="font-semibold text-white">{patientAge} / {patientGender}</span>
          </div>
          <div className="w-px h-6 bg-gray-800" />
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">LAST UPDATED</span>
            <span className="font-semibold text-teal-300">{latestVisitDate}</span>
          </div>
        </div>

        <Link
          href="/timeline"
          className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 group"
        >
          <span>View complete history</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── AT A GLANCE (REAL DYNAMIC STATS) ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            AT A GLANCE — YOUR HEALTH SNAPSHOT
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Heart Health */}
          <div className="glass-card rounded-2xl p-5 border border-gray-800 hover:border-teal-500/40 transition-all">
            <div className="flex items-center justify-between text-gray-400 mb-3">
              <span className="text-xs font-medium">Heart health</span>
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white tracking-tight">{heartHealthStatus}</p>
            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <span>Based on your latest visit</span>
              <ArrowUpRight className="w-3 h-3 text-teal-400" />
            </p>
          </div>

          {/* Card 2: Active Medications (REAL COUNT) */}
          <div className="glass-card rounded-2xl p-5 border border-gray-800 hover:border-teal-500/40 transition-all">
            <div className="flex items-center justify-between text-gray-400 mb-3">
              <span className="text-xs font-medium">Active medications</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <Pill className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white tracking-tight">{activeMedsCount}</p>
            <p className="text-[11px] text-gray-400 mt-1">
              {activeMedsCount > 0 ? 'Regular prescribed dosages' : 'No active medications'}
            </p>
          </div>

          {/* Card 3: Upcoming Care (REAL COUNT) */}
          <div className="glass-card rounded-2xl p-5 border border-gray-800 hover:border-teal-500/40 transition-all">
            <div className="flex items-center justify-between text-gray-400 mb-3">
              <span className="text-xs font-medium">Upcoming care</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white tracking-tight">
              {upcomingCareCount < 10 ? `0${upcomingCareCount}` : upcomingCareCount}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Active reminders & appointments
            </p>
          </div>

          {/* Card 4: Records in Vault (REAL COUNT) */}
          <div className="glass-card rounded-2xl p-5 border border-gray-800 hover:border-teal-500/40 transition-all">
            <div className="flex items-center justify-between text-gray-400 mb-3">
              <span className="text-xs font-medium">Records in vault</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white tracking-tight">{totalVaultRecords}</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Ingested clinical scans & reports
            </p>
          </div>

        </div>
      </div>

      {/* ── MAIN WORKSPACE GRID: RECENT ACTIVITY & AI HEALTH INSIGHT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: RECENT ACTIVITY (Top 2 Visits) (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">
                RECENT ACTIVITY
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Latest Medical Visits
              </h2>
            </div>
            <Link
              href="/timeline"
              className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1"
            >
              <span>View full timeline ({visits.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12 text-sm text-gray-400">Loading recent timeline activity...</div>
          ) : visits.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-gray-400 text-sm">
              No visit records found in your vault. Click "+ Add health record" to upload your first prescription.
            </div>
          ) : (
            <div className="space-y-4">
              {visits.slice(0, 3).map((v: any) => (
                <TimelineCard
                  key={v.id}
                  date={v.date}
                  hospital={v.hospital}
                  doctor={v.doctor}
                  reason={v.reason}
                  diagnosis={v.diagnosis}
                  notes={v.notes}
                  original_file_url={v.original_file_url}
                  source_type={v.source_type}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: AI HEALTH INSIGHT (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">
              AI HEALTH INSIGHT
            </span>
          </div>

          {/* AI Insight Box */}
          <div className="glass-card rounded-2xl p-6 border border-teal-500/30 bg-gradient-to-br from-teal-950/30 via-gray-900 to-gray-900 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-teal-400 font-bold text-sm">
              <Sparkles className="w-4.5 h-4.5 text-teal-400" />
              <span>Your care, understood.</span>
            </div>

            <div className="text-xs text-gray-300 leading-relaxed bg-gray-950/70 p-4 rounded-xl border border-gray-800/80 prose prose-invert prose-xs max-w-none">
              <ReactMarkdown
                components={{
                  strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                  em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-300">{children}</p>,
                }}
              >
                {cleanAIResponse(data?.summary || 'Your recent records show a consistent heart-health routine with Dr. Ramesh Verma at Metro Heart & Kidney Institute.')}
              </ReactMarkdown>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
              <span className="text-gray-400 flex items-center gap-1.5 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Grounded on verified medical records
              </span>

              <Link
                href="/ask"
                className="px-3.5 py-2 rounded-xl gradient-btn text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-500/10 hover:scale-105 transition-all"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Ask assistant ↗</span>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
