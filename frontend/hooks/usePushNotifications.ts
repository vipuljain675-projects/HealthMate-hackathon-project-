'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BACKEND_URL } from '@/lib/config';

const POLL_INTERVAL_MS = 30 * 1000;

export type NotifStatus = 'idle' | 'granted' | 'denied';

export interface ReminderToast {
  id: string;
  title: string;
  body: string;
  timestamp: Date;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<NotifStatus>('granted');
  const [message, setMessage] = useState('');
  const [toasts, setToasts] = useState<ReminderToast[]>([]);
  const firedRef = useRef<Set<string>>(new Set());

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

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Play a soft beep using Web Audio API
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
      // Audio not available
    }
  }, []);

  const fireReminderAlert = useCallback((reminder: any, fireKey: string) => {
    firedRef.current.add(fireKey);
    const title = `💊 Medicine Reminder: ${reminder.medicine_name}`;
    const body = `Time to take your ${reminder.dosage || ''} dose of ${reminder.medicine_name}.`;

    // In-app toast (always works)
    const toast: ReminderToast = { id: fireKey, title, body, timestamp: new Date() };
    setToasts(prev => [toast, ...prev].slice(0, 5));

    // Play beep sound
    playBeep();
    console.log(`[Reminder] ✅ Fired in-app alert: ${title}`);
  }, [playBeep]);

  // Polling loop
  useEffect(() => {
    const checkReminders = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/reminders`, {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
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
    // Simply sets message since WhatsApp is primary
    setMessage('WhatsApp alerts are active for registered phone numbers.');
  };

  const sendTestNotification = async () => {
    // Trigger local beep and toast
    const mockReminder = {
      id: 'test-' + Date.now(),
      medicine_name: 'Test Medicine',
      dosage: '1 Tablet',
      time_of_day: new Date().toTimeString().slice(0, 5)
    };
    fireReminderAlert(mockReminder, `test-${Date.now()}`);

    // Trigger backend WhatsApp test endpoint
    try {
      const res = await fetch(`${BACKEND_URL}/api/whatsapp-test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (res.ok) {
        setMessage('Test alert fired locally & WhatsApp ping triggered!');
      } else {
        setMessage('Local test alert fired! Add phone number to test WhatsApp.');
      }
    } catch (e) {
      setMessage('Test alert fired locally!');
    }
  };

  return { status, message, toasts, dismissToast, enableNotifications, sendTestNotification };
}
