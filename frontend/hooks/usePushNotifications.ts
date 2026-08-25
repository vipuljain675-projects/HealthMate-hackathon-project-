'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

import { BACKEND_URL } from '@/lib/config';
const AUTH_HEADER = { 'Authorization': 'Bearer mock_token_dev' };
const POLL_INTERVAL_MS = 30 * 1000;

export type NotifStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

export interface ReminderToast {
  id: string;
  title: string;
  body: string;
  timestamp: Date;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<NotifStatus>('idle');
  const [message, setMessage] = useState('');
  const [toasts, setToasts] = useState<ReminderToast[]>([]);
  const firedRef = useRef<Set<string>>(new Set());

  const registerServiceWorkerAndSubscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] Service Worker or PushManager not supported');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      console.log('[Push] Service Worker ready:', reg.scope);

      const keyRes = await fetch(`${BACKEND_URL}/api/vapid-public-key`);
      if (!keyRes.ok) return;
      const { vapid_public_key } = await keyRes.json();
      if (!vapid_public_key) return;

      const applicationServerKey = urlBase64ToUint8Array(vapid_public_key);
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }

      const subJson = sub.toJSON();
      await fetch(`${BACKEND_URL}/api/push-subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...AUTH_HEADER
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys
        })
      });
      console.log('[Push] ✅ Web Push subscription registered with backend successfully!');
    } catch (err) {
      console.error('[Push] Web Push subscription error:', err);
    }
  }, []);

  useEffect(() => {
    if (!('Notification' in window)) { setStatus('unsupported'); return; }
    if (Notification.permission === 'granted') {
      setStatus('granted');
      registerServiceWorkerAndSubscribe();
    } else if (Notification.permission === 'denied') {
      setStatus('denied');
    }
  }, [registerServiceWorkerAndSubscribe]);

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

    // 3. Try OS notification as bonus
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
      setMessage('✅ Background Web Push notifications enabled! Alerts will arrive even when site is closed.');
      await registerServiceWorkerAndSubscribe();
    } else {
      setStatus('denied');
      setMessage('OS notifications blocked — in-app alerts + sound will still work!');
    }
  };

  const sendTestNotification = async () => {
    const mockReminder = {
      id: 'test-' + Date.now(),
      medicine_name: 'Test Medicine',
      dosage: '1 Tablet',
      time_of_day: new Date().toTimeString().slice(0, 5)
    };
    fireReminderAlert(mockReminder, `test-${Date.now()}`);

    // Also trigger backend Web Push test endpoint
    try {
      await fetch(`${BACKEND_URL}/api/push-test`, {
        method: 'POST',
        headers: AUTH_HEADER
      });
      setMessage('Test alert fired & OS Push sent! Check your notification center.');
    } catch (e) {
      setMessage('Test alert fired! Check notification banner above.');
    }
  };

  return { status, message, toasts, dismissToast, enableNotifications, sendTestNotification };
}

