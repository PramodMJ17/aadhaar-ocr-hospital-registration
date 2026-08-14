import { useEffect, useState } from "react";
import { Search, Eye, Users, ChevronLeft, ChevronRight, X, Calendar, MapPin, User, FileText, KeyRound, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { grantPatientPortalAccess, fetchPatientsList } from "../services/apiService";

const maskAadhaar = (aadhaar) => {
  if (!aadhaar) return "";
  const cleaned = aadhaar.toString().replace(/\D/g, "");
  if (cleaned.length >= 4) {
    return `XXXX XXXX ${cleaned.slice(-4)}`;
  }
  return aadhaar;
};

export default function PatientHistory() {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Grant Portal Modal state
  const [grantingPatient, setGrantingPatient] = useState(null);
  const [grantPassword, setGrantPassword] = useState("");
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);
  const [grantMessage, setGrantMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchPatients();
  }, [page]);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = await fetchPatientsList(token, page, 10);

      setPatients(data.patients || []);
      setTotalPages(data.totalPages || 1);
      setTotalPatients(data.totalPatients || (data.patients ? data.patients.length : 0));
    } catch (error) {
      console.error(error);
    }
  };

  const handleGrantSubmit = async (e) => {
    e.preventDefault();
    if (!grantingPatient || !grantPassword) return;
    setIsSubmittingGrant(true);
    setGrantMessage({ text: "", type: "" });
    try {
      const token = localStorage.getItem('token');
      await grantPatientPortalAccess(grantingPatient.hospitalId, grantPassword, token);
      setGrantMessage({ text: "Patient portal account activated successfully!", type: "success" });
      setGrantPassword("");
      await fetchPatients();
      setTimeout(() => {
        setGrantingPatient(null);
        setGrantMessage({ text: "", type: "" });
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to grant portal access.";
      setGrantMessage({ text: msg, type: "error" });
    } finally {
      setIsSubmittingGrant(false);
    }
  };

  const filteredPatients = patients.filter((patient) => {
    const search = searchTerm.toLowerCase();

    return (
      patient.hospitalId.toLowerCase().includes(search) ||
      patient.fullName.toLowerCase().includes(search) ||
      patient.aadhaarNumber.toLowerCase().includes(search)
    );
  });

  const limit = 10;
  const startCount = totalPatients === 0 || filteredPatients.length === 0 ? 0 : (page - 1) * limit + 1;
  const endCount = totalPatients === 0 || filteredPatients.length === 0 ? 0 : Math.min(page * limit, totalPatients);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-headline">
                Patient History & Access Manager
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                View registered patients and grant patient portal access.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-200/60 shadow-sm">
            Total Patients: {totalPatients}
          </span>
        </div>
      </div>

      {/* Controls Section: Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-800 font-headline">Patient Directory</h2>
          <p className="text-xs text-gray-500">Search by Hospital ID, Name, or Aadhaar number</p>
        </div>
        <div className="relative w-full sm:w-80 md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Hospital ID, Name or Aadhaar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-300/80 text-sm text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-gradient-to-r from-blue-700 to-blue-600 text-white text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4 border-b border-blue-800/40">Hospital ID</th>
                <th className="px-6 py-4 border-b border-blue-800/40">Full Name</th>
                <th className="px-6 py-4 border-b border-blue-800/40">Aadhaar</th>
                <th className="px-6 py-4 border-b border-blue-800/40">Portal Status</th>
                <th className="px-6 py-4 border-b border-blue-800/40">Registered On</th>
                <th className="px-6 py-4 border-b border-blue-800/40 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200/70 text-sm text-gray-700">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    No matching patient records found.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient, index) => {
                  const hasPortalAccess = !!patient.user;
                  return (
                    <tr
                      key={patient.id}
                      className={`transition-colors hover:bg-blue-50/60 ${index % 2 === 0 ? "bg-white" : "bg-blue-50/20"}`}
                    >
                      <td className="px-6 py-4 font-mono font-medium text-blue-950">
                        {patient.hospitalId}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {patient.fullName}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-600">
                        {maskAadhaar(patient.aadhaarNumber)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          hasPortalAccess
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {hasPortalAccess ? 'Portal Active' : 'Not Setup'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(patient.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center space-x-2">
                        <button
                          onClick={() => setSelectedPatient(patient)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow active:scale-95 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>

                        {!hasPortalAccess && (
                          <button
                            onClick={() => setGrantingPatient(patient)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow active:scale-95 transition-all"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Grant Portal
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 bg-gray-50/70 border-t border-gray-200/80">
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            Showing <span className="font-semibold text-gray-900">{startCount}</span>–<span className="font-semibold text-gray-900">{endCount}</span> of <span className="font-semibold text-gray-900">{totalPatients}</span> patients
          </p>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl text-xs sm:text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <span className="text-xs sm:text-sm text-gray-600 font-medium px-2">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl text-xs sm:text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grant Portal Access Modal */}
      {grantingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative border border-gray-100 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-emerald-700 font-bold font-headline">
                <KeyRound className="w-5 h-5" />
                <h2>Grant Patient Portal Access</h2>
              </div>
              <button onClick={() => setGrantingPatient(null)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 text-xs space-y-1">
              <p className="text-gray-600 font-bold uppercase tracking-wider text-[10px]">Patient Profile</p>
              <p className="font-extrabold text-gray-900 text-sm font-headline">{grantingPatient.fullName}</p>
              <p className="font-mono text-emerald-800 font-semibold">Hospital ID: {grantingPatient.hospitalId}</p>
            </div>

            {grantMessage.text && (
              <div className={`p-3 rounded-xl text-xs font-medium ${
                grantMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {grantMessage.text}
              </div>
            )}

            <form onSubmit={handleGrantSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-gray-500 font-bold uppercase mb-1">Set Portal Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={grantPassword}
                    onChange={(e) => setGrantPassword(e.target.value)}
                    placeholder="Enter initial password for patient"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-emerald-600 text-sm"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  The patient will use their <strong>Hospital ID ({grantingPatient.hospitalId})</strong> and this password to sign in to the Patient Portal.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setGrantingPatient(null)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGrant}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  {isSubmittingGrant ? 'Activating...' : 'Activate Portal Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 transition-all animate-fadeIn"
          onClick={() => setSelectedPatient(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative overflow-hidden border border-gray-100 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Patient Profile</h2>
                  <span className="inline-block mt-0.5 text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/50">
                    ID: #{selectedPatient.hospitalId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Hospital ID
                </span>
                <span className="col-span-2 font-mono font-bold text-gray-900">{selectedPatient.hospitalId || "N/A"}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Full Name
                </span>
                <span className="col-span-2 font-semibold text-gray-900">{selectedPatient.fullName || "N/A"}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Aadhaar
                </span>
                <span className="col-span-2 font-mono font-bold text-gray-900">{maskAadhaar(selectedPatient.aadhaarNumber)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  Portal Access
                </span>
                <span className="col-span-2 font-bold">
                  {selectedPatient.user ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Active Account</span>
                  ) : (
                    <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">Not Granted</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  DOB
                </span>
                <span className="col-span-2 font-medium text-gray-900">{selectedPatient.dob || "N/A"}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Address
                </span>
                <span className="col-span-2 leading-relaxed font-medium text-gray-800">{selectedPatient.address || "N/A"}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-between items-center">
              {!selectedPatient.user && (
                <button
                  onClick={() => {
                    const p = selectedPatient;
                    setSelectedPatient(null);
                    setGrantingPatient(p);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Grant Portal Access
                </button>
              )}
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl text-xs transition-all shadow-md ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}