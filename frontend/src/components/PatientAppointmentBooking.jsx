import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Stethoscope, Search, CheckCircle2, AlertCircle, User, X, Plus } from 'lucide-react';
import { fetchDoctors, fetchDoctorSlots, bookAppointment } from '../services/apiService';

function getTodayString() {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(new Date());
  } catch (e) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export default function PatientAppointmentBooking({ token, onBookingSuccess, onError }) {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Load active doctors list
  useEffect(() => {
    const loadDoctors = async () => {
      setIsLoadingDoctors(true);
      try {
        const data = await fetchDoctors(token, false);
        const activeDocs = (data.doctors || []).filter(d => d.isActive);
        setDoctors(activeDocs);
        if (activeDocs.length > 0) {
          setSelectedDoctorId(activeDocs[0].id);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch doctor directory.';
        setFeedback({ message: msg, type: 'error' });
      } finally {
        setIsLoadingDoctors(false);
      }
    };
    loadDoctors();
  }, [token]);

  // Load available slots whenever selectedDoctorId or selectedDate changes
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) return;
    const loadSlots = async () => {
      setIsLoadingSlots(true);
      setFeedback({ message: '', type: '' });
      setSelectedSlot(null);
      try {
        const data = await fetchDoctorSlots(selectedDoctorId, selectedDate, token);
        setSlots(data.slots || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load doctor slots.';
        setFeedback({ message: msg, type: 'error' });
        setSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };
    loadSlots();
  }, [selectedDoctorId, selectedDate, token]);

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedSlot) return;
    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });
    try {
      await bookAppointment({
        doctorId: selectedDoctorId,
        appointmentDate: selectedSlot.startTime,
        symptoms: symptoms || 'General Checkup'
      }, token);
      setFeedback({ message: 'Appointment booked successfully!', type: 'success' });
      setSelectedSlot(null);
      setSymptoms('');
      onBookingSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to book appointment.';
      setFeedback({ message: msg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const departments = Array.from(new Set(doctors.map(d => d.department).filter(Boolean)));

  const filteredDoctors = doctors.filter(doc => {
    const search = searchTerm.toLowerCase();
    const docName = (doc.admin?.name || '').toLowerCase();
    const dept = (doc.department || '').toLowerCase();
    const spec = (doc.specialization || '').toLowerCase();
    const matchesSearch = docName.includes(search) || dept.includes(search) || spec.includes(search);
    const matchesDept = departmentFilter === 'ALL' || doc.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-headline">
              Book Doctor Appointment
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Select attending specialist, pick appointment date, and reserve a 30-minute consultation slot.
            </p>
          </div>
        </div>
      </div>

      {feedback.message && (
        <div className={`rounded-2xl p-4 text-xs font-medium flex items-center gap-3 ${
          feedback.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Doctor Selection Directory */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 font-headline flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-600" />
            Select Specialist
          </h2>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search doctor or specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs outline-none focus:border-emerald-600"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs outline-none focus:border-emerald-600 font-medium"
            >
              <option value="ALL">All Medical Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Doctor Cards */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {isLoadingDoctors ? (
              <p className="text-xs text-gray-400 italic text-center py-6">Loading specialist directory...</p>
            ) : filteredDoctors.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-6">No matching doctors found.</p>
            ) : (
              filteredDoctors.map(doc => {
                const isSelected = doc.id === selectedDoctorId;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoctorId(doc.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                        : 'bg-gray-50/50 border-gray-200/80 hover:bg-gray-100/60'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs font-headline">{doc.admin?.name || `Dr. ${doc.admin?.username}`}</h4>
                        <p className="text-[11px] text-emerald-700 font-semibold">{doc.specialization}</p>
                        <p className="text-[10px] text-gray-500">{doc.department} • Room {doc.roomNumber || 'OPD'}</p>
                      </div>
                      <span className="text-xs font-bold text-gray-900 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-2xs">
                        ₹{doc.consultationFee}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Date & Slot Picker Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold font-headline text-gray-900">
                {selectedDoctor ? selectedDoctor.admin?.name : 'Choose Doctor & Date'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedDoctor ? `${selectedDoctor.specialization} • ₹${selectedDoctor.consultationFee} fee` : 'Select a specialist'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600 uppercase">Date:</label>
              <input
                type="date"
                min={getTodayString()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-emerald-600 shadow-2xs"
              />
            </div>
          </div>

          {/* Slot Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                Available 30-Min Consultation Slots ({selectedDate})
              </h3>
              <div className="flex items-center gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span> Booked</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span> Unavailable</span>
              </div>
            </div>

            {isLoadingSlots ? (
              <div className="py-12 text-center text-xs text-gray-400 italic">Calculating doctor working slots...</div>
            ) : slots.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 italic bg-gray-50 rounded-2xl">
                No working OPD slots available for this doctor on selected date.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {slots.map((slot, idx) => {
                  const isAvailable = slot.status === 'AVAILABLE';
                  const isSelected = selectedSlot?.startTime === slot.startTime;

                  let badgeStyle = 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200';
                  if (slot.status === 'UNAVAILABLE') {
                    badgeStyle = 'bg-red-50 text-red-400 cursor-not-allowed border-red-100';
                  } else if (isAvailable) {
                    badgeStyle = isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-md ring-2 ring-emerald-600 scale-[1.03]'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 cursor-pointer';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-2xl border text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 ${badgeStyle}`}
                    >
                      <span className="font-mono text-sm">{slot.label || slot.timeLabel || `${slot.startTime.split('T')[1].substring(0,5)}`}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider">{slot.status}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Booking Confirmation Form */}
          {selectedSlot && (
            <div className="pt-6 border-t border-gray-100 space-y-4 animate-fadeIn">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-emerald-900 text-sm">Selected Slot: {selectedSlot.label || selectedSlot.timeLabel}</p>
                <p className="text-emerald-700">Doctor: {selectedDoctor?.admin?.name} ({selectedDoctor?.specialization})</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Chief Symptoms / Reason for Visit</label>
                <textarea
                  rows="2"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. High fever, persistent cough, routine cardiology follow-up..."
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all text-xs"
              >
                {isSubmitting ? 'Reserving Slot...' : 'Confirm Appointment Reservation'}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
