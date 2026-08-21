'use client';

import React, { useEffect, useState } from 'react';
import MedicationCard from '@/components/MedicationCard';
import { Pill, Filter } from 'lucide-react';

export default function MedicationsPage() {
  const [meds, setMeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchMeds = async () => {
    setLoading(true);
    try {
      const url = filterStatus === 'all'
        ? 'http://localhost:8000/api/medications'
        : `http://localhost:8000/api/medications?status=${filterStatus}`;
      const res = await fetch(url, {
        headers: { 'Authorization': 'Bearer mock_token_dev' }
      });
      if (!res.ok) throw new Error('Failed to load medications');
      const data = await res.json();
      setMeds(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeds();
  }, [filterStatus]);

  return (
    <div className="space-y-8">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Pill className="w-4 h-4" />
            <span>Prescription Tracker</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Current & Past <span className="gradient-text">Medications</span>
          </h1>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center space-x-2 bg-gray-900 p-1.5 rounded-xl border border-gray-800">
          <Filter className="w-4 h-4 text-gray-500 ml-2" />
          {['all', 'active', 'discontinued'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterStatus === status
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm text-gray-400">Loading prescription details...</div>
      ) : meds.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-gray-400 text-sm">
          No medications found under the "{filterStatus}" filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meds.map((m: any) => (
            <MedicationCard
              key={m.id}
              drug_name={m.drug_name}
              dosage={m.dosage}
              frequency={m.frequency}
              purpose={m.purpose}
              status={m.status}
              started_on={m.started_on}
            />
          ))}
        </div>
      )}
    </div>
  );
}
