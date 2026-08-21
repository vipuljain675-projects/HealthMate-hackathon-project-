'use client';

import React, { useState } from 'react';
import { Bell, Clock, Pill, Check } from 'lucide-react';

interface ReminderCardProps {
  id: string;
  medicine_name: string;
  dosage?: string;
  time_of_day: string;
  frequency: string;
  active: boolean;
}

export default function ReminderCard({
  medicine_name,
  dosage,
  time_of_day,
  frequency,
  active: initialActive
}: ReminderCardProps) {
  const [active, setActive] = useState(initialActive);

  return (
    <div className={`glass-card rounded-2xl p-5 border transition-all ${
      active ? 'border-teal-500/30 bg-teal-950/10' : 'border-gray-800 opacity-60'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            active ? 'bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-lg shadow-teal-500/20' : 'bg-gray-800 text-gray-500'
          }`}>
            <Bell className="w-5 h-5" />
          </div>

          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <span>{medicine_name}</span>
              {dosage && <span className="text-xs text-teal-400 font-normal px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20">{dosage}</span>}
            </h4>
            <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
              <span className="flex items-center gap-1 font-semibold text-teal-300">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                {time_of_day}
              </span>
              <span>•</span>
              <span className="capitalize">{frequency}</span>
            </div>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={() => setActive(!active)}
          className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${
            active ? 'bg-teal-500 justify-end' : 'bg-gray-700 justify-start'
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
            {active && <Check className="w-3 h-3 text-teal-600" />}
          </div>
        </button>
      </div>
    </div>
  );
}
