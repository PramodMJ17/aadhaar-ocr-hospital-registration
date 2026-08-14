import React, { useEffect, useState } from 'react';
import { Stethoscope, Calendar, Clock, UserCheck, Activity, Award, CheckCircle2, AlertCircle, CalendarDays, FileText, Eye, X, Pill, HeartPulse } from 'lucide-react';
import DoctorConsultationForm from './DoctorConsultationForm';
import { fetchPatientConsultations, updateAppointmentStatus } from '../services/apiService';

const BACKEND_URL = 'http://localhost:5000';

function formatDateTime(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export default function DoctorDashboard({ user, token, onError }) {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeConsultationAppointment, setActiveConsultationAppointment] = useState(null);

  // History modal state
  const [viewHistoryPatient, setViewHistoryPatient] = useState(null);
  const [patientHistoryList, setPatientHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');

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

  const handleMarkConsultationDone = async (appointmentId) => {
    try {
      await updateAppointmentStatus(appointmentId, 'COMPLETED', token);
      await fetchDoctorAppointments();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to mark consultation complete.';
      setError(msg);
      onError?.(msg);
    }
  };

  useEffect(() => {
    fetchDoctorAppointments();
  }, [token]);

  const handleOpenPatientHistory = async (patient) => {
    if (!patient || !patient.id) return;
    setViewHistoryPatient(patient);
    setIsLoadingHistory(true);
    setHistoryError('');
    try {
      const data = await fetchPatientConsultations(patient.id, token);
      setPatientHistoryList(data.consultations || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load patient history.';
      setHistoryError(msg);
    } finally {
      setIsLoadingHistory(false);
    }
  };

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
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gradient-to-r from-blue-700 to-blue-600 text-white text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 border-b border-blue-800/40">Appointment ID</th>
                  <th className="px-6 py-4 border-b border-blue-800/40">Patient Name</th>
                  <th className="px-6 py-4 border-b border-blue-800/40">Hospital ID</th>
                  <th className="px-6 py-4 border-b border-blue-800/40">Date & Time</th>
                  <th className="px-6 py-4 border-b border-blue-800/40">Status</th>
                  <th className="px-6 py-4 border-b border-blue-800/40 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/70 text-sm text-gray-700">
                {appointments.map((apt, index) => {
                  const isCompleted = apt.status === 'COMPLETED';
                  return (
                    <tr key={apt.id} className={`transition-colors hover:bg-blue-50/60 ${index % 2 === 0 ? "bg-white" : "bg-blue-50/20"}`}>
                      <td className="px-6 py-4 font-mono font-medium text-blue-950">{apt.appointmentId}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{apt.patient?.fullName || 'N/A'}</td>
                      <td className="px-6 py-4 font-mono text-gray-600">{apt.patient?.hospitalId || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-600">{formatDateTime(apt.appointmentDate)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                        }`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPatientHistory(apt.patient)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-all"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-600" />
                          Records
                        </button>

                        {!isCompleted ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setActiveConsultationAppointment(apt)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 primary-gradient text-white rounded-lg text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              Consultation
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkConsultationDone(apt.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all ml-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Mark Done
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 inline-flex items-center gap-1 ml-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Consultation Done
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Consultation Form Modal */}
      {activeConsultationAppointment && (
        <DoctorConsultationForm
          key={activeConsultationAppointment.id}
          appointment={activeConsultationAppointment}
          token={token}
          onClose={() => setActiveConsultationAppointment(null)}
          onSuccess={async () => {
            setActiveConsultationAppointment(null);
            await fetchDoctorAppointments();
          }}
        />
      )}

      {/* Assigned Patient History & Records Modal */}
      {viewHistoryPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative border border-gray-100 space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-headline text-gray-900">Assigned Patient Records</h2>
                  <p className="text-xs text-gray-500 font-medium">{viewHistoryPatient.fullName} • Hospital ID: {viewHistoryPatient.hospitalId}</p>
                </div>
              </div>
              <button onClick={() => setViewHistoryPatient(null)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="py-12 text-center text-xs text-gray-400 italic">Loading patient medical history...</div>
            ) : historyError ? (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl">{historyError}</div>
            ) : patientHistoryList.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-xs font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                No previous clinical consultations found for this assigned patient.
              </div>
            ) : (
              <div className="space-y-4">
                {patientHistoryList.map((cons) => {
                  let vitals = {};
                  try {
                    vitals = typeof cons.vitals === 'string' ? JSON.parse(cons.vitals) : (cons.vitals || {});
                  } catch (e) {
                    vitals = {};
                  }
                  const rxItems = cons.prescription?.items || [];

                  return (
                    <div key={cons.id} className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                          {cons.diagnosis || 'Clinical Consultation'}
                        </span>
                        <span className="text-xs text-gray-500">{new Date(cons.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2 bg-gray-50 rounded-xl">
                          <span className="text-gray-400 font-bold uppercase text-[10px]">BP</span>
                          <p className="font-bold text-gray-800">{vitals.bp || 'N/A'}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-xl">
                          <span className="text-gray-400 font-bold uppercase text-[10px]">Pulse</span>
                          <p className="font-bold text-gray-800">{vitals.pulse ? `${vitals.pulse} bpm` : 'N/A'}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-xl">
                          <span className="text-gray-400 font-bold uppercase text-[10px]">Temp</span>
                          <p className="font-bold text-gray-800">{vitals.temp ? `${vitals.temp} °F` : 'N/A'}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-xl">
                          <span className="text-gray-400 font-bold uppercase text-[10px]">Weight</span>
                          <p className="font-bold text-gray-800">{vitals.weight ? `${vitals.weight} kg` : 'N/A'}</p>
                        </div>
                      </div>

                      {cons.clinicalNotes && (
                        <div className="text-xs text-gray-700 bg-gray-50/70 p-3 rounded-xl">
                          <span className="font-bold text-gray-900 block mb-1">Clinical Notes:</span>
                          {cons.clinicalNotes}
                        </div>
                      )}

                      {rxItems.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                            <Pill className="w-3.5 h-3.5 text-emerald-600" /> Prescribed Medicines ({rxItems.length})
                          </span>
                          <div className="divide-y divide-gray-100 bg-emerald-50/30 rounded-xl p-3 text-xs border border-emerald-100">
                            {rxItems.map((it, i) => (
                              <div key={i} className="py-1.5 flex justify-between items-center text-gray-800 font-medium">
                                <span className="font-bold">{it.medicineName} ({it.dosage})</span>
                                <span className="text-gray-500 font-mono">{it.frequency} • {it.duration}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewHistoryPatient(null)}
                className="px-6 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl shadow-md hover:bg-gray-800"
              >
                Close Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
