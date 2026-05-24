"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { id } from "date-fns/locale";


interface AttendanceLog { id: string; tapTime: string; status: "present" | "late" | "absent"; studentName: string; nis: string; }
interface ClassOption { id: string; name: string; }
interface Summary { present: number; late: number; absent: number; total: number; }

const AVATAR_COLORS = ["bg-blue-100 text-blue-700","bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700","bg-rose-100 text-rose-700","bg-violet-100 text-violet-700"];
const getAvatarStyle = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name: string) => name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
const formatTime = (s: string) => s ? format(new Date(s), "HH:mm") : "--:--";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "present": return <span className="badge-emerald"><span className="dot-emerald" />Hadir</span>;
    case "late":    return <span className="badge-amber"><span className="dot-amber" />Terlambat</span>;
    default:        return <span className="badge-rose"><span className="dot-rose" />Alfa</span>;
  }
}

function SkeletonRow() {
  return <tr className="border-b border-slate-100"><td className="px-6 py-4"><div className="h-4 w-48 rounded skeleton" /></td><td className="px-6 py-4"><div className="h-4 w-20 rounded skeleton" /></td><td className="px-6 py-4"><div className="h-5 w-16 rounded-full skeleton" /></td><td className="px-6 py-4"><div className="h-8 w-20 rounded-lg skeleton ml-auto" /></td></tr>;
}

export default function TeacherDashboard() {
  const { user, isLoaded } = useUser();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [summary, setSummary] = useState<Summary>({ present: 0, late: 0, absent: 0, total: 0 });
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchClasses = async () => {
    const res = await fetch("/api/classes");
    if (res.ok) setClasses(await res.json());
  };

  const fetchAttendance = async () => {
    try {
      const params = new URLSearchParams({ date: new Date().toISOString().split("T")[0] });
      if (selectedClass) params.set("class_id", selectedClass);
      const res = await fetch(`/api/attendance?${params.toString()}&limit=50`);
      if (res.ok) { const d = await res.json(); setLogs(d.data || []); setSummary(d.summary || { present: 0, late: 0, absent: 0, total: 0 }); }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isLoaded) { fetchClasses(); fetchAttendance(); } }, [isLoaded, selectedClass]);

  const handleOverride = async (id: string, status: "present" | "absent") => {
    const notes = prompt("Keterangan (opsional):") ?? undefined;
    const res = await fetch(`/api/attendance/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, notes }) });
    if (res.ok) fetchAttendance();
  };

  const userName = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "Guru";
  const activeClass = selectedClass ? classes.find((c) => c.id === selectedClass)?.name : "Semua Kelas";

  return (
    <div className="space-y-6 pb-6">

      {/* ── Header ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="dot-emerald dot-pulse" />
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Pengajar</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {new Date().getHours() < 12 ? "Selamat Pagi" : new Date().getHours() < 18 ? "Selamat Siang" : "Selamat Malam"}, {userName}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(now, "EEEE, d MMMM yyyy", { locale: id })}
          </p>
        </div>
      </div>

      {/* ── Class selector + stats ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Class control */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle flex items-center justify-center">
              <span className="material-symbols-outlined text-brand text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kelas Aktif</p>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900">{activeClass}</h3>
                <span className="live-badge"><span className="dot" />Live</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand/90 transition-all shadow-sm">
              <span className="material-symbols-outlined text-sm">analytics</span>
              Rekap
            </button>
          </div>
        </div>

        {/* Live clock */}
        <div className="lg:col-span-4 bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="dot-emerald dot-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">WIB</span>
            </div>
            <h3 className="text-4xl font-black tracking-tight">{format(now, "HH:mm")}</h3>
            <p className="text-xs text-slate-400 mt-1">{format(now, "EEEE, d MMMM", { locale: id })}</p>
          </div>
          <div className="relative z-10 flex items-center gap-2 mt-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] text-slate-400">Sinkron RFID aktif</p>
          </div>
          <span className="absolute -right-4 -bottom-6 opacity-[0.06] material-symbols-outlined text-[120px] rotate-12">timer</span>
        </div>
      </div>

      {/* ── 3 Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Hadir", count: summary.present, icon: "check_circle", color: "bg-emerald-50 text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
          { label: "Terlambat", count: summary.late, icon: "schedule", color: "bg-amber-50 text-amber-600", badge: "bg-amber-100 text-amber-700" },
          { label: "Alfa", count: summary.absent, icon: "cancel", color: "bg-rose-50 text-rose-600", badge: "bg-rose-100 text-rose-700" },
        ].map(({ label, count, icon, color, badge }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4 card-hover">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-0.5">{count}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ── Student table ──────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">list_alt</span>
            Daftar Kehadiran
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {loading ? "Memuat..." : `${logs.length} siswa`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Waktu Tap</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : logs.length === 0 ? (
                <tr><td colSpan={4}>
                  <div className="empty-state">
                    <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">inbox</span>
                    <p className="text-sm font-semibold text-slate-500">Belum ada data presensi</p>
                  </div>
                </td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="group">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold ${getAvatarStyle(log.studentName)}`}>
                          {getInitials(log.studentName)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{log.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">NIS: {log.nis}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm font-mono font-bold text-slate-600">{formatTime(log.tapTime)}</td>
                    <td><StatusBadge status={log.status} /></td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {log.status === "absent" ? (
                          <>
                            <button onClick={() => handleOverride(log.id, "present")} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors">
                              IZIN
                            </button>
                            <button onClick={() => handleOverride(log.id, "absent")} className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-bold hover:bg-rose-100 transition-colors">
                              SAKIT
                            </button>
                          </>
                        ) : (
                          <button className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
                            <span className="material-symbols-outlined text-sm text-slate-500">more_vert</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {logs.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400">
            <span>Menampilkan {logs.length} siswa</span>
            <div className="flex gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm" disabled>
                <span className="material-symbols-outlined text-slate-300">chevron_left</span>
              </button>
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-white text-xs font-bold">1</span>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm" disabled>
                <span className="material-symbols-outlined text-slate-300">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}