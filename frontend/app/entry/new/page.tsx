'use client';

import React from 'react';
import ClinicalEntryForm from '@/components/ClinicalEntryForm';
import { PlusCircle } from 'lucide-react';

export default function NewEntryPage() {
  return (
    <div className="space-y-8">
      <div className="border-b border-gray-800 pb-6">
        <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <PlusCircle className="w-4 h-4" />
          <span>Clinical Data Ingestion</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Add New <span className="gradient-text">Medical Record</span>
        </h1>
      </div>

      <ClinicalEntryForm />
    </div>
  );
}
