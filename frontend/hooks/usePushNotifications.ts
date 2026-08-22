'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const BACKEND_URL = 'http://localhost:8000';
const AUTH_HEADER = { 'Authorization': 'Bearer mock_token_dev' };
const POLL_INTERVAL_MS = 30 * 1000;

export type NotifStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

export interface ReminderToast {
  id: string;
  title: string;
  body: string;
  timestamp: Date;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<NotifStatus>('idle');
  const [message, setMessage] = useState('');
  const [toasts, setToasts] = useState<ReminderToast[]>([]);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!('Notification' in window)) { setStatus('unsupported'); return; }
    if (Notification.permission === 'granted') setStatus('granted');
    else if (Notification.permission === 'denied') setStatus('denied');
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Play a soft beep using Web Audio API (no file needed)
  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.8);
    } catch (e) {
      // Audio not available — silently skip
    }
  }, []);

  const fireReminderAlert = useCallback((reminder: any, fireKey: string) => {
    firedRef.current.add(fireKey);
    const title = `💊 Medicine Reminder: ${reminder.medicine_name}`;
    const body = `Time to take your ${reminder.dosage || ''} dose of ${reminder.medicine_name}.`;

    // 1. In-app toast (always works)
    const toast: ReminderToast = { id: fireKey, title, body, timestamp: new Date() };
    setToasts(prev => [toast, ...prev].slice(0, 5));

    // 2. Play beep sound
    playBeep();

    // 3. Try OS notification as bonus (may or may not show based on macOS settings)
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/icon.png', requireInteraction: true, tag: fireKey });
      } catch (e) {}
    }
    console.log(`[Reminder] ✅ Fired: ${title}`);
  }, [playBeep]);

  // Polling loop
  useEffect(() => {
    const checkReminders = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/reminders`, { headers: AUTH_HEADER });
        if (!res.ok) return;
        const reminders: any[] = await res.json();
        const now = new Date();
        const hhmm = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        for (const r of reminders) {
          if (!r.active) continue;
          const fireKey = `${r.id}-${hhmm}`;
          if (r.time_of_day === hhmm && !firedRef.current.has(fireKey)) {
            fireReminderAlert(r, fireKey);
          }
        }
      } catch (err) { console.error('[Reminder Poll]', err); }
    };

    checkReminders();
    const interval = setInterval(checkReminders, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fireReminderAlert]);

  const enableNotifications = async () => {
    if (!('Notification' in window)) { setStatus('unsupported'); return; }
    setStatus('requesting');
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setStatus('granted');
      setMessage('✅ Browser notifications also enabled as bonus!');
    } else {
      setStatus('denied');
      setMessage('OS notifications blocked — in-app alerts + sound will still work!');
    }
  };

  const sendTestNotification = () => {
    const mockReminder = {
      id: 'test-' + Date.now(),
      medicine_name: 'Test Medicine',
      dosage: '1 Tablet',
      time_of_day: new Date().toTimeString().slice(0, 5)
    };
    fireReminderAlert(mockReminder, `test-${Date.now()}`);
    setMessage('Test alert fired! Check the notification banner above.');
  };

  return { status, message, toasts, dismissToast, enableNotifications, sendTestNotification };
}
