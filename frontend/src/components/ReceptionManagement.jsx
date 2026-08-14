import React, { useEffect, useState } from 'react';
import { UserCheck, UserPlus, Search, AlertCircle, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { createReceptionist, fetchReceptionists } from '../services/apiService';

export default function ReceptionManagement({ token, onError }) {
  const [receptionists, setReceptionists] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReceptionist, setNewReceptionist] = useState({
    username: '',
    password: '',
    name: ''
  });

  const loadReceptionists = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchReceptionists(token);
      setReceptionists(data.receptionists || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch receptionists list.';
      setError(msg);
      onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReceptionists();
  }, [token]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createReceptionist(newReceptionist, token);
      setShowCreateModal(false);
      setNewReceptionist({ username: '', password: '', name: '' });
      await loadReceptionists();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create receptionist staff account.';
      setError(msg);
    }
  };

  const filteredReceptionists = receptionists.filter(rec => {
    const search = searchTerm.toLowerCase();
    const name = (rec.name || '').toLowerCase();
    const username = (rec.username || '').toLowerCase();
    return name.includes(search) || username.includes(search);
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-headline">
              Receptionist Staff Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Admin-only staff management: Create and maintain hospital front desk receptionist accounts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 primary-gradient text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Create Receptionist Account
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80 md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search receptionist name or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-300/80 text-sm text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
          />
        </div>
        <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200/60">
          {filteredReceptionists.length} Receptionist Accounts
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Directory Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gradient-to-r from-blue-700 to-blue-600 text-white text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4 border-b border-blue-800/40">Staff Name</th>
                <th className="px-6 py-4 border-b border-blue-800/40">Username</th>
                <th className="px-6 py-4 border-b border-blue-800/40">Assigned Role</th>
                <th className="px-6 py-4 border-b border-blue-800/40">Account Created</th>
                <th className="px-6 py-4 border-b border-blue-800/40">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/70 text-sm text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 font-medium">Loading receptionist accounts…</td>
                </tr>
              ) : filteredReceptionists.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 font-medium">No receptionist accounts found.</td>
                </tr>
              ) : (
                filteredReceptionists.map((rec, idx) => (
                  <tr key={rec.id} className={`transition-colors hover:bg-blue-50/60 ${idx % 2 === 0 ? "bg-white" : "bg-blue-50/20"}`}>
                    <td className="px-6 py-4 font-extrabold text-gray-900 font-headline">{rec.name}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">@{rec.username}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                        RECEPTIONIST
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{new Date(rec.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active Staff
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative border border-gray-100 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h2 className="text-xl font-bold font-headline text-gray-900">Create Receptionist Staff</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-gray-500 font-bold uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newReceptionist.name}
                  onChange={(e) => setNewReceptionist(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-bold uppercase mb-1">Staff Username</label>
                <input
                  type="text"
                  required
                  value={newReceptionist.username}
                  onChange={(e) => setNewReceptionist(p => ({ ...p, username: e.target.value }))}
                  placeholder="e.g. reception_desk1"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-bold uppercase mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newReceptionist.password}
                  onChange={(e) => setNewReceptionist(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-blue-600 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 primary-gradient text-white font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
