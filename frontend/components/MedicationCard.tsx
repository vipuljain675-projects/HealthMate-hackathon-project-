'use client';

import React, { useState } from 'react';
import { Pill, Clock, CheckCircle2, AlertCircle, Pencil, Trash2, Save, X, Calendar, FileText } from 'lucide-react';

interface MedicationCardProps {
  id: string;
  drug_name: string;
  dosage?: string;
  frequency?: string;
  purpose?: string;
  duration_days?: string;
  notes?: string;
  status: string;
  started_on?: string;
  onRefresh?: () => void;
}

export default function MedicationCard({
  id, drug_name, dosage, frequency, purpose, duration_days, notes, status, started_on, onRefresh
}: MedicationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editable fields
  const [editDrug, setEditDrug] = useState(drug_name);
  const [editDosage, setEditDosage] = useState(dosage || '');
  const [editFrequency, setEditFrequency] = useState(frequency || '');
  const [editPurpose, setEditPurpose] = useState(purpose || '');
  const [editDuration, setEditDuration] = useState(duration_days || '');
  const [editNotes, setEditNotes] = useState(notes || '');
  const [editStatus, setEditStatus] = useState(status);

  const isActive = editStatus.toLowerCase() === 'active';

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`http://localhost:8000/api/medications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_token_dev' },
        body: JSON.stringify({
          drug_name: editDrug, dosage: editDosage, frequency: editFrequency,
          purpose: editPurpose, duration_days: editDuration, notes: editNotes, status: editStatus
        })
      });
      setIsEditing(false);
      onRefresh?.();
    } catch { alert('Error saving changes'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`http://localhost:8000/api/medications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer mock_token_dev' }
      });
      onRefresh?.();
    } catch { alert('Error deleting medication'); }
    finally { setDeleting(false); setShowDeleteConfirm(false); }
  };

  const handleCancel = () => {
    setEditDrug(drug_name); setEditDosage(dosage || ''); setEditFrequency(frequency || '');
    setEditPurpose(purpose || ''); setEditDuration(duration_days || ''); setEditNotes(notes || '');
    setEditStatus(status); setIsEditing(false);
  };

  return (
    <div className={`glass-card rounded-2xl p-5 border transition-all group ${isEditing ? 'border-teal-500/60 shadow-lg shadow-teal-500/10' : 'border-gray-800 hover:border-teal-500/40'}`}>
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-gray-800 text-gray-400'}`}>
            <Pill className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input value={editDrug} onChange={e => setEditDrug(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white focus:border-teal-500 focus:outline-none" />
            ) : (
              <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors truncate">
                {editDrug} {editDosage && <span className="text-teal-400 font-normal">({editDosage})</span>}
              </h3>
            )}
            {!isEditing && editPurpose && <p className="text-xs text-gray-400 mt-0.5 truncate">{editPurpose}</p>}
          </div>
        </div>

        {/* Status badge + action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {isEditing ? (
            <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs font-semibold text-white focus:border-teal-500 focus:outline-none">
              <option value="active">Active</option>
              <option value="discontinued">Discontinued</option>
            </select>
          ) : (
            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
              {isActive ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              <span>{isActive ? 'Active' : 'Discontinued'}</span>
            </span>
          )}

          {!isEditing && !showDeleteConfirm && (
            <>
              <button onClick={() => setIsEditing(true)} title="Edit"
                className="p-1.5 rounded-lg text-gray-500 hover:text-teal-400 hover:bg-teal-500/10 transition-all">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} title="Delete"
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit Form Fields */}
      {isEditing && (
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-semibold">Dosage</label>
              <input value={editDosage} onChange={e => setEditDosage(e.target.value)} placeholder="e.g. 20mg"
                className="w-full mt-0.5 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-semibold">Duration</label>
              <input value={editDuration} onChange={e => setEditDuration(e.target.value)} placeholder="e.g. 30 days"
                className="w-full mt-0.5 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-semibold">Frequency / Timing</label>
            <input value={editFrequency} onChange={e => setEditFrequency(e.target.value)} placeholder="e.g. 1 Tab OD at bedtime"
              className="w-full mt-0.5 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-semibold">Purpose</label>
            <input value={editPurpose} onChange={e => setEditPurpose(e.target.value)} placeholder="e.g. Hyperlipidemia"
              className="w-full mt-0.5 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-semibold">Notes</label>
            <input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="e.g. Take with food"
              className="w-full mt-0.5 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none" />
          </div>
        </div>
      )}

      {/* Info Grid (view mode) */}
      {!isEditing && (
        <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-gray-800/80">
          <div>
            <span className="text-gray-500 font-medium block">Timing / Frequency</span>
            <span className="text-gray-300 font-semibold flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-teal-400" />
              {editFrequency || 'As prescribed'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 font-medium block">Prescribed Since</span>
            <span className="text-gray-300 font-semibold flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-teal-400" />
              {started_on || 'Not specified'}
            </span>
          </div>
          {editDuration && (
            <div>
              <span className="text-gray-500 font-medium block">Duration</span>
              <span className="text-amber-300 font-bold flex items-center gap-1 mt-0.5">
                📅 {editDuration}
              </span>
            </div>
          )}
          {editNotes && (
            <div>
              <span className="text-gray-500 font-medium block">Notes</span>
              <span className="text-gray-300 flex items-center gap-1 mt-0.5">
                <FileText className="w-3 h-3 text-gray-500" />{editNotes}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 rounded-xl gradient-btn text-white text-xs font-bold flex items-center justify-center gap-1.5">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={handleCancel}
            className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-xs font-semibold hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="mt-3 pt-3 border-t border-red-500/20 flex items-center justify-between gap-3">
          <p className="text-xs text-red-300">⚠️ Delete <strong>{editDrug}</strong> permanently?</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} disabled={deleting}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors">
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-xs font-semibold">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
