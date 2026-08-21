'use client';

import React, { useEffect, useState } from 'react';
import AppointmentCard from '@/components/AppointmentCard';
import { Calendar, Plus } from 'lucide-react';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [doctorName, setDoctorName] = useState('');
  const [hospital, setHospital] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [reason, setReason] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/appointments', {
        headers: { 'Authorization': 'Bearer mock_token_dev' }
      });
      if (!res.ok) throw new Error('Failed to load appointments');
      const data = await res.json();
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentDate) return;

    setIsAdding(true);
    try {
      const res = await fetch('http://localhost:8000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock_token_dev'
        },
        body: JSON.stringify({
          doctor_name: doctorName,
          hospital,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          reason
        })
      });
      if (!res.ok) throw new Error('Failed to create appointment');
      setDoctorName('');
      setHospital('');
      setReason('');
      fetchAppointments();
    } catch (err) {
      alert('Error creating appointment');
    } finally {
      setIsAdding(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="border-b border-gray-800 pb-6">
        <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Calendar className="w-4 h-4" />
          <span>Consultation Schedule</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Doctor <span className="gradient-text">Appointments</span>
        </h1>
      </div>

      {/* Add Form */}
      <form onSubmit={handleAddAppointment} className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
        <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Schedule Upcoming Appointment
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Doctor Name (e.g. Dr. Sunita Mehta)"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Hospital / Clinic (e.g. Apollo)"
            value={hospital}
            onChange={(e) => setHospital(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
          />
          <input
            type="date"
            value={appointmentDate}
            onChange={(e) => setAppointmentDate(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="time"
            value={appointmentTime}
            onChange={(e) => setAppointmentTime(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Reason for Visit"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-teal-500 focus:outline-none md:col-span-2"
          />
          <button
            type="submit"
            disabled={isAdding}
            className="py-2 px-4 rounded-xl font-bold text-white gradient-btn text-sm"
          >
            {isAdding ? 'Scheduling...' : 'Save Appointment'}
          </button>
        </div>
      </form>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-gray-400 text-sm">
          No upcoming appointments scheduled.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((a: any) => (
            <AppointmentCard
              key={a.id}
              doctor_name={a.doctor_name}
              hospital={a.hospital}
              appointment_date={a.appointment_date}
              appointment_time={a.appointment_time}
              reason={a.reason}
              status={a.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
