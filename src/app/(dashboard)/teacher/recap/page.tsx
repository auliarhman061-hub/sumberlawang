"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

interface Subject { id: string; name: string; abbreviation: string | null }
interface Class { id: string; name: string }

interface RecapRow {
  studentId: string;
  studentName: string;
  nis: string;
  className: string;
  subjectName: string;
  present: number;
  late: number;
  absent: number;
  izin: number;
  sick: number;
  total: number;
  percentage: number;
}

const MONTHS = [
  { value: 1, label: "Januari" }, { value: 2, label: "Februari" }, { value: 3, label: "Maret" },
  { value: 4, label: "April" }, { value: 5, label: "Mei" }, { value: 6, label: "Juni" },
  { value: 7, label: "Juli" }, { value: 8, label: "Agustus" }, { value: 9, label: "September" },
  { value: 10, label: "Oktober" }, { value: 11, label: "November" }, { value: 12, label: "Desember" },
];

export default function TeacherRecapPage() {
  const { isLoaded } = useUser();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const [recap, setRecap] = useState<RecapRow[]>([]);
  const [totals, setTotals] = useState({ present: 0, late: 0, absent: 0, izin: 0, sick: 0 });

  useEffect(() => {
    if (!isLoaded) return;
    fetchMeta();
  }, [isLoaded]);

  const fetchMeta = async () => {
    try {
      const [subRes, clsRes] = await Promise.all([
        fetch("/api/subjects"),
        fetch("/api/classes"),
      ]);
      if (subRes.ok) setSubjects(await subRes.json());
      if (clsRes.ok) setClasses(await clsRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecap = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: String(month), year: String(year) });
      if (selectedSubject) params.set("subject_id", selectedSubject);
      if (selectedClass) params.set("class_id", selectedClass);

      const res = await fetch(`/api/reports/teacher?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecap(data.breakdown ?? []);
        setTotals(data.totals ?? { present: 0, late: 0, absent: 0, izin: 0, sick: 0 });
      } else {
        alert("Gagal memuat data");
      }
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        type: "recap",
        format: "csv",
        month: String(month),
        year: String(year),
      });
      if (selectedClass) params.set("class_id", selectedClass);

      const res = await fetch(`/api/reports/export?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rekap_${year}_${String(month).padStart(2, "0")}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Gagal export");
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Rekapitulasi Kehadiran</h2>
        <p className="text-sm text-slate-500 mt-1">Rekap kehadiran siswa per mata pelajaran</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Filter Laporan</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bulan</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
            >
              {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tahun</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mata Pelajaran</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Semua Mata Pelajaran</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchRecap}
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? "Memuat..." : "Tampilkan Rekap"}
          </button>
          <button
            onClick={exportCSV}
            disabled={exporting || recap.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">download</span>
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {recap.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hadir</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{totals.present}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Terlambat</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{totals.late}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alpa</p>
            <p className="text-3xl font-bold text-rose-600 mt-1">{totals.absent}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Izin</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{totals.izin}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sakit</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">{totals.sick}</p>
          </div>
        </div>
      )}

      {/* Recap Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Detail Rekap per Siswa</h3>
          <p className="text-xs text-slate-400 mt-0.5">{recap.length} siswa</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Nama", "NIS", "Kelas", "Hadir", "Telat", "Alpa", "Izin", "Sakit", "%"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : recap.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-5xl text-slate-200">analytics</span>
                      <p className="text-sm font-semibold text-slate-400">Belum ada data</p>
                      <p className="text-xs text-slate-300">Pilih filter dan klik "Tampilkan Rekap"</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recap.map((row) => (
                  <tr key={row.studentId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">{row.studentName}</td>
                    <td className="px-5 py-3 text-sm text-slate-500 font-mono">{row.nis}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{row.className}</td>
                    <td className="px-5 py-3 text-sm font-bold text-emerald-600">{row.present}</td>
                    <td className="px-5 py-3 text-sm font-bold text-amber-600">{row.late}</td>
                    <td className="px-5 py-3 text-sm font-bold text-rose-600">{row.absent}</td>
                    <td className="px-5 py-3 text-sm font-bold text-blue-600">{row.izin}</td>
                    <td className="px-5 py-3 text-sm font-bold text-purple-600">{row.sick}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              row.percentage >= 90 ? "bg-emerald-500" :
                              row.percentage >= 75 ? "bg-amber-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${row.percentage}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${
                          row.percentage >= 90 ? "text-emerald-600" :
                          row.percentage >= 75 ? "text-amber-600" : "text-rose-600"
                        }`}>
                          {row.percentage}%
                        </span>
                      </div>
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