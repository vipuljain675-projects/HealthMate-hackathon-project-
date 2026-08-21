'use client';

import React, { useEffect, useState } from 'react';
import ReminderCard from '@/components/ReminderCard';
import { Bell, Plus, Clock, Pill } from 'lucide-react';

export default function RemindersPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [frequency, setFrequency] = useState('daily');
  const [isAdding, setIsAdding] = useState(false);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/reminders', {
        headers: { 'Authorization': 'Bearer mock_token_dev' }
      });
      if (!res.ok) throw new Error('Failed to load reminders');
      const data = await res.json();
      setReminders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName) return;

    setIsAdding(true);
    try {
      const res = await fetch('http://localhost:8000/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock_token_dev'
        },
        body: JSON.stringify({
          medicine_name: medicineName,
          dosage,
          time_of_day: timeOfDay,
          frequency
        })
      });
      if (!res.ok) throw new Error('Failed to add reminder');
      setMedicineName('');
      setDosage('');
      fetchReminders();
    } catch (err) {
      alert('Error creating reminder');
    } finally {
      setIsAdding(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="border-b border-gray-800 pb-6">
        <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Bell className="w-4 h-4" />
          <span>Automated Medicine Alarms</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Medicine <span className="gradient-text">Reminders</span>
        </h1>
      </div>

      {/* Add Reminder Form */}
      <form onSubmit={handleAddReminder} className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
        <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Set New Alarm Schedule
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Medicine Name (e.g. Amlodipine)"
            value={medicineName}
            onChange={(e) => setMedicineName(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
            required
          />
          <input
            type="text"
            placeholder="Dosage (e.g. 5mg)"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
          />
          <input
            type="time"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={isAdding}
            className="py-2 px-4 rounded-xl font-bold text-white gradient-btn text-sm"
          >
            {isAdding ? 'Setting...' : 'Add Alarm'}
          </button>
        </div>
      </form>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">Loading reminder schedules...</div>
      ) : reminders.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-gray-400 text-sm">
          No medicine reminders set. Create your first alarm schedule above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reminders.map((r: any) => (
            <ReminderCard
              key={r.id}
              id={r.id}
              medicine_name={r.medicine_name}
              dosage={r.dosage}
              time_of_day={r.time_of_day}
              frequency={r.frequency}
              active={r.active}
            />
          ))}
        </div>
      )}
    </div>
  );
}
