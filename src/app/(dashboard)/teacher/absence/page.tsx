"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

interface Student {
  id: string;
  nis: string;
  user: { name: string } | null;
  class: { name: string } | null;
}

interface Absence {
  id: string;
  date: string;
  type: "izin" | "sakit";
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  student: { id: string; nis: string; name: string };
  requestedBy: { id: string; name: string };
}

function StatusBadge({ status }: { status: string }) {
  const { loading } = useAuth();
  switch (status) {
    case "approved":
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase rounded-full border border-emerald-100">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Disetujui
      </span>;
    case "pending":
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold uppercase rounded-full border border-amber-100">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Menunggu
      </span>;
    case "rejected":
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-bold uppercase rounded-full border border-rose-100">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Ditolak
      </span>;
    default:
      return null;
  }
}

export default function TeacherAbsencePage() {
  const { loading } = useAuth();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formType, setFormType] = useState<"izin" | "sakit">("izin");
  const [formReason, setFormReason] = useState("");
  const [searchStudent, setSearchStudent] = useState("");

  useEffect(() => {
    fetchAll();
  });

  const fetchAll = async () => {
    setDataLoading(true);
    try {
      const [studRes, absRes] = await Promise.all([
        fetch("/api/students?limit=100"),
        fetch("/api/absences"),
      ]);
      if (studRes.ok) {
        const data = await studRes.json();
        setStudents(data.data ?? []);
      }
      if (absRes.ok) {
        const data = await absRes.json();
        setAbsences(data.data ?? []);
      }
    } finally {
      setDataLoading(false);
    }
  };

  const submitAbsence = async () => {
    if (!selectedStudentId || !formDate) {
      alert("Mohon pilih siswa dan tanggal");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          date: formDate,
          type: formType,
          reason: formReason,
        }),
      });
      if (res.ok) {
        alert("Izin/sakit berhasil dicatat");
        setShowForm(false);
        setSelectedStudentId("");
        setFormReason("");
        setFormDate(new Date().toISOString().split("T")[0]);
        fetchAll();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteAbsence = async (id: string) => {
    if (!confirm("Batalkan izin/sakit ini?")) return;
    try {
      const res = await fetch(`/api/absences/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Dibatalkan");
        fetchAll();
      } else {
        alert("Gagal");
      }
    } catch (e) {
      alert("Error: " + e);
    }
  };

  const filteredStudents = students.filter((s) =>
    !searchStudent ||
    s.nis.toLowerCase().includes(searchStudent.toLowerCase()) ||
    (s.user?.name ?? "").toLowerCase().includes(searchStudent.toLowerCase())
  );

  const todayAbsences = absences.filter((a) => a.date === new Date().toISOString().split("T")[0]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Izin & Sakit</h2>
          <p className="text-sm text-slate-500 mt-1">Catat izin atau sakit siswa sebelum mereka tap RFID</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-base">{showForm ? "close" : "add"}</span>
          {showForm ? "Tutup Form" : "Catat Izin/Sakit"}
        </button>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hari Ini</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{todayAbsences.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">total izin/sakit</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disetujui</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">
            {todayAbsences.filter((a) => a.status === "approved").length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">siswa tidak dihitung alpa</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Keseluruhan</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{absences.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">semua catatan</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Catat Izin / Sakit Siswa</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cari Siswa (NIS / Nama)</label>
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Ketik NIS atau nama..."
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pilih Siswa</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">— Pilih Siswa —</option>
                {filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nis} — {s.user?.name ?? "Tanpa Nama"} {s.class ? `(${s.class.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jenis</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormType("izin")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    formType === "izin"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-500 hover:border-emerald-200"
                  }`}
                >
                  Izin
                </button>
                <button
                  onClick={() => setFormType("sakit")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    formType === "sakit"
                      ? "border-rose-500 bg-rose-50 text-rose-700"
                      : "border-slate-200 text-slate-500 hover:border-rose-200"
                  }`}
                >
                  Sakit
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Alasan (opsional)</label>
              <input
                type="text"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="Keterangan singkat..."
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              onClick={submitAbsence}
              disabled={saving || !selectedStudentId || !formDate}
              className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      )}

      {/* Recent absences table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Riwayat Izin & Sakit</h3>
          <p className="text-xs text-slate-400 mt-0.5">{absences.length} catatan</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Tanggal", "Nama Siswa", "NIS", "Jenis", "Alasan", "Status", "Aksi"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-400 first:rounded-tl-xl last:rounded-tr-xl">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : absences.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-5xl text-slate-200">event_available</span>
                      <p className="text-sm font-semibold text-slate-400">Belum ada catatan izin/sakit</p>
                    </div>
                  </td>
                </tr>
              ) : (
                absences.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold text-slate-700">{a.date}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">{a.student.name}</td>
                    <td className="px-5 py-3 text-sm text-slate-500 font-mono">{a.student.nis}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-bold uppercase rounded-full ${
                        a.type === "izin" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"
                      }`}>
                        {a.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">{a.reason ?? "—"}</td>
                    <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => deleteAbsence(a.id)}
                        className="text-rose-600 hover:text-rose-700 text-xs font-semibold"
                      >
                        Batalkan
                      </button>
                    </td>
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