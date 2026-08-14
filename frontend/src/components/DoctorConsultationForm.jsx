import React, { useState } from 'react';
import { Stethoscope, Pill, Plus, Trash2, CheckCircle2, AlertCircle, User, FileText, Activity, X } from 'lucide-react';
import { createConsultation, createPrescription } from '../services/apiService';

export default function DoctorConsultationForm({ appointment, token, onClose, onSuccess }) {
  const patient = appointment?.patient || {};

  // Vitals
  const [bp, setBp] = useState('120/80');
  const [pulse, setPulse] = useState('72');
  const [temp, setTemp] = useState('98.6');
  const [weight, setWeight] = useState('68');

  // Consultation Details
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState(appointment?.symptoms || '');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Prescription Items
  const [items, setItems] = useState([
    { medicineName: '', dosage: '1 Tablet', frequency: '1-0-1', duration: '5 Days', instructions: 'After meals' }
  ]);
  const [advice, setAdvice] = useState('Drink plenty of water and rest.');
  const [followUpDate, setFollowUpDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAddMedicineRow = () => {
    setItems(prev => [
      ...prev,
      { medicineName: '', dosage: '1 Tablet', frequency: '1-0-1', duration: '5 Days', instructions: 'After meals' }
    ]);
  };

  const handleRemoveMedicineRow = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) return { ...item, [field]: value };
      return item;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appointment?.id || !diagnosis.trim()) {
      setError('Primary diagnosis is required.');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      const vitalsString = JSON.stringify({ bp, pulse, temp, weight });
      
      // 1. Create Consultation
      const consultationRes = await createConsultation({
        appointmentId: appointment.id,
        diagnosis,
        symptoms,
        vitals: vitalsString,
        clinicalNotes
      }, token);

      const consultationId = consultationRes.consultation?.id;

      // 2. Create Prescription if medicine items are filled
      const validItems = items.filter(it => it.medicineName.trim() !== '');
      if (validItems.length > 0 && consultationId) {
        await createPrescription({
          consultationId,
          advice,
          followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
          items: validItems
        }, token);
      }

      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to record consultation.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative border border-gray-100 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-headline text-gray-900">Clinical Consultation & Rx Generator</h2>
              <p className="text-xs text-gray-500 mt-0.5">Record patient diagnosis, vital signs, and issue digital prescription.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Info Banner */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center font-headline">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm font-headline">{patient.fullName || 'Patient'}</h3>
              <p className="font-mono text-blue-800 font-semibold">Hospital ID: {patient.hospitalId || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-gray-600 font-medium">
            <span>Gender: <strong className="text-gray-900 capitalize">{patient.gender || 'N/A'}</strong></span>
            <span>DOB: <strong className="text-gray-900">{patient.dob || 'N/A'}</strong></span>
            <span>Symptoms: <strong className="text-gray-900">{appointment.symptoms || 'General Checkup'}</strong></span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-medium flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs font-medium">
          
          {/* Section 1: Patient Vitals */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3">
            <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600" />
              Patient Clinical Vitals
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-gray-500 mb-1">Blood Pressure (mmHg)</label>
                <input
                  type="text"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                  placeholder="120/80"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Pulse Rate (bpm)</label>
                <input
                  type="text"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  placeholder="72"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Temperature (°F)</label>
                <input
                  type="text"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  placeholder="98.6"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Weight (kg)</label>
                <input
                  type="text"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="68"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Diagnosis & Notes */}
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-bold uppercase mb-1">Primary Clinical Diagnosis *</label>
              <input
                type="text"
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Acute Pharyngitis, Type 2 Diabetes, Essential Hypertension"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-bold uppercase mb-1">Observed Symptoms</label>
                <textarea
                  rows="3"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Summarize symptoms..."
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold uppercase mb-1">Doctor Clinical Notes</label>
                <textarea
                  rows="3"
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Add confidential clinical observations..."
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Multi-Row Prescription Builder */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800 uppercase tracking-wider text-xs flex items-center gap-1.5 font-headline">
                <Pill className="w-4 h-4 text-emerald-600" />
                Prescribed Medicines Table
              </h4>
              <button
                type="button"
                onClick={handleAddMedicineRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Medicine Row
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="p-3 bg-gray-50/70 border border-gray-200/80 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Medicine Name (e.g. Paracetamol 650mg)"
                      value={it.medicineName}
                      onChange={(e) => handleMedicineChange(idx, 'medicineName', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 1 Tab)"
                      value={it.dosage}
                      onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Frequency (e.g. 1-0-1)"
                      value={it.frequency}
                      onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Duration (e.g. 5 Days)"
                      value={it.duration}
                      onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Instructions"
                      value={it.instructions}
                      onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-emerald-600"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicineRow(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: General Advice & Follow-Up Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
            <div className="sm:col-span-2">
              <label className="block text-gray-700 font-bold uppercase mb-1">General Medical Advice</label>
              <input
                type="text"
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="e.g. Rest, light diet, avoid cold drinks"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold uppercase mb-1">Follow-Up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600 font-medium"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 primary-gradient text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              {isSubmitting ? 'Finalizing Consultation...' : 'Complete Consultation & Issue Rx'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
