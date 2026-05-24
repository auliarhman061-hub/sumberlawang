"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface StudentSummary {
  studentId: string; name: string; nis: string; class: string;
  present: number; late: number; absent: number; total: number; percentage: number;
}
interface Totals { totalStudents: number; avgAttendance: number; totalPresent: number; totalLate: number; totalAbsent: number; }

const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

const AVATAR_COLORS = ["bg-blue-100 text-blue-700","bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700","bg-rose-100 text-rose-700","bg-violet-100 text-violet-700"];
const getAvatarStyle = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name: string) => name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();

function SkeletonRow({ cols = 7 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4"><div className="h-4 rounded skeleton" style={{ width: `${30 + Math.random() * 50}%` }} /></td>
      ))}
    </tr>
  );
}

function PctBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "#059669" : pct >= 75 ? "#f59e0b" : "#e11d48";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

function SummaryCard({ label, value, icon, color, bg }: { label: string; value: string | number; icon: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-2xl p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <div>
        <p className="text-xs font-semibold opacity-60 uppercase tracking-wider">{label}</p>
        <h3 className="text-2xl font-extrabold mt-0.5">{value}</h3>
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const { isLoaded } = useUser();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [summaries, setSummaries] = useState<StudentSummary[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/monthly?month=${month}&year=${year}`);
      if (res.ok) { const d = await res.json(); setSummaries(d.summaries || []); setTotals(d.totals || null); }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isLoaded) fetchReport(); }, [isLoaded, month, year]);

  const handleExport = () => {
    if (!totals) return;
    const lines = [
      `LAPORAN BULANAN KEHADIRAN - SMAN 1 SUMBERLAWANG`,
      `Bulan: ${MONTHS[month - 1]} ${year}`,
      `Total Siswa: ${totals.totalStudents} | Rata-rata: ${totals.avgAttendance}%`,
      `Hadir: ${totals.totalPresent} | Terlambat: ${totals.totalLate} | Alpa: ${totals.totalAbsent}`,
      ``,
      `NO | NIS | NAMA | KELAS | HADIR | TELAT | ALPA | %`,
      ...summaries.map((s, i) =>
        `${i+1} | ${s.nis} | ${s.name} | ${s.class} | ${s.present} | ${s.late} | ${s.absent} | ${s.percentage}%`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `laporan_${MONTHS[month-1]}_${year}.txt`; a.click();
  };

  return (
    <div className="space-y-6 pb-6">

      {/* ── Page header ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="dot-emerald dot-pulse" />
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Analitik</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Laporan Bulanan</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Rekapitulasi kehadiran siswa per bulan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select
            value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            {[2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleExport}
            disabled={!totals || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl font-semibold hover:bg-brand/90 transition-all disabled:opacity-50 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export
          </button>
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────── */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <SummaryCard label="Total Siswa" value={totals.totalStudents} icon="school" color="bg-white text-blue-500" bg="bg-blue-50 rounded-2xl" />
          <SummaryCard label="Rata-rata" value={`${totals.avgAttendance}%`} icon="trending_up" color="bg-white text-brand" bg="bg-brand-subtle rounded-2xl" />
          <SummaryCard label="Hadir" value={totals.totalPresent} icon="check_circle" color="bg-white text-emerald-600" bg="bg-emerald-50 rounded-2xl" />
          <SummaryCard label="Terlambat" value={totals.totalLate} icon="schedule" color="bg-white text-amber-600" bg="bg-amber-50 rounded-2xl" />
          <SummaryCard label="Alpa" value={totals.totalAbsent} icon="cancel" color="bg-white text-rose-600" bg="bg-rose-50 rounded-2xl" />
        </div>
      )}

      {/* ── Table ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400 text-lg">table_chart</span>
              Rekap Siswa — {MONTHS[month - 1]} {year}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {summaries.length} siswa
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Siswa</th>
                <th>NIS</th>
                <th>Kelas</th>
                <th className="text-center">Hadir</th>
                <th className="text-center">Telat</th>
                <th className="text-center">Alpa</th>
                <th>Persentase</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : summaries.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">description</span>
                      <p className="text-sm font-semibold text-slate-500">Belum ada data untuk bulan ini</p>
                    </div>
                  </td>
                </tr>
              ) : (
                summaries.map((s) => (
                  <tr key={s.studentId} className="group">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${getAvatarStyle(s.name)}`}>
                          {getInitials(s.name)}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{s.name}</span>
                      </div>
                    </td>
                    <td className="text-sm font-mono text-slate-500">{s.nis}</td>
                    <td className="text-sm text-slate-500">{s.class}</td>
                    <td className="text-center text-sm font-bold text-emerald-600">{s.present}</td>
                    <td className="text-center text-sm font-bold text-amber-600">{s.late}</td>
                    <td className="text-center text-sm font-bold text-rose-600">{s.absent}</td>
                    <td className="min-w-[140px]"><PctBar pct={s.percentage} /></td>
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