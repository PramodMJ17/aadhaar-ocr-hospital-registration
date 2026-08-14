import React, { useEffect, useState } from 'react';
import { Stethoscope, Calendar, Clock, UserCheck, Activity, Award, ShieldAlert, CheckCircle2, AlertCircle, CalendarDays } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

function formatDateTime(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DoctorDashboard({ user, token, onError }) {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDoctorAppointments = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`${BACKEND_URL}/api/appointments`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load doctor appointments.');
        }

        setAppointments(data.appointments || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch appointments.';
        setError(message);
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctorAppointments();
  }, [token, onError]);

  const scheduledCount = appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length;
  const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Doctor Profile Banner */}
      <section className="rounded-3xl bg-white border border-gray-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl font-headline border border-primary/20 shadow-inner">
              <Stethoscope className="w-8 h-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Doctor Clinical Portal</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-headline mt-1">
                Welcome, {user?.name || user?.username || 'Doctor'}
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1">
                Manage your clinical schedule, review assigned patient queues, and record consultations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-surface-container-low px-4 py-3 rounded-2xl border border-outline-variant/10">
            <Award className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="text-xs font-bold text-gray-900">Clinical Workstation</p>
              <p className="text-[11px] text-gray-500 font-medium">Ramaiah Memorial Hospital</p>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Cards */}
      <section className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-md hover:shadow-xl transition-all">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Total Appointments</span>
            <div className="rounded-xl p-2.5 bg-blue-50 text-blue-600 border border-blue-100">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 tracking-tight font-headline">{appointments.length}</p>
          <p className="mt-2 text-xs text-gray-500 font-medium">Assigned to your clinic</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-md hover:shadow-xl transition-all">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Scheduled Queue</span>
            <div className="rounded-xl p-2.5 bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-900 tracking-tight font-headline">{scheduledCount}</p>
          <p className="mt-2 text-xs text-amber-600 font-medium">Awaiting consultation</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-md hover:shadow-xl transition-all">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Completed</span>
            <div className="rounded-xl p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-900 tracking-tight font-headline">{completedCount}</p>
          <p className="mt-2 text-xs text-emerald-600 font-medium">Consultations finished</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-md hover:shadow-xl transition-all">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Practice Status</span>
            <div className="rounded-xl p-2.5 bg-purple-50 text-purple-600 border border-purple-100">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg font-extrabold text-purple-900 tracking-tight font-headline mt-1">Available</p>
          <p className="mt-2 text-xs text-purple-600 font-medium">Consultation slot engine online</p>
        </div>
      </section>

      {/* Patient Appointments Queue */}
      <section className="rounded-3xl bg-white border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-blue-600 font-bold">Clinical Appointments</p>
            <h2 className="mt-1 text-2xl font-extrabold text-gray-900 font-headline">Assigned Patient Queue</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200/60">
              {appointments.length} Total Patients
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500 font-medium">
            Loading assigned patient queue…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 font-medium">
            {error}
          </div>
        ) : appointments.length === 0 ? (
          <div className="rounded-2xl border border-gray-200/80 bg-gray-50/50 p-12 text-center text-gray-500 space-y-2">
            <CalendarDays className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-gray-800 font-headline">No Appointments Scheduled</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              There are currently no patient appointments booked under your clinic profile.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200/80 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-gradient-to-r from-blue-700 to-blue-600 text-white text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 border-b border-blue-800/40">Appointment ID</th>
                  <th className="px-6 py-4 border-b border-blue-800/40">Patient Name</th>
                  <th className="px-6 py-4 border-b border-blue-800/40">Hospital ID</th>
                  <th className="px-6 py-4 border-b border-blue-800/40">Date & Time</th>
                  <th className="px-6 py-4 border-b border-blue-800/40">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/70 text-sm text-gray-700">
                {appointments.map((apt, index) => (
                  <tr key={apt.id} className={`transition-colors hover:bg-blue-50/60 ${index % 2 === 0 ? "bg-white" : "bg-blue-50/20"}`}>
                    <td className="px-6 py-4 font-mono font-medium text-blue-950">{apt.appointmentId}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{apt.patient?.fullName || 'N/A'}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">{apt.patient?.hospitalId || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDateTime(apt.appointmentDate)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                        apt.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : apt.status === 'SCHEDULED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
