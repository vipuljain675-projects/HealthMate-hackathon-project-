'use client';

import { useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import type { ReminderToast } from '@/hooks/usePushNotifications';

interface Props {
  toasts: ReminderToast[];
  onDismiss: (id: string) => void;
}

export default function ReminderToastContainer({ toasts, onDismiss }: Props) {
  // Auto-dismiss after 12 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const latest = toasts[0];
    const timer = setTimeout(() => onDismiss(latest.id), 12000);
    return () => clearTimeout(timer);
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto w-[340px] rounded-2xl border border-teal-500/40 bg-gray-950/95 backdrop-blur-xl shadow-2xl shadow-teal-500/20 p-4 flex items-start gap-3 animate-in slide-in-from-right-5 duration-300"
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/30">
            <Bell className="w-5 h-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">{toast.title}</p>
            <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{toast.body}</p>
            <p className="text-[10px] text-teal-400 mt-1 font-mono">
              {toast.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-gray-500 hover:text-white transition-colors flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
