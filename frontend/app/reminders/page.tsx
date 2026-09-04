'use client';

import React, { useEffect, useState } from 'react';
import ReminderCard from '@/components/ReminderCard';
import { Bell, Plus, CheckCircle2, Loader2, Send, AlertTriangle, Phone } from 'lucide-react';

import { BACKEND_URL } from '@/lib/config';

export default function RemindersPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [frequency, setFrequency] = useState('daily');
  const [isAdding, setIsAdding] = useState(false);

  // WhatsApp Alert Configuration State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [editPhoneInput, setEditPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState('');

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

  const handleSyncFromPrescriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/reminders/auto-sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReminders(data);
      }
    } catch (e) {
      console.error('Error auto-syncing reminders:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePhone = async () => {
    const phone = editPhoneInput.trim();
    if (!phone) return;
    setSavingPhone(true);
    setPhoneSaved(false);
    try {
      const raw = localStorage.getItem('user_session');
      const session = raw ? JSON.parse(raw) : {};
      const updated = { ...session, phone_number: phone };
      localStorage.setItem('user_session', JSON.stringify(updated));

      await fetch(`${BACKEND_URL}/api/me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          name: session.name || 'Patient Profile',
          phone_number: phone
        })
      });

      setPhoneNumber(phone);
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Failed to save phone number. Please try again.');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSendTestNotification = async () => {
    setTestLoading(true);
    setTestMessage('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/test-notification`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (res.ok) {
        setTestMessage('✅ Test alert triggered! Check your WhatsApp.');
      } else {
        throw new Error('Server returned error');
      }
    } catch (e) {
      setTestMessage('❌ Failed to trigger test. Ensure Twilio setup is complete.');
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
    try {
      const raw = localStorage.getItem('user_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.phone_number) {
          setPhoneNumber(parsed.phone_number);
          setEditPhoneInput(parsed.phone_number);
        }
      }
    } catch (e) {}
  }, []);

  return (
    <>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Bell className="w-4 h-4" />
              <span>Automated Medicine Alarms</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Medicine <span className="gradient-text">Reminders</span>
            </h1>
          </div>
          <button
            onClick={handleSyncFromPrescriptions}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
          >
            <span>✨ Sync Alarms from Prescriptions</span>
          </button>
        </div>

        {/* WhatsApp Notification Status Banner */}
        {phoneNumber ? (
          <div className="glass-card rounded-2xl p-5 border border-emerald-500/40 text-emerald-300 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-sm">🔔 WhatsApp Reminders Active</p>
                <p className="text-xs opacity-80 mt-0.5">
                  Medicine alarms → <span className="font-bold text-white">{phoneNumber}</span>.
                  Ensure you sent <code className="bg-black/30 px-1 rounded">join &lt;sandbox-word&gt;</code> to <strong className="text-white">+1 415 523 8886</strong> on WhatsApp.
                </p>
                {testMessage && <p className="text-xs font-semibold mt-1">{testMessage}</p>}
              </div>
            </div>
            <button
              onClick={handleSendTestNotification}
              disabled={testLoading}
              className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 hover:border-emerald-500/40 text-white text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
            >
              {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-emerald-400" />}
              <span>Test WhatsApp</span>
            </button>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-5 border border-yellow-500/40 text-yellow-300 bg-yellow-500/10 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">⚠️ WhatsApp Reminders Not Set Up</p>
                <p className="text-xs opacity-80 mt-0.5">
                  Enter your WhatsApp number with country code (e.g. <span className="font-bold text-white">+91XXXXXXXXXX</span>).
                  You must also text <code className="bg-black/20 px-1 rounded">join &lt;sandbox-word&gt;</code> to <strong className="text-white">+1 415 523 8886</strong> on WhatsApp first.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400" />
                <input
                  type="tel"
                  placeholder="+91XXXXXXXXXX"
                  value={editPhoneInput}
                  onChange={(e) => setEditPhoneInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-yellow-500/30 rounded-xl text-sm text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none"
                />
              </div>
              <button
                onClick={handleSavePhone}
                disabled={savingPhone || !editPhoneInput.trim()}
                className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {savingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {phoneSaved ? '✅ Saved!' : 'Save Number'}
              </button>
            </div>
          </div>
        )}

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
            💡 <strong className="text-gray-400">Tip:</strong> Set the time 1–2 minutes from now, save your phone number, then click &quot;Test WhatsApp&quot; to verify everything works!
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
