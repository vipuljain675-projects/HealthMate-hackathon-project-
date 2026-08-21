'use client';

import React from 'react';
import { Calendar, Clock, User, Building2, MapPin } from 'lucide-react';

interface AppointmentCardProps {
  doctor_name?: string;
  hospital?: string;
  appointment_date: string;
  appointment_time?: string;
  reason?: string;
  status: string;
}

export default function AppointmentCard({
  doctor_name,
  hospital,
  appointment_date,
  appointment_time,
  reason,
  status
}: AppointmentCardProps) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-gray-800 hover:border-blue-500/40 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {doctor_name || 'Scheduled Appointment'}
            </h3>
            {hospital && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3 text-blue-400" />
                {hospital}
              </p>
            )}
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 capitalize">
          {status}
        </span>
      </div>

      <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 flex items-center justify-between text-xs mb-3">
        <div className="flex items-center space-x-2 text-gray-300 font-semibold">
          <Calendar className="w-4 h-4 text-teal-400" />
          <span>{appointment_date}</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-300 font-semibold">
          <Clock className="w-4 h-4 text-blue-400" />
          <span>{appointment_time || '09:00 AM'}</span>
        </div>
      </div>

      {reason && (
        <p className="text-xs text-gray-400 bg-gray-950/40 p-2.5 rounded-lg border border-gray-800/80">
          <span className="text-gray-500 font-medium">Reason: </span>
          {reason}
        </p>
      )}
    </div>
  );
}
