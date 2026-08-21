'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import TimelineCard from '@/components/TimelineCard';
import { Clock, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

function cleanAIResponse(text: string): string {
  if (!text) return '';
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, '');
  cleaned = cleaned.replace(/<\/?think>/gi, '');
  return cleaned.trim();
}

export default function TimelinePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/timeline', {
        headers: { 'Authorization': 'Bearer mock_token_dev' }
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

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Chronological Health History</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            My Health <span className="gradient-text">Timeline</span>
          </h1>
        </div>

        <button
          onClick={fetchTimeline}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-xs font-semibold text-gray-300 hover:text-white hover:border-teal-500/40 transition-all w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {loading && (
        <div className="text-center py-16 space-y-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Loading your complete medical history...</p>
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
          {/* AI Timeline Summary Card */}
          <div className="glass-card rounded-2xl p-6 border border-teal-500/30 bg-gradient-to-br from-teal-950/20 via-gray-900 to-gray-900 shadow-xl">
            <div className="flex items-center space-x-2 text-teal-400 font-bold text-sm mb-3">
              <Sparkles className="w-4 h-4" />
              <span>AI Synthesized Overview for {data?.patient?.name}</span>
            </div>
            <div className="text-sm text-gray-300 leading-relaxed bg-gray-950/60 p-4 rounded-xl border border-gray-800 prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                  em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                  li: ({ children }) => <li className="text-gray-200">{children}</li>,
                  h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-3 mb-1">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold text-teal-300 mt-3 mb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold text-teal-400 mt-2 mb-1">{children}</h3>,
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-300">{children}</p>,
                }}
              >
                {cleanAIResponse(data?.summary || '')}
              </ReactMarkdown>
            </div>
          </div>

          {/* Visits List */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Medical Visits & Ingested Scans</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-800 text-teal-400 font-mono">
                {visits.length} records
              </span>
            </h2>

            {visits.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-gray-400 text-sm">
                No medical visit records found. Click "Add Record" to scan a prescription or enter details manually.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {visits.map((v: any) => (
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
        </>
      )}
    </div>
  );
}
