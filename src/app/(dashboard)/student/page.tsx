"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

interface AttendanceLog {
  id: string;
  tapTime: string;
  status: "present" | "late" | "absent";
  notes: string | null;
  date: string;
}

interface Stats {
  total: number;
  present: number;
  late: number;
  absent: number;
  percentage: number;
}

export default function StudentDashboard() {
  const { user, isLoaded } = useUser();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, present: 0, late: 0, absent: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchAttendance = async () => {
      try {
        const res = await fetch("/api/attendance");
        if (res.ok) {
          const data = await res.json();
          setLogs(data.data.slice(0, 10)); // hanya 10 terakhir
          setStats({
            total: data.summary.total,
            present: data.summary.present,
            late: data.summary.late,
            absent: data.summary.absent,
            percentage: data.summary.total > 0
              ? Math.round((data.summary.present / data.summary.total) * 100)
              : 0,
          });
        }
      } catch (error) {
        console.error("Failed to fetch attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [isLoaded, user]);

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Dashboard Siswa</h1>
        <p className="text-gray-500 mb-6">Selamat datang, {user?.firstName ?? user?.emailAddresses[0]?.emailAddress}</p>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-500">Total Kehadiran</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200 text-center">
            <p className="text-sm text-green-600">Hadir</p>
            <p className="text-3xl font-bold text-green-700">{stats.present}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200 text-center">
            <p className="text-sm text-yellow-600">Terlambat</p>
            <p className="text-3xl font-bold text-yellow-700">{stats.late}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200 text-center">
            <p className="text-sm text-blue-600">Persentase</p>
            <p className="text-3xl font-bold text-blue-700">{stats.percentage}%</p>
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Riwayat Kehadiran</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tanggal</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    Belum ada data presensi
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{formatDate(log.date)}</td>
                    <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{log.notes ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}