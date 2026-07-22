import { useEffect, useState } from "react";

export default function PatientHistory() {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPatients();
  }, [page]);

  const fetchPatients = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/patients?page=${page}&limit=10`
      );

      const data = await response.json();

      setPatients(data.patients);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error(error);
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

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        Patient History
      </h1>
      <div className="mb-6">
  <input
    type="text"
    placeholder="Search by Hospital ID, Name or Aadhaar..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>

      <table className="w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 border">Hospital ID</th>
            <th className="p-3 border">Full Name</th>
            <th className="p-3 border">Aadhaar</th>
            <th className="p-3 border">Gender</th>
            <th className="p-3 border">Registered On</th>
          </tr>
        </thead>

        <tbody>
          {filteredPatients.map((patient) => (
            <tr key={patient.id}>
              <td className="border p-2">{patient.hospitalId}</td>
              <td className="border p-2">{patient.fullName}</td>
              <td className="border p-2">{patient.aadhaarNumber}</td>
              <td className="border p-2">{patient.gender}</td>
              <td className="border p-2">
                {new Date(patient.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between mt-6">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
        >
          Previous
        </button>

        <p>
          Page {page} of {totalPages}
        </p>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
        >
          Next
        </button>
      </div>
    </div>
  );
}