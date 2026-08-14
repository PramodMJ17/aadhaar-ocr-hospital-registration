import React, { useEffect, useState } from 'react';
import { User, Calendar, Pill, Clock, FileText, CheckCircle2, Hospital, ShieldCheck, ArrowRight, HeartPulse, Plus } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

function formatDateTime(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export default function PatientDashboard({ user, token, onNavigateBook, onNavigateRecords, onError }) {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPatientData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [aptRes, rxRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/appointments`, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
          }),
          fetch(`${BACKEND_URL}/api/prescriptions/patient/my-prescriptions`, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
          })
        ]);

        const aptData = await aptRes.json();
        const rxData = await rxRes.json();

        if (!aptRes.ok) throw new Error(aptData.error || 'Failed to load appointments.');
        if (!rxRes.ok) throw new Error(rxData.error || 'Failed to load prescriptions.');

        setAppointments(aptData.appointments || []);
        setPrescriptions(rxData.prescriptions || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch patient portal data.';
        setError(message);
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientData();
  }, [token, onError]);

  const upcomingCount = appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Patient Profile Card */}
      <section className="rounded-3xl bg-white border border-gray-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center font-bold text-2xl font-headline border border-secondary/20 shadow-inner">
              <User className="w-8 h-8 text-secondary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-secondary font-bold">Patient Portal</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Verified Record</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-headline mt-1">
                {user?.fullName || user?.name || 'Patient'}
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1">
                Welcome to your personal hospital health dashboard at Ramaiah Memorial Hospital.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={onNavigateBook}
              className="inline-flex items-center justify-center gap-2 primary-gradient text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Book New Appointment
            </button>

            <div className="bg-surface-container-low px-5 py-3 rounded-2xl border border-outline-variant/10 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Hospital ID</p>
              <p className="text-sm font-mono font-bold text-primary">{user?.hospitalId || 'RMH Patient'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Metrics Cards */}
      <section className="grid gap-5 grid-cols-1 sm:grid-cols-3">
        <div
          onClick={onNavigateBook}
          className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-md hover:shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Upcoming Appointments</span>
            <div className="rounded-xl p-2.5 bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 tracking-tight font-headline">{upcomingCount}</p>
          <p className="mt-2 text-xs text-blue-600 font-bold flex items-center gap-1">
            Book new visit <ArrowRight className="w-3.5 h-3.5" />
          </p>
        </div>

        <div
          onClick={onNavigateRecords}
          className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-md hover:shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Active Prescriptions</span>
            <div className="rounded-xl p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform">
              <Pill className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-900 tracking-tight font-headline">{prescriptions.length}</p>
          <p className="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1">
            View full Rx records <ArrowRight className="w-3.5 h-3.5" />
          </p>
        </div>

        <div
          onClick={onNavigateRecords}
          className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-md hover:shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Total Consultations</span>
            <div className="rounded-xl p-2.5 bg-purple-50 text-purple-600 border border-purple-100 group-hover:scale-110 transition-transform">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-900 tracking-tight font-headline">{appointments.filter(a => a.status === 'COMPLETED').length}</p>
          <p className="mt-2 text-xs text-purple-600 font-bold flex items-center gap-1">
            View clinical history <ArrowRight className="w-3.5 h-3.5" />
          </p>
        </div>
      </section>

      {/* Appointments & Prescriptions Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Appointments Card */}
        <section className="rounded-3xl bg-white border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-headline text-gray-900">My Appointments</h2>
            <button
              onClick={onNavigateBook}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Book Appointment
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500 text-sm font-medium">Loading appointments…</div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-xs space-y-2">
              <p>No appointments booked yet.</p>
              <button onClick={onNavigateBook} className="px-4 py-2 primary-gradient text-white rounded-xl font-bold text-xs">
                Reserve your first slot
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map(apt => (
                <div key={apt.id} className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono font-bold text-primary">{apt.appointmentId}</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{apt.doctor?.admin?.name || 'Assigned Doctor'}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDateTime(apt.appointmentDate)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    apt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Prescriptions Card */}
        <section className="rounded-3xl bg-white border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-headline text-gray-900">My Prescriptions</h2>
            <button
              onClick={onNavigateRecords}
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              View All Rx
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500 text-sm font-medium">Loading prescriptions…</div>
          ) : prescriptions.length === 0 ? (
            <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-xs">
              No active prescriptions on record.
            </div>
          ) : (
            <div className="space-y-4">
              {prescriptions.slice(0, 3).map(rx => (
                <div key={rx.id} className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono font-bold text-emerald-800">{rx.prescriptionId}</p>
                    <span className="text-xs text-gray-500">{new Date(rx.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">Dr. {rx.doctor?.admin?.name || 'Consulting Physician'}</p>
                  {rx.advice && <p className="text-xs text-gray-600 italic">Advice: "{rx.advice}"</p>}
                  {rx.items && rx.items.length > 0 && (
                    <div className="pt-2 border-t border-emerald-100 space-y-1">
                      {rx.items.map((item, idx) => (
                        <div key={idx} className="text-xs text-gray-700 font-medium flex justify-between">
                          <span>💊 {item.medicineName} ({item.dosage})</span>
                          <span className="text-gray-500">{item.duration}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
