import React, { useEffect, useState } from 'react';
import { Pill, Calendar, FileText, Activity, AlertCircle, CheckCircle2, User, Stethoscope, Clock } from 'lucide-react';
import { fetchPatientPrescriptions } from '../services/apiService';

export default function PatientMedicalHistory({ token }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPrescriptions = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await fetchPatientPrescriptions(token);
        setPrescriptions(data.prescriptions || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch medical history.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };
    loadPrescriptions();
  }, [token]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-headline">
              My Medical Records & Prescriptions
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Review your historical doctor consultations, clinical diagnoses, and prescribed medicines.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Prescriptions List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-gray-400 italic">Loading medical records...</div>
        ) : prescriptions.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-500 font-medium border border-gray-200/80 shadow-sm space-y-2">
            <FileText className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-base font-bold text-gray-800">No prescriptions found.</p>
            <p className="text-xs text-gray-400">Prescriptions issued during consultations will appear here automatically.</p>
          </div>
        ) : (
          prescriptions.map((rx) => {
            const doc = rx.doctor || {};
            const docAdmin = doc.admin || {};
            let vitals = {};
            try {
              vitals = typeof consultation.vitals === 'string' ? JSON.parse(consultation.vitals) : (consultation.vitals || {});
            } catch (e) {
              vitals = {};
            }
            const items = rx.items || [];

            return (
              <div key={rx.id} className="bg-white rounded-3xl border border-gray-200/80 shadow-lg p-6 sm:p-8 space-y-6 overflow-hidden relative">
                
                {/* Rx Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center font-headline shadow-md">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold font-headline text-gray-900 text-lg">{docAdmin.name || `Dr. ${docAdmin.username}`}</h3>
                      <p className="text-xs text-emerald-700 font-semibold">{doc.specialization} • {doc.department}</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs text-gray-500 font-medium">
                    <p className="font-bold text-gray-900">{new Date(rx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    <p className="text-[11px]">Rx #{rx.id.substring(0, 8)}</p>
                  </div>
                </div>

                {/* Clinical Diagnosis & Vitals */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clinical Diagnosis</p>
                    <p className="font-extrabold text-gray-900 text-base font-headline">{consultation.diagnosis || 'General Health Review'}</p>
                    {consultation.symptoms && (
                      <p className="text-xs text-gray-600 mt-1">Symptoms: {consultation.symptoms}</p>
                    )}
                  </div>

                  {vitals.bp && (
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-1 text-xs font-medium">
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" /> Vitals
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-gray-800 pt-1">
                        <span>BP: <strong className="text-gray-900 font-mono">{vitals.bp}</strong></span>
                        <span>Pulse: <strong className="text-gray-900 font-mono">{vitals.pulse} bpm</strong></span>
                        <span>Temp: <strong className="text-gray-900 font-mono">{vitals.temp}°F</strong></span>
                        <span>Wt: <strong className="text-gray-900 font-mono">{vitals.weight} kg</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Prescribed Medicines Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 font-headline">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    Prescribed Medicines
                  </h4>

                  <div className="overflow-x-auto rounded-2xl border border-gray-200/80">
                    <table className="w-full text-left border-collapse min-w-[550px]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                          <th className="px-4 py-3 border-b">Medicine</th>
                          <th className="px-4 py-3 border-b">Dosage</th>
                          <th className="px-4 py-3 border-b">Frequency</th>
                          <th className="px-4 py-3 border-b">Duration</th>
                          <th className="px-4 py-3 border-b">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/70 text-xs text-gray-800 font-medium">
                        {items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-bold text-gray-900">{it.medicineName}</td>
                            <td className="px-4 py-3 text-gray-700">{it.dosage}</td>
                            <td className="px-4 py-3 font-semibold text-emerald-800">{it.frequency}</td>
                            <td className="px-4 py-3 text-gray-700">{it.duration}</td>
                            <td className="px-4 py-3 text-gray-600">{it.instructions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Advice & Follow-Up */}
                {(rx.advice || rx.followUpDate) && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-100 text-xs font-medium">
                    {rx.advice && (
                      <p className="text-gray-700"><strong className="text-gray-900">Advice:</strong> {rx.advice}</p>
                    )}
                    {rx.followUpDate && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-xl font-bold border border-blue-200/60">
                        <Calendar className="w-4 h-4" />
                        Follow-up: {new Date(rx.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
