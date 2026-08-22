'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import TimelineCard from '@/components/TimelineCard';
import { 
  Clock, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  PlusCircle, 
  FileText, 
  Calendar,
  Building2,
  Stethoscope
} from 'lucide-react';

function cleanAIResponse(text: string): string {
  if (!text) return '';
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, '');
  cleaned = cleaned.replace(/<\/?think>/gi, '');
  return cleaned.trim();
}

export default function HealthTimelinePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTimeline = async () => {
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
    fetchTimeline();
  }, []);

  const visits = data?.timeline_events?.visits || [];
  const patient = data?.patient || { name: 'Vipul Jain' };

  // Filter visits by search query (doctor, hospital, diagnosis, reason)
  const filteredVisits = visits.filter((v: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (v.doctor || '').toLowerCase().includes(q) ||
      (v.hospital || '').toLowerCase().includes(q) ||
      (v.diagnosis || '').toLowerCase().includes(q) ||
      (v.reason || '').toLowerCase().includes(q) ||
      (v.notes || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      
      {/* ── HEADER BANNER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Chronological Medical History</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Health <span className="gradient-text">Timeline</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Complete history of doctor visits, clinical diagnoses, and OCR prescription scans for <strong>{patient.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTimeline}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-xs font-semibold text-gray-300 hover:text-white hover:border-teal-500/40 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/entry/new"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl gradient-btn text-white text-xs font-bold shadow-lg shadow-teal-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Record</span>
          </Link>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 space-y-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Loading complete medical timeline for {patient.name}...</p>
        </div>
      )}

      {error && (
        <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/30 text-red-300 text-sm flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-bold">Backend Connection Note</p>
            <p className="text-xs text-red-400 mt-0.5">{error}. Ensure FastAPI is running on `http://localhost:8000`.</p>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* ── AI SYNTHESIZED TIMELINE OVERVIEW CARD ── */}
          <div className="glass-card rounded-2xl p-6 border border-teal-500/30 bg-gradient-to-br from-teal-950/30 via-gray-900 to-gray-900 shadow-xl space-y-3">
            <div className="flex items-center space-x-2 text-teal-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>AI Synthesized Clinical History Overview</span>
            </div>
            <div className="text-xs text-gray-300 leading-relaxed bg-gray-950/70 p-4 rounded-xl border border-gray-800/80 prose prose-invert prose-xs max-w-none">
              <ReactMarkdown
                components={{
                  strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                  em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                  li: ({ children }) => <li className="text-gray-200">{children}</li>,
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-300">{children}</p>,
                }}
              >
                {cleanAIResponse(data?.summary || '')}
              </ReactMarkdown>
            </div>
          </div>

          {/* ── SEARCH & FILTER CONTROLS ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Filter by doctor, hospital, diagnosis, or symptom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <span className="text-xs text-gray-400 font-mono flex-shrink-0">
              Showing <strong>{filteredVisits.length}</strong> of {visits.length} records
            </span>
          </div>

          {/* ── VISITS CHRONOLOGICAL LIST ── */}
          <div className="space-y-4">
            {filteredVisits.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-gray-400 text-sm">
                No visit records found matching "{searchQuery}".
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredVisits.map((v: any) => (
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
                    labs={v.labs || []}
                    medications={v.medications || []}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
