'use client';

import React, { useEffect, useState } from 'react';
import ReminderCard from '@/components/ReminderCard';
import ReminderToastContainer from '@/components/ReminderToastContainer';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, Plus, BellRing, CheckCircle2, XCircle, Loader2, Send, AlertTriangle } from 'lucide-react';

import { BACKEND_URL } from '@/lib/config';

export default function RemindersPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [frequency, setFrequency] = useState('daily');
  const [isAdding, setIsAdding] = useState(false);

  const { status, message, toasts, dismissToast, enableNotifications, sendTestNotification } = usePushNotifications();

  const getAuthToken = () => {
    try {
      const raw = localStorage.getItem('user_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.auth_token) return parsed.auth_token;
      }
    } catch (e) {}
    return 'mock_token_dev';
  };

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/reminders`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (!res.ok) throw new Error('Failed to load reminders');
      setReminders(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName) return;
    setIsAdding(true);
    try {
      await fetch(`${BACKEND_URL}/api/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ medicine_name: medicineName, dosage, time_of_day: timeOfDay, frequency })
      });
      setMedicineName(''); setDosage('');
      fetchReminders();
    } catch { alert('Error creating reminder'); }
    finally { setIsAdding(false); }
  };

  useEffect(() => { fetchReminders(); }, []);

  const statusConfig = {
    idle: { icon: <Bell className="w-5 h-5" />, label: 'Enable Notifications for Medicine Reminders', color: 'border-teal-500/40 text-teal-300 bg-teal-500/10', showEnable: true, showTest: false },
    requesting: { icon: <Loader2 className="w-5 h-5 animate-spin" />, label: 'Requesting Permission...', color: 'border-gray-600 text-gray-400 bg-gray-900', showEnable: false, showTest: false },
    granted: { icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, label: '🔔 Reminders Active — In-app alerts + sound + OS notifications', color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10', showEnable: false, showTest: true },
    denied: { icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />, label: 'OS Notifications blocked — in-app alerts + sound will still work!', color: 'border-yellow-500/40 text-yellow-300 bg-yellow-500/10', showEnable: false, showTest: true },
    unsupported: { icon: <XCircle className="w-5 h-5 text-red-400" />, label: 'Browser does not support notifications', color: 'border-red-500/40 text-red-300 bg-red-500/10', showEnable: false, showTest: false },
  };
  const cfg = statusConfig[status] || statusConfig['idle'];

  return (
    <>
      {/* Global Toast Overlay */}
      <ReminderToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-800 pb-6">
          <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4" />
            <span>Automated Medicine Alarms</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Medicine <span className="gradient-text">Reminders</span>
          </h1>
        </div>

        {/* Notification Status Banner */}
        <div className={`glass-card rounded-2xl p-5 border ${cfg.color} flex flex-col sm:flex-row sm:items-center gap-4`}>
          <div className="flex items-center gap-3 flex-1">
            {cfg.icon}
            <div>
              <p className="font-bold text-sm">{cfg.label}</p>
              {status === 'idle' && <p className="text-xs opacity-70 mt-0.5">In-app alerts + sound always work. OS notifications are a bonus.</p>}
              {message && <p className="text-xs opacity-80 mt-0.5">{message}</p>}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {cfg.showEnable && (
              <button onClick={enableNotifications} className="px-4 py-2 rounded-xl gradient-btn text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20">
                <BellRing className="w-4 h-4" /> Allow Notifications
              </button>
            )}
            {cfg.showTest && (
              <button onClick={sendTestNotification} className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm font-semibold flex items-center gap-2 hover:border-teal-500/40 transition-colors">
                <Send className="w-4 h-4 text-teal-400" /> Send Test Ping
              </button>
            )}
            {status === 'idle' && (
              <button onClick={sendTestNotification} className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm font-semibold flex items-center gap-2 hover:border-teal-500/40 transition-colors">
                <Send className="w-4 h-4 text-teal-400" /> Test Alert
              </button>
            )}
          </div>
        </div>

        {/* Add Reminder Form */}
        <form onSubmit={handleAddReminder} className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Set New Alarm Schedule
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input type="text" placeholder="Medicine Name (e.g. Atorvastatin)" value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none" required />
            <input type="text" placeholder="Dosage (e.g. 20mg)" value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none" />
            <input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none" required />
            <button type="submit" disabled={isAdding}
              className="py-2.5 px-4 rounded-xl font-bold text-white gradient-btn text-sm flex items-center justify-center gap-2">
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isAdding ? 'Setting...' : 'Add Alarm'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            💡 <strong className="text-gray-400">Testing tip:</strong> Set the time to 1-2 minutes from now then click "Test Alert" — a banner + sound will fire instantly, or wait for the scheduled time!
          </p>
        </form>

        {/* Reminders List */}
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Loading reminder schedules...</div>
        ) : reminders.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-gray-400 text-sm">No medicine reminders set. Create your first alarm schedule above.</div>
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
                notes={r.notes}
                active={r.active}
                onRefresh={fetchReminders}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
