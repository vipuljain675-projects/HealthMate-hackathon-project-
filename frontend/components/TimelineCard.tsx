'use client';

import React from 'react';
import { Calendar, Building2, User, FileText, ExternalLink, Tag, TestTube2, Pill } from 'lucide-react';

import { BACKEND_URL } from '@/lib/config';

interface TimelineCardProps {
  date: string;
  hospital?: string;
  doctor?: string;
  reason?: string;
  diagnosis?: string;
  notes?: string;
  original_file_url?: string;
  source_type?: string;
  labs?: Array<{ test_name: string; value?: string; flag?: string }>;
  medications?: Array<{ drug_name: string; dosage?: string; frequency?: string }>;
}

export default function TimelineCard({
  date,
  hospital,
  doctor,
  reason,
  diagnosis,
  notes,
  original_file_url,
  source_type,
  labs = [],
  medications = []
}: TimelineCardProps) {
  const isLabReport = labs.length > 0 || (reason && reason.toLowerCase().includes('lab'));

  const scanUrl = original_file_url
    ? (original_file_url.startsWith('http')
        ? original_file_url
        : `${BACKEND_URL}${original_file_url.startsWith('/') ? '' : '/'}${original_file_url}`)
    : null;

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden transition-all hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-500/5 group">
      {/* Accent glow line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            <span>{date}</span>
          </div>
          
          <span className="px-2.5 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-[11px] text-gray-300 font-medium flex items-center gap-1">
            {isLabReport ? <TestTube2 className="w-3 h-3 text-purple-400" /> : <Tag className="w-3 h-3 text-teal-400" />}
            <span>{isLabReport ? '🧪 Lab Test Report' : (source_type === 'scan' ? 'OCR Prescription Scan' : 'Digital Manual Entry')}</span>
          </span>
        </div>

        {scanUrl && (
          <a
            href={scanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 text-xs text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 px-3 py-1.5 rounded-lg border border-teal-500/30 transition-colors w-fit"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View Original Scan</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        )}
      </div>

      <div className="space-y-3">
        {/* Doctor & Hospital Details */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-gray-300">
          <div className="flex items-center space-x-1.5 font-medium text-white">
            <User className="w-4 h-4 text-teal-400" />
            <span>{doctor || (isLabReport ? 'Diagnostic Pathologist' : 'Consultant Physician')}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-gray-400">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>{hospital || (isLabReport ? 'Clinical Diagnostic Lab' : 'Medical Center')}</span>
          </div>
        </div>

        {/* Reason & Diagnosis */}
        {reason && (
          <div>
            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold block mb-0.5">
              {isLabReport ? 'Test Category' : 'Reason for Visit'}
            </span>
            <p className="text-sm text-gray-200 font-medium">{reason}</p>
          </div>
        )}

        {diagnosis && (
          <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20">
            <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold block mb-1">Diagnosis</span>
            <p className="text-sm text-blue-100 font-medium">{diagnosis}</p>
          </div>
        )}

        {/* Labs Breakdown Table */}
        {labs.length > 0 && (
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs text-purple-300 font-bold uppercase tracking-wider">
              <TestTube2 className="w-3.5 h-3.5" />
              <span>Extracted Lab Values</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {labs.map((lab, idx) => {
                const isHigh = lab.flag && (lab.flag.toLowerCase().includes('elevated') || lab.flag.toLowerCase().includes('high'));
                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-900/80 border border-gray-800 text-xs">
                    <span className="text-gray-300 font-medium">{lab.test_name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-mono font-bold">{lab.value}</span>
                      {lab.flag && (
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${
                          isHigh ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        }`}>
                          {lab.flag}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Prescribed Medicines Pills */}
        {medications.length > 0 && (
          <div className="p-3.5 rounded-xl bg-teal-950/20 border border-teal-500/20 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs text-teal-300 font-bold uppercase tracking-wider">
              <Pill className="w-3.5 h-3.5" />
              <span>Prescribed Medications</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {medications.map((m, idx) => (
                <div key={idx} className="px-3 py-1.5 rounded-lg bg-gray-900/90 border border-gray-800 text-xs text-gray-200 flex items-center space-x-1.5">
                  <span className="font-bold text-teal-300">{m.drug_name}</span>
                  {m.dosage && <span className="text-gray-400">({m.dosage})</span>}
                  {m.frequency && <span className="text-gray-500 text-[11px]">• {m.frequency}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clinical Free-Text Notes */}
        {notes && (
          <div>
            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold block mb-1">Clinical Notes</span>
            <p className="text-sm text-gray-300 leading-relaxed bg-gray-900/50 p-3.5 rounded-xl border border-gray-800/80 font-mono text-xs">
              {notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
