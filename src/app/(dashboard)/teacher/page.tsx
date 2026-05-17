"use client";

import { useEffect, useState } from "react";

interface AttendanceLog {
  id: string;
  tapTime: string;
  status: "present" | "late" | "absent";
  notes: string | null;
  studentName: string;
  nis: string;
  className: string | null;
}

interface Summary {
  present: number;
  late: number;
  absent: number;
  total: number;
}

export default function TeacherDashboard() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [summary, setSummary] = useState<Summary>({ present: 0, late: 0, absent: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>("");

  const fetchAttendance = async () => {
    try {
      const params = new URLSearchParams({ date: new Date().toISOString().split("T")[0] });
      if (selectedClass) params.set("class_id", selectedClass);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 10000);
    return () => clearInterval(interval);
  }, [selectedClass]);

  const handleOverride = async (id: string, status: "present" | "absent") => {
    const notes = prompt("Keterangan (opsional):");
    try {
      const res = await fetch(`/api/attendance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (res.ok) {
        fetchAttendance(); // refresh
      }
    } catch (error) {
      console.error("Override failed:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <span className="px-2 py-1 rounded-full text-sm bg-green-100 text-green-800">Hadir</span>;
      case "late":
        return <span className="px-2 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">Terlambat</span>;
      case "absent":
        return <span className="px-2 py-1 rounded-full text-sm bg-red-100 text-red-800">Alpa</span>;
      default:
        return null;
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Dashboard Guru</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
            <p className="text-sm text-green-600">Hadir</p>
            <p className="text-2xl font-bold text-green-700">{summary.present}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
            <p className="text-sm text-yellow-600">Terlambat</p>
            <p className="text-2xl font-bold text-yellow-700">{summary.late}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
            <p className="text-sm text-red-600">Tidak Hadir</p>
            <p className="text-2xl font-bold text-red-700">{summary.absent}</p>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Presensi Siswa</h2>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Semua Kelas</option>
              <option value="class-uuid-1">X MIPA 1</option>
              <option value="class-uuid-2">XI MIPA 1</option>
              <option value="class-uuid-3">XII MIPA 1</option>
            </select>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Memuat...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">No</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Waktu</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nama</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">NIS</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Belum ada data presensi
                    </td>
                  </tr>
                ) : (
                  logs.map((log, index) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{index + 1}</td>
                      <td className="px-4 py-3 text-sm">{formatTime(log.tapTime)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{log.studentName}</td>
                      <td className="px-4 py-3 text-sm">{log.nis}</td>
                      <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                      <td className="px-4 py-3">
                        {log.status === "absent" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOverride(log.id, "present")}
                              className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Izin
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}