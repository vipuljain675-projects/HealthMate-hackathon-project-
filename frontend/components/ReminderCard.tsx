'use client';

import React, { useState } from 'react';
import { Bell, Clock, Check, Pencil, Trash2, Save, X, FileText } from 'lucide-react';

interface ReminderCardProps {
  id: string;
  medicine_name: string;
  dosage?: string;
  time_of_day: string;
  frequency: string;
  notes?: string;
  active: boolean;
  onRefresh?: () => void;
}

export default function ReminderCard({
  id,
  medicine_name,
  dosage,
  time_of_day,
  frequency,
  notes,
  active: initialActive,
  onRefresh
}: ReminderCardProps) {
  const [active, setActive] = useState(initialActive);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState(medicine_name);
  const [editDosage, setEditDosage] = useState(dosage || '');
  const [editTime, setEditTime] = useState(time_of_day);
  const [editFrequency, setEditFrequency] = useState(frequency);
  const [editNotes, setEditNotes] = useState(notes || '');

  const handleToggle = async () => {
    const nextActive = !active;
    setActive(nextActive);
    try {
      await fetch(`http://localhost:8000/api/reminders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_token_dev' },
        body: JSON.stringify({ active: nextActive })
      });
    } catch {
      setActive(active); // Revert on failure
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`http://localhost:8000/api/reminders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_token_dev' },
        body: JSON.stringify({
          medicine_name: editName,
          dosage: editDosage,
          time_of_day: editTime,
          frequency: editFrequency,
          notes: editNotes
        })
      });
      setIsEditing(false);
      onRefresh?.();
    } catch {
      alert('Error saving reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`http://localhost:8000/api/reminders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer mock_token_dev' }
      });
      onRefresh?.();
    } catch {
      alert('Error deleting reminder');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={`glass-card rounded-2xl p-5 border transition-all ${
      isEditing ? 'border-teal-500/60 shadow-lg shadow-teal-500/10' : active ? 'border-teal-500/30 bg-teal-950/10' : 'border-gray-800 opacity-75'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3.5 flex-1 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            active ? 'bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-lg shadow-teal-500/20' : 'bg-gray-800 text-gray-500'
          }`}>
            <Bell className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:border-teal-500 focus:outline-none"
              />
            ) : (
              <h4 className="text-base font-bold text-white flex items-center gap-2 truncate">
                <span>{editName}</span>
                {editDosage && (
                  <span className="text-xs text-teal-400 font-normal px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20 flex-shrink-0">
                    {editDosage}
                  </span>
                )}
              </h4>
            )}

            {!isEditing && (
              <div className="flex flex-wrap items-center space-x-3 text-xs text-gray-400 mt-1">
                <span className="flex items-center gap-1 font-semibold text-teal-300">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  {editTime}
                </span>
                <span>•</span>
                <span className="capitalize">{editFrequency}</span>
                {editNotes && (
                  <>
                    <span>•</span>
                    <span className="text-gray-400 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-gray-500" />
                      {editNotes}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {!isEditing && !showDeleteConfirm && (
            <>
              {/* Toggle Switch */}
              <button
                onClick={handleToggle}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                  active ? 'bg-teal-500 justify-end' : 'bg-gray-700 justify-start'
                }`}
                title={active ? 'Deactivate Alarm' : 'Activate Alarm'}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                  {active && <Check className="w-3 h-3 text-teal-600" />}
                </div>
              </button>

              <button
                onClick={() => setIsEditing(true)}
                title="Edit Alarm"
                className="p-1.5 rounded-lg text-gray-500 hover:text-teal-400 hover:bg-teal-500/10 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete Alarm"
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-semibold">Dosage</label>
              <input
                value={editDosage}
                onChange={e => setEditDosage(e.target.value)}
                placeholder="e.g. 20mg"
                className="w-full mt-0.5 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-semibold">Time of Day</label>
              <input
                type="time"
                value={editTime}
                onChange={e => setEditTime(e.target.value)}
                className="w-full mt-0.5 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-semibold">Frequency</label>
              <select
                value={editFrequency}
                onChange={e => setEditFrequency(e.target.value)}
                className="w-full mt-0.5 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:border-teal-500 focus:outline-none"
              >
                <option value="daily">Daily</option>
                <option value="once daily">Once Daily</option>
                <option value="twice daily">Twice Daily</option>
                <option value="weekly">Weekly</option>
                <option value="as needed">As Needed</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-semibold">Notes</label>
              <input
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="e.g. After breakfast"
                className="w-full mt-0.5 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-1.5 rounded-xl gradient-btn text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Alarm'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-xs font-semibold hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mt-3 pt-3 border-t border-red-500/20 flex items-center justify-between gap-3">
          <p className="text-xs text-red-300">⚠️ Delete alarm for <strong>{editName}</strong>?</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
