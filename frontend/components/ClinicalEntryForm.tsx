'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Pill, 
  TestTube 
} from 'lucide-react';

export default function ClinicalEntryForm() {
  const [activeTab, setActiveTab] = useState<'ocr' | 'manual'>('ocr');
  
  // OCR State
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Manual Entry Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hospital, setHospital] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [reason, setReason] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');

  const [medications, setMedications] = useState<Array<{ drug_name: string; dosage: string; frequency: string; purpose: string }>>([
    { drug_name: '', dosage: '', frequency: '', purpose: '' }
  ]);

  const [labs, setLabs] = useState<Array<{ test_name: string; value: string; flag: string }>>([
    { test_name: '', value: '', flag: 'normal' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle OCR File Upload
  const handleOcrUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setOcrError(null);
    setOcrResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/api/entry/ocr', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock_token_dev'
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setOcrResult(data);
    } catch (err: any) {
      setOcrError(err.message || 'Failed to process document scan.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Manual Entry Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);

    const payload = {
      date,
      hospital,
      doctor_name: doctorName,
      reason,
      diagnosis,
      notes,
      medications: medications.filter(m => m.drug_name.trim() !== ''),
      labs: labs.filter(l => l.test_name.trim() !== '')
    };

    try {
      const res = await fetch('http://localhost:8000/api/entry/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock_token_dev'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to create clinical record');
      }

      const data = await res.json();
      setSuccessMessage('Medical record saved and synced to timeline!');
      // Reset form
      setReason('');
      setDiagnosis('');
      setNotes('');
    } catch (err: any) {
      alert(err.message || 'Submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Mode Selector Tabs */}
      <div className="flex p-1 bg-gray-900/80 rounded-2xl border border-gray-800 mb-8">
        <button
          onClick={() => setActiveTab('ocr')}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'ocr'
              ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-lg shadow-teal-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Upload Document Scan (OCR AI)</span>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'manual'
              ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-lg shadow-teal-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Manual Form Entry</span>
        </button>
      </div>

      {/* Tab Content 1: OCR Upload */}
      {activeTab === 'ocr' && (
        <div className="glass-card rounded-2xl p-8 border border-gray-800">
          <div className="text-center max-w-lg mx-auto mb-8">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7 text-teal-400" />
            </div>
            <h2 className="text-xl font-bold text-white">AI Medical Document Scan</h2>
            <p className="text-sm text-gray-400 mt-1">
              Upload a picture or PDF of a doctor prescription, lab report, or hospital bill. Groq Vision will automatically extract structured entities & sync to your RAG vector store.
            </p>
          </div>

          <form onSubmit={handleOcrUpload} className="space-y-6 max-w-xl mx-auto">
            <div className="border-2 border-dashed border-gray-700 hover:border-teal-500/60 rounded-2xl p-8 text-center bg-gray-900/40 transition-colors">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer space-y-3 block">
                <FileText className="w-10 h-10 text-teal-400 mx-auto" />
                <div className="text-sm text-gray-300">
                  {file ? (
                    <span className="font-semibold text-teal-300">{file.name}</span>
                  ) : (
                    <span>Click to browse or drag & drop prescription scan</span>
                  )}
                </div>
                <span className="text-xs text-gray-500 block">Supports PNG, JPG, JPEG, PDF up to 10MB</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!file || isUploading}
              className="w-full py-3.5 rounded-xl font-bold text-white gradient-btn flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Running Groq Vision OCR Extraction...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Scan & Ingest Document</span>
                </>
              )}
            </button>
          </form>

          {ocrResult && (
            <div className="mt-8 p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-base">
                <CheckCircle2 className="w-5 h-5" />
                <span>Document Ingested Successfully!</span>
              </div>
              <p className="text-xs text-gray-300">
                Extracted data saved to PostgreSQL and vectorized into ChromaDB.
              </p>

              <div className="bg-gray-900 p-4 rounded-xl text-xs text-gray-300 space-y-2 border border-gray-800">
                <span className="font-semibold text-teal-400 block">Extracted Text Preview:</span>
                <p className="font-mono text-gray-400">{ocrResult.raw_text_snippet}</p>
              </div>
            </div>
          )}

          {ocrError && (
            <div className="mt-6 p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-sm flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span>{ocrError}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Manual Form */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="glass-card rounded-2xl p-8 border border-gray-800 space-y-6">
          <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-4">Manual Clinical Entry</h2>

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-sm flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Core Visit Meta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Visit Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Hospital / Clinic</label>
              <input
                type="text"
                placeholder="e.g. Apollo Clinic"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Doctor Name</label>
              <input
                type="text"
                placeholder="e.g. Dr. Sunita Mehta"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Reason for Visit</label>
              <input
                type="text"
                placeholder="e.g. High fever, hypertension checkup"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Diagnosis</label>
              <input
                type="text"
                placeholder="e.g. Primary Hypertension"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Clinical Free-Text Notes (Vector Searchable)</label>
            <textarea
              rows={3}
              placeholder="Enter doctor observations, advice, diet instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Medications Section */}
          <div className="space-y-3 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Prescribed Medications
              </h3>
              <button
                type="button"
                onClick={() => setMedications([...medications, { drug_name: '', dosage: '', frequency: '', purpose: '' }])}
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 bg-teal-500/10 px-3 py-1 rounded-lg border border-teal-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Medicine
              </button>
            </div>

            {medications.map((med, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-gray-900/60 p-3 rounded-xl border border-gray-800 items-center">
                <input
                  type="text"
                  placeholder="Drug Name (e.g. Amlodipine)"
                  value={med.drug_name}
                  onChange={(e) => {
                    const copy = [...medications];
                    copy[idx].drug_name = e.target.value;
                    setMedications(copy);
                  }}
                  className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-teal-500"
                />
                <input
                  type="text"
                  placeholder="Dosage (e.g. 5mg)"
                  value={med.dosage}
                  onChange={(e) => {
                    const copy = [...medications];
                    copy[idx].dosage = e.target.value;
                    setMedications(copy);
                  }}
                  className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-teal-500"
                />
                <input
                  type="text"
                  placeholder="Frequency (e.g. once daily)"
                  value={med.frequency}
                  onChange={(e) => {
                    const copy = [...medications];
                    copy[idx].frequency = e.target.value;
                    setMedications(copy);
                  }}
                  className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-teal-500"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Purpose (e.g. BP control)"
                    value={med.purpose}
                    onChange={(e) => {
                      const copy = [...medications];
                      copy[idx].purpose = e.target.value;
                      setMedications(copy);
                    }}
                    className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-teal-500 flex-1"
                  />
                  {medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setMedications(medications.filter((_, i) => i !== idx))}
                      className="text-gray-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl font-bold text-white gradient-btn flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving Record...</span>
              </>
            ) : (
              <span>Save Clinical Record to Database</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
