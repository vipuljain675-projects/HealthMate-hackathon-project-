'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Building2, Pencil, Trash2, Save, X, Check, Loader2 } from 'lucide-react';
import { BACKEND_URL } from '@/lib/config';

interface AppointmentCardProps {
  id: string;
  doctor_name?: string;
  hospital?: string;
  appointment_date: string;
  appointment_time?: string;
  reason?: string;
  status: string;
  onRefresh?: () => void;
}

export default function AppointmentCard({
  id,
  doctor_name = '',
  hospital = '',
  appointment_date,
  appointment_time = '10:00',
  reason = '',
  status: initialStatus,
  onRefresh
}: AppointmentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit fields state
  const [editDoctor, setEditDoctor] = useState(doctor_name);
  const [editHospital, setEditHospital] = useState(hospital);
  const [editDate, setEditDate] = useState(appointment_date);
  const [editTime, setEditTime] = useState(appointment_time);
  const [editReason, setEditReason] = useState(reason);
  const [editStatus, setEditStatus] = useState(initialStatus);

  const handleSave = async () => {
    if (!editDate) return;
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock_token_dev'
        },
        body: JSON.stringify({
          doctor_name: editDoctor,
          hospital: editHospital,
          appointment_date: editDate,
          appointment_time: editTime,
          reason: editReason,
          status: editStatus
        })
      });
      if (!res.ok) throw new Error('Failed to update appointment');
      setIsEditing(false);
      onRefresh?.();
    } catch (err) {
      alert('Error updating appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer mock_token_dev'
        }
      });
      if (!res.ok) throw new Error('Failed to delete appointment');
      onRefresh?.();
    } catch (err) {
      alert('Error deleting appointment');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={`glass-card rounded-2xl p-5 border transition-all ${
      isEditing ? 'border-teal-500/60 shadow-lg shadow-teal-500/10' : 'border-gray-800 hover:border-blue-500/40'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-1.5 pr-2">
                <input
                  type="text"
                  value={editDoctor}
                  placeholder="Doctor Name"
                  onChange={e => setEditDoctor(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:border-teal-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={editHospital}
                  placeholder="Hospital / Clinic"
                  onChange={e => setEditHospital(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-gray-300 focus:border-teal-500 focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <h3 className="text-base font-bold text-white truncate">
                  {editDoctor || 'Scheduled Appointment'}
                </h3>
                {editHospital && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 text-blue-400" />
                    {editHospital}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons / Status */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {!isEditing && !showDeleteConfirm && (
            <>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 capitalize">
                {editStatus}
              </span>
              <button
                onClick={() => setIsEditing(true)}
                title="Edit Appointment"
                className="p-1.5 rounded-lg text-gray-500 hover:text-teal-405 hover:bg-teal-500/10 transition-all cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete Appointment"
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-405 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {isEditing && (
            <div className="flex items-center gap-1.5">
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none"
              >
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                onClick={handleSave}
                disabled={saving}
                title="Save Changes"
                className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30 transition-all cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  setEditDoctor(doctor_name);
                  setEditHospital(hospital);
                  setEditDate(appointment_date);
                  setEditTime(appointment_time);
                  setEditReason(reason);
                  setEditStatus(initialStatus);
                  setIsEditing(false);
                }}
                title="Cancel Edit"
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
              <span className="text-[10px] text-red-400 font-bold">Delete?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded hover:bg-red-500 transition-all cursor-pointer"
              >
                {deleting ? '...' : 'Yes'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-[10px] bg-gray-800 text-gray-300 font-bold px-2 py-0.5 rounded hover:bg-gray-700 transition-all cursor-pointer"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Date & Time display / input fields */}
      <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 flex items-center justify-between text-xs mb-3">
        {isEditing ? (
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-gray-500 font-bold uppercase">Date</span>
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-gray-500 font-bold uppercase">Time</span>
              <input
                type="time"
                value={editTime}
                onChange={e => setEditTime(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2 text-gray-300 font-semibold">
              <Calendar className="w-4 h-4 text-teal-400" />
              <span>{editDate}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-300 font-semibold">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>{editTime || '09:00 AM'}</span>
            </div>
          </>
        )}
      </div>

      {/* Reason display / input field */}
      {isEditing ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-gray-500 font-bold uppercase">Reason for Visit</span>
          <input
            type="text"
            value={editReason}
            placeholder="Reason (e.g. Cardiology consult)"
            onChange={e => setEditReason(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-gray-200 focus:border-teal-500 focus:outline-none"
          />
        </div>
      ) : (
        editReason && (
          <p className="text-xs text-gray-400 bg-gray-950/40 p-2.5 rounded-lg border border-gray-800/80">
            <span className="text-gray-500 font-medium">Reason: </span>
            {editReason}
          </p>
        )
      )}
    </div>
  );
}
