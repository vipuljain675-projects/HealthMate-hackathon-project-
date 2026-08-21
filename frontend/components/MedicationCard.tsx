'use client';

import React from 'react';
import { Pill, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface MedicationCardProps {
  drug_name: string;
  dosage?: string;
  frequency?: string;
  purpose?: string;
  status: string;
  started_on?: string;
}

export default function MedicationCard({
  drug_name,
  dosage,
  frequency,
  purpose,
  status,
  started_on
}: MedicationCardProps) {
  const isActive = status.toLowerCase() === 'active';

  return (
    <div className="glass-card rounded-2xl p-5 border border-gray-800 hover:border-teal-500/40 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isActive ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-gray-800 text-gray-400'
          }`}>
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
              {drug_name} {dosage && <span className="text-teal-400 font-normal">({dosage})</span>}
            </h3>
            {purpose && <p className="text-xs text-gray-400 mt-0.5">{purpose}</p>}
          </div>
        </div>

        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isActive
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            : 'bg-gray-800 text-gray-400 border border-gray-700'
        }`}>
          {isActive ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              <span>Active</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3" />
              <span>Discontinued</span>
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-gray-800/80">
        <div>
          <span className="text-gray-500 font-medium block">Timing / Frequency</span>
          <span className="text-gray-300 font-semibold flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-teal-400" />
            {frequency || 'As prescribed'}
          </span>
        </div>
        <div>
          <span className="text-gray-500 font-medium block">Prescribed Since</span>
          <span className="text-gray-300 font-semibold block mt-0.5">
            {started_on || 'Not specified'}
          </span>
        </div>
      </div>
    </div>
  );
}
