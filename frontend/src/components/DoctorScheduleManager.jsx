import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Plus, Trash2, CheckCircle2, AlertCircle, User, CalendarOff, Save, Check } from 'lucide-react';
import { fetchDoctors, fetchDoctorSchedule, updateDoctorSchedule, fetchDoctorUnavailability, addDoctorUnavailability, deleteDoctorUnavailability } from '../services/apiService';

const DAYS_OF_WEEK = [
  { key: 'MONDAY', label: 'Monday' },
  { key: 'TUESDAY', label: 'Tuesday' },
  { key: 'WEDNESDAY', label: 'Wednesday' },
  { key: 'THURSDAY', label: 'Thursday' },
  { key: 'FRIDAY', label: 'Friday' },
  { key: 'SATURDAY', label: 'Saturday' },
  { key: 'SUNDAY', label: 'Sunday' },
];

function formatDateTime(isoString) {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function DoctorScheduleManager({ token, initialDoctorId, onError }) {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Schedule state
  const [schedules, setSchedules] = useState(() => {
    return DAYS_OF_WEEK.map(d => ({
      dayOfWeek: d.key,
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 30,
      isActive: d.key !== 'SUNDAY'
    }));
  });

  // Unavailability / Leave state
  const [unavailabilities, setUnavailabilities] = useState([]);
  const [newLeave, setNewLeave] = useState({
    startTime: '',
    endTime: '',
    reason: 'On Leave'
  });

  // Load list of doctors
  useEffect(() => {
    const loadDoctorsList = async () => {
      try {
        const data = await fetchDoctors(token, true);
        const docs = data.doctors || [];
        setDoctors(docs);
        if (!selectedDoctorId && docs.length > 0) {
          setSelectedDoctorId(docs[0].id);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch doctors list.';
        setFeedback({ message: msg, type: 'error' });
      }
    };
    loadDoctorsList();
  }, [token]);

  // Load schedule & leave records when selectedDoctorId changes
  const loadDoctorData = async () => {
    if (!selectedDoctorId) return;
    setIsLoading(true);
    setFeedback({ message: '', type: '' });
    try {
      const [schedData, unavailData] = await Promise.all([
        fetchDoctorSchedule(selectedDoctorId, token),
        fetchDoctorUnavailability(selectedDoctorId, token)
      ]);

      const fetchedSchedules = schedData.schedules || [];
      const updatedSchedules = DAYS_OF_WEEK.map(d => {
        const match = fetchedSchedules.find(s => s.dayOfWeek === d.key);
        if (match) {
          return {
            dayOfWeek: d.key,
            startTime: match.startTime || '09:00',
            endTime: match.endTime || '17:00',
            slotDuration: match.slotDuration || 30,
            isActive: match.isActive !== false
          };
        }
        return {
          dayOfWeek: d.key,
          startTime: '09:00',
          endTime: '17:00',
          slotDuration: 30,
          isActive: false
        };
      });

      setSchedules(updatedSchedules);
      setUnavailabilities(unavailData.unavailabilities || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load doctor schedule data.';
      setFeedback({ message: msg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, [selectedDoctorId, token]);

  const handleScheduleChange = (dayKey, field, value) => {
    setSchedules(prev => prev.map(s => {
      if (s.dayOfWeek === dayKey) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleSaveSchedule = async () => {
    if (!selectedDoctorId) return;
    setIsSaving(true);
    setFeedback({ message: '', type: '' });
    try {
      await updateDoctorSchedule(selectedDoctorId, schedules, token);
      setFeedback({ message: 'Doctor working schedule saved successfully!', type: 'success' });
      await loadDoctorData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save schedule.';
      setFeedback({ message: msg, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLeave = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !newLeave.startTime || !newLeave.endTime) return;
    setFeedback({ message: '', type: '' });
    try {
      const startISO = new Date(newLeave.startTime).toISOString();
      const endISO = new Date(newLeave.endTime).toISOString();
      await addDoctorUnavailability(selectedDoctorId, {
        startTime: startISO,
        endTime: endISO,
        reason: newLeave.reason || 'On Leave'
      }, token);
      setFeedback({ message: 'Doctor leave period added successfully.', type: 'success' });
      setNewLeave({ startTime: '', endTime: '', reason: 'On Leave' });
      await loadDoctorData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add leave.';
      setFeedback({ message: msg, type: 'error' });
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!selectedDoctorId) return;
    setFeedback({ message: '', type: '' });
    try {
      await deleteDoctorUnavailability(selectedDoctorId, leaveId, token);
      setFeedback({ message: 'Leave period removed.', type: 'success' });
      await loadDoctorData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete leave entry.';
      setFeedback({ message: msg, type: 'error' });
    }
  };

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Doctor Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-headline">
              Doctor Schedule & Leave Configurator
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Set weekly OPD working hours, slot durations, and manage leave/unavailability blocks.
            </p>
          </div>
        </div>

        {/* Doctor Dropdown Selector */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Doctor:</label>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 shadow-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
          >
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                {d.admin?.name || `Dr. ${d.admin?.username}`} ({d.department})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Doctor Summary Card */}
      {selectedDoctor && (
        <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center font-headline shadow-md">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold font-headline text-gray-900 text-base">{selectedDoctor.admin?.name}</h3>
              <p className="text-xs text-purple-700 font-semibold">{selectedDoctor.specialization} • {selectedDoctor.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-600 font-medium">
            <span>Room: <strong className="text-gray-900 font-mono">{selectedDoctor.roomNumber || 'OPD'}</strong></span>
            <span>Fee: <strong className="text-gray-900">₹{selectedDoctor.consultationFee}</strong></span>
          </div>
        </div>
      )}

      {/* Feedback banner */}
      {feedback.message && (
        <div className={`rounded-2xl p-4 text-xs font-medium flex items-center gap-3 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid: 1. Weekly Schedule Table, 2. Leave Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Weekly Schedule Configurator Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-extrabold font-headline text-gray-900">Weekly Working Hours</h2>
            </div>
            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={isSaving || isLoading}
              className="inline-flex items-center gap-2 primary-gradient text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving…' : 'Save Working Hours'}
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200/80">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-4 py-3 border-b">Day</th>
                  <th className="px-4 py-3 border-b">Active</th>
                  <th className="px-4 py-3 border-b">Start Time</th>
                  <th className="px-4 py-3 border-b">End Time</th>
                  <th className="px-4 py-3 border-b">Slot Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/70 text-xs text-gray-700">
                {schedules.map((s, index) => {
                  const dayObj = DAYS_OF_WEEK.find(d => d.key === s.dayOfWeek);
                  return (
                    <tr key={s.dayOfWeek} className={s.isActive ? 'bg-white' : 'bg-gray-50/50 opacity-60'}>
                      <td className="px-4 py-3.5 font-bold text-gray-900">{dayObj?.label || s.dayOfWeek}</td>
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={s.isActive}
                          onChange={(e) => handleScheduleChange(s.dayOfWeek, 'isActive', e.target.checked)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <input
                          type="time"
                          disabled={!s.isActive}
                          value={s.startTime}
                          onChange={(e) => handleScheduleChange(s.dayOfWeek, 'startTime', e.target.value)}
                          className="px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono font-medium outline-none focus:border-purple-600 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <input
                          type="time"
                          disabled={!s.isActive}
                          value={s.endTime}
                          onChange={(e) => handleScheduleChange(s.dayOfWeek, 'endTime', e.target.value)}
                          className="px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono font-medium outline-none focus:border-purple-600 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          disabled={!s.isActive}
                          value={s.slotDuration}
                          onChange={(e) => handleScheduleChange(s.dayOfWeek, 'slotDuration', parseInt(e.target.value, 10))}
                          className="px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium outline-none focus:border-purple-600 disabled:opacity-50"
                        >
                          <option value={15}>15 mins</option>
                          <option value={30}>30 mins</option>
                          <option value={45}>45 mins</option>
                          <option value={60}>60 mins</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leave & Unavailability Manager Card */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-extrabold font-headline text-gray-900">Leave & Unavailability</h2>
          </div>

          {/* Add Leave Form */}
          <form onSubmit={handleAddLeave} className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3 text-xs font-medium">
            <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">Add Block Out Period</p>
            
            <div>
              <label className="block text-gray-500 mb-1">Start Time (Date & Time)</label>
              <input
                type="datetime-local"
                required
                value={newLeave.startTime}
                onChange={(e) => setNewLeave(p => ({ ...p, startTime: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1">End Time (Date & Time)</label>
              <input
                type="datetime-local"
                required
                value={newLeave.endTime}
                onChange={(e) => setNewLeave(p => ({ ...p, endTime: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1">Reason</label>
              <input
                type="text"
                value={newLeave.reason}
                onChange={(e) => setNewLeave(p => ({ ...p, reason: e.target.value }))}
                placeholder="e.g. On Leave, Medical Conference"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-purple-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow transition-all flex items-center justify-center gap-1.5 text-xs"
            >
              <Plus className="w-4 h-4" />
              Add Leave Period
            </button>
          </form>

          {/* Active Leave Records List */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scheduled Leave Records</p>
            {unavailabilities.length === 0 ? (
              <p className="text-xs text-gray-400 italic bg-gray-50 p-4 rounded-xl text-center">No leave periods configured for this doctor.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {unavailabilities.map(u => (
                  <div key={u.id} className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-red-900">{u.reason || 'On Leave'}</p>
                      <p className="text-[11px] text-red-700 mt-0.5">{formatDateTime(u.startTime)} – {formatDateTime(u.endTime)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteLeave(u.id)}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Remove leave"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
