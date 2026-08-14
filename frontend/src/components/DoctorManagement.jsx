import React, { useEffect, useState } from 'react';
import { Stethoscope, UserPlus, Search, Edit3, CheckCircle2, XCircle, AlertCircle, Building2, Award, DollarSign, Calendar, X } from 'lucide-react';
import { createDoctor, fetchDoctors, updateDoctor } from '../services/apiService';

export default function DoctorManagement({ token, onNavigateSchedule, onError }) {
  const [doctors, setDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);

  // Form states for Create
  const [newDoctor, setNewDoctor] = useState({
    username: '',
    password: '',
    name: '',
    specialization: '',
    qualification: '',
    department: '',
    roomNumber: '',
    consultationFee: '500'
  });

  // Form states for Edit
  const [editFormData, setEditFormData] = useState({
    name: '',
    specialization: '',
    qualification: '',
    department: '',
    roomNumber: '',
    consultationFee: '500',
    isActive: true,
    isAvailable: true
  });

  const loadDoctors = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchDoctors(token, includeInactive);
      setDoctors(data.doctors || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch doctor directory.';
      setError(msg);
      onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, [includeInactive, token]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createDoctor(newDoctor, token);
      setShowCreateModal(false);
      setNewDoctor({
        username: '',
        password: '',
        name: '',
        specialization: '',
        qualification: '',
        department: '',
        roomNumber: '',
        consultationFee: '500'
      });
      await loadDoctors();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create doctor account.';
      setError(msg);
    }
  };

  const handleOpenEdit = (doc) => {
    setEditingDoctor(doc);
    setEditFormData({
      name: doc.admin?.name || '',
      specialization: doc.specialization || '',
      qualification: doc.qualification || '',
      department: doc.department || '',
      roomNumber: doc.roomNumber || '',
      consultationFee: doc.consultationFee ? String(doc.consultationFee) : '500',
      isActive: doc.isActive !== false,
      isAvailable: doc.isAvailable !== false
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingDoctor) return;
    setError('');
    try {
      await updateDoctor(editingDoctor.id, editFormData, token);
      setEditingDoctor(null);
      await loadDoctors();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update doctor profile.';
      setError(msg);
    }
  };

  const filteredDoctors = doctors.filter(doc => {
    const search = searchTerm.toLowerCase();
    const docName = (doc.admin?.name || '').toLowerCase();
    const dept = (doc.department || '').toLowerCase();
    const spec = (doc.specialization || '').toLowerCase();
    return docName.includes(search) || dept.includes(search) || spec.includes(search);
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-headline">
              Doctor Staff Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Create doctor accounts, manage medical departments, consultation fees, and active clinical status.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 primary-gradient text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Create Doctor Account
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="relative w-full sm:w-80 md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search doctor name, department, specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-300/80 text-sm text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            Include Inactive Staff
          </label>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Directory Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gradient-to-r from-blue-700 to-blue-600 text-white text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4 border-b border-blue-800/40">Doctor Name</th>
                <th className="px-6 py-4 border-b border-blue-800/40">Department</th>
                <th className="px-6 py-4 border-b border-blue-800/40">Specialization</th>
                <th className="px-6 py-4 border-b border-blue-800/40">Room</th>
                <th className="px-6 py-4 border-b border-blue-800/40">Fee</th>
                <th className="px-6 py-4 border-b border-blue-800/40">Status</th>
                <th className="px-6 py-4 border-b border-blue-800/40 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/70 text-sm text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500 font-medium">Loading doctors directory…</td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500 font-medium">No doctor profiles found.</td>
                </tr>
              ) : (
                filteredDoctors.map((doc, index) => (
                  <tr key={doc.id} className={`transition-colors hover:bg-blue-50/60 ${index % 2 === 0 ? "bg-white" : "bg-blue-50/20"}`}>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      <div>{doc.admin?.name || `Dr. ${doc.admin?.username}`}</div>
                      <span className="text-[11px] text-gray-400 font-normal">@{doc.admin?.username} • {doc.qualification}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{doc.department}</td>
                    <td className="px-6 py-4 text-gray-700">{doc.specialization}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">{doc.roomNumber || 'N/A'}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">₹{doc.consultationFee}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        doc.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-red-50 text-red-700 border border-red-200/60'
                      }`}>
                        {doc.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {doc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(doc)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200/60 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigateSchedule?.(doc.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold border border-purple-200/60 transition-all"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Schedule
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Doctor Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative border border-gray-100 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h2 className="text-xl font-bold font-headline text-gray-900">Create Doctor Staff Account</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={newDoctor.username}
                    onChange={(e) => setNewDoctor(p => ({ ...p, username: e.target.value }))}
                    placeholder="e.g. dr_smith"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={newDoctor.password}
                    onChange={(e) => setNewDoctor(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-500 font-bold uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Dr. Arthur Pendelton"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={newDoctor.department}
                    onChange={(e) => setNewDoctor(p => ({ ...p, department: e.target.value }))}
                    placeholder="e.g. Cardiology"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Specialization</label>
                  <input
                    type="text"
                    required
                    value={newDoctor.specialization}
                    onChange={(e) => setNewDoctor(p => ({ ...p, specialization: e.target.value }))}
                    placeholder="e.g. Interventional Cardiology"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Qualification</label>
                  <input
                    type="text"
                    required
                    value={newDoctor.qualification}
                    onChange={(e) => setNewDoctor(p => ({ ...p, qualification: e.target.value }))}
                    placeholder="MBBS, MD"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Room No.</label>
                  <input
                    type="text"
                    value={newDoctor.roomNumber}
                    onChange={(e) => setNewDoctor(p => ({ ...p, roomNumber: e.target.value }))}
                    placeholder="OPD-204"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    required
                    value={newDoctor.consultationFee}
                    onChange={(e) => setNewDoctor(p => ({ ...p, consultationFee: e.target.value }))}
                    placeholder="500"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 primary-gradient text-white font-bold rounded-xl shadow-md hover:scale-105 active:scale-95"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Doctor Profile Modal */}
      {editingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative border border-gray-100 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h2 className="text-xl font-bold font-headline text-gray-900">Edit Doctor Profile</h2>
              <button onClick={() => setEditingDoctor(null)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-gray-500 font-bold uppercase mb-1">Display Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Department</label>
                  <input
                    type="text"
                    value={editFormData.department}
                    onChange={(e) => setEditFormData(p => ({ ...p, department: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Specialization</label>
                  <input
                    type="text"
                    value={editFormData.specialization}
                    onChange={(e) => setEditFormData(p => ({ ...p, specialization: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Qualification</label>
                  <input
                    type="text"
                    value={editFormData.qualification}
                    onChange={(e) => setEditFormData(p => ({ ...p, qualification: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Room No.</label>
                  <input
                    type="text"
                    value={editFormData.roomNumber}
                    onChange={(e) => setEditFormData(p => ({ ...p, roomNumber: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    value={editFormData.consultationFee}
                    onChange={(e) => setEditFormData(p => ({ ...p, consultationFee: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData(p => ({ ...p, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  Active Doctor Account
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={editFormData.isAvailable}
                    onChange={(e) => setEditFormData(p => ({ ...p, isAvailable: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  Currently Available
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 primary-gradient text-white font-bold rounded-xl shadow-md hover:scale-105 active:scale-95"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
