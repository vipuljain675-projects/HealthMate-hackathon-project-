'use client';

import React, { useEffect, useState } from 'react';
import MedicationCard from '@/components/MedicationCard';
import { Pill, Filter, PlusCircle, X, Loader2, CheckCircle2 } from 'lucide-react';

export default function MedicationsPage() {
  const [meds, setMeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [drugName, setDrugName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [purpose, setPurpose] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('active');

  const fetchMeds = async () => {
    setLoading(true);
    try {
      const url = filterStatus === 'all'
        ? 'http://localhost:8000/api/medications'
        : `http://localhost:8000/api/medications?status=${filterStatus}`;
      let token = 'mock_token_dev';
      try {
        const raw = localStorage.getItem('user_session');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.auth_token) token = parsed.auth_token;
        }
      } catch (e) {}

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
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

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugName.trim()) {
      setFormError('Medicine name is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      let token = 'mock_token_dev';
      try {
        const raw = localStorage.getItem('user_session');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.auth_token) token = parsed.auth_token;
        }
      } catch (e) {}

      const res = await fetch('http://localhost:8000/api/medications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          drug_name: drugName.trim(),
          dosage: dosage.trim() || undefined,
          frequency: frequency.trim() || undefined,
          purpose: purpose.trim() || undefined,
          duration_days: durationDays.trim() || undefined,
          notes: notes.trim() || undefined,
          status: status
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to add medication');
      }

      // Reset form & close modal
      setDrugName('');
      setDosage('');
      setFrequency('');
      setPurpose('');
      setDurationDays('');
      setNotes('');
      setStatus('active');
      setIsModalOpen(false);

      // Refresh list
      fetchMeds();
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Pill className="w-4 h-4" />
            <span>Prescription Tracker</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Current & Past <span className="gradient-text">Medications</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          {/* Filter Buttons */}
          <div className="flex items-center space-x-1 bg-gray-900 p-1.5 rounded-xl border border-gray-800">
            <Filter className="w-4 h-4 text-gray-500 ml-1.5 mr-1" />
            {['all', 'active', 'discontinued'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filterStatus === s
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Add Medication Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl gradient-btn text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:scale-105 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Medication</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm text-gray-400 flex flex-col items-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
          <span>Loading prescription details...</span>
        </div>
      ) : meds.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-gray-400 space-y-3 border border-gray-800">
          <Pill className="w-10 h-10 text-gray-600 mx-auto" />
          <p className="text-base font-semibold text-white">No medications found</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            You don't have any medications recorded under the "{filterStatus}" filter. Click "+ Add Medication" to add a new prescription or advice.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold inline-flex items-center space-x-2 hover:bg-teal-500/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Medication Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meds.map((m: any) => (
            <MedicationCard
              key={m.id}
              id={m.id}
              drug_name={m.drug_name}
              dosage={m.dosage}
              frequency={m.frequency}
              purpose={m.purpose}
              duration_days={m.duration_days}
              notes={m.notes}
              status={m.status}
              started_on={m.started_on}
              onRefresh={fetchMeds}
            />
          ))}
        </div>
      )}

      {/* ── ADD MEDICATION MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card rounded-3xl p-6 border border-teal-500/40 bg-gray-950/95 max-w-md w-full shadow-2xl space-y-5 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Add New Medication</h3>
                  <p className="text-xs text-gray-400">Record a doctor's advice, SMS Rx, or over-the-counter medicine</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs font-medium">
                {formError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAddMedication} className="space-y-4">
              {/* Medicine Name & Dosage */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Medicine Name <span className="text-teal-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Azithromycin, Crocin"
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Dosage
                  </label>
                  <input
                    type="text"
                    placeholder="500mg, 10ml"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Timing / Frequency & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Timing / Frequency
                  </label>
                  <input
                    type="text"
                    placeholder="twice daily, TDS, 1-0-1"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Duration
                  </label>
                  <input
                    type="text"
                    placeholder="5 days, 1 month"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Purpose & Status */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Purpose / Symptoms
                  </label>
                  <input
                    type="text"
                    placeholder="Doctor WhatsApp advice, fever, throat"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              {/* Instructions / Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Instructions / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Take after meals, avoid milk..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-gray-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-xs font-bold text-gray-400 hover:text-white transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl gradient-btn text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-teal-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Medication</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
