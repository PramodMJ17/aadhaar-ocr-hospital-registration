import React, { useEffect, useState } from 'react';
import { Pill, Calendar, FileText, Activity, AlertCircle, Stethoscope } from 'lucide-react';
import { fetchPatientPrescriptions, fetchPatientConsultations } from '../services/apiService';

export default function PatientMedicalHistory({ token, user }) {
  const [consultations, setConsultations] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMedicalHistory = async () => {
      setIsLoading(true);
      setError('');
      try {
        const patientId = user?.patientId || user?.id;
        const [rxData, consData] = await Promise.all([
          fetchPatientPrescriptions(token).catch(() => ({ prescriptions: [] })),
          patientId ? fetchPatientConsultations(patientId, token).catch(() => ({ consultations: [] })) : Promise.resolve({ consultations: [] })
        ]);

        setPrescriptions(rxData.prescriptions || []);
        setConsultations(consData.consultations || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch medical history.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };
    loadMedicalHistory();
  }, [token, user]);

  const displayItems = consultations.length > 0 ? consultations : prescriptions;

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

      {/* History List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-gray-400 italic">Loading medical records...</div>
        ) : displayItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-500 font-medium border border-gray-200/80 shadow-sm space-y-2">
            <FileText className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-base font-bold text-gray-800">No medical records or prescriptions found.</p>
            <p className="text-xs text-gray-400">Consultations and prescriptions issued by your doctor will appear here automatically.</p>
          </div>
        ) : (
          displayItems.map((item) => {
            const isConsultationObj = Boolean(item.diagnosis || item.appointment);
            const cons = isConsultationObj ? item : (item.consultation || {});
            const rx = isConsultationObj ? item.prescription : item;
            const doc = item.doctor || rx?.doctor || {};
            const docAdmin = doc.admin || {};
            const apt = item.appointment || {};

            let vitals = {};
            try {
              vitals = typeof cons.vitals === 'string' ? JSON.parse(cons.vitals) : (cons.vitals || {});
            } catch (e) {
              vitals = {};
            }
            const items = rx?.items || [];
            const hasVitals = vitals && (vitals.bp || vitals.pulse || vitals.temp || vitals.weight);

            return (
              <div key={item.id} className="bg-white rounded-3xl border border-gray-200/80 shadow-lg p-6 sm:p-8 space-y-6 overflow-hidden relative">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center font-headline shadow-md">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold font-headline text-gray-900 text-lg">{docAdmin.name || `Dr. ${docAdmin.username || 'Attending Doctor'}`}</h3>
                      <p className="text-xs text-emerald-700 font-semibold">{doc.specialization || 'General Medicine'} • {doc.department || 'OPD'}</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs text-gray-500 font-medium">
                    <p className="font-bold text-gray-900">
                      {new Date(item.createdAt || cons.createdAt || Date.now()).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-[11px] font-mono text-primary font-bold">
                      Appt ID: {apt.appointmentId || "Not recorded"}
                    </p>
                  </div>
                </div>

                {/* Clinical Diagnosis & Vitals */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clinical Diagnosis</p>
                      <p className="font-extrabold text-gray-900 text-base font-headline">{cons.diagnosis || 'Not recorded'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Symptoms</p>
                      <p className="text-xs text-gray-700 font-medium">{cons.symptoms || item.symptoms || 'Not recorded'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clinical Notes</p>
                      <p className="text-xs text-gray-600 italic">{cons.clinicalNotes || 'Not recorded'}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-1 text-xs font-medium">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5" /> Vitals
                    </p>
                    {hasVitals ? (
                      <div className="grid grid-cols-2 gap-2 text-gray-800 pt-1">
                        <span>BP: <strong className="text-gray-900 font-mono">{vitals.bp || 'Not recorded'}</strong></span>
                        <span>Pulse: <strong className="text-gray-900 font-mono">{vitals.pulse ? `${vitals.pulse} bpm` : 'Not recorded'}</strong></span>
                        <span>Temp: <strong className="text-gray-900 font-mono">{vitals.temp ? `${vitals.temp}°F` : 'Not recorded'}</strong></span>
                        <span>Wt: <strong className="text-gray-900 font-mono">{vitals.weight ? `${vitals.weight} kg` : 'Not recorded'}</strong></span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 pt-2 italic">Not recorded</p>
                    )}
                  </div>
                </div>

                {/* Prescribed Medicines or No Medicines Badge */}
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 font-headline">
                      <Pill className="w-4 h-4 text-emerald-600" /> Prescribed Medications ({items.length})
                    </h4>
                    <span className="text-xs text-emerald-700 font-medium italic">
                      Advice: {rx?.advice ? `"${rx.advice}"` : 'Not recorded'}
                    </span>
                  </div>

                  {items.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {items.map((med, idx) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100/80 flex flex-col justify-between text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900">{med.medicineName}</span>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">{med.dosage}</span>
                          </div>
                          <div className="flex items-center justify-between text-gray-500 text-[11px]">
                            <span>Frequency: <strong>{med.frequency}</strong></span>
                            <span>Duration: <strong>{med.duration}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-gray-500 text-xs font-medium text-center">
                      No medications prescribed for this consultation.
                    </div>
                  )}
                </div>

                {/* Advice & Follow-Up */}
                {rx?.followUpDate && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 pt-3 border-t border-gray-100 text-xs font-medium">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-xl font-bold border border-blue-200/60">
                      <Calendar className="w-4 h-4" />
                      Follow-up: {new Date(rx.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
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
