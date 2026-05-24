"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { id } from "date-fns/locale";


interface AttendanceLog { id: string; tapTime: string; status: "present" | "late" | "absent"; date: string; }
interface Stats { totalDays: number; present: number; late: number; absent: number; percentage: number; }

const QUOTES = [
  { text: "Pendidikan adalah senjata paling mematikan di dunia.", author: "Nelson Mandela" },
  { text: "Ilmu yang tidak digunakan akan hilang.", author: "Pepatah Arab" },
  { text: "Hari ini adalah hadiah, manfaatkan sebaik mungkin.", author: "Unknown" },
];

const AVATAR_COLORS = ["bg-blue-100 text-blue-700","bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700","bg-rose-100 text-rose-700","bg-violet-100 text-violet-700"];
const getAvatarStyle = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name: string) => name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();

function formatDate(s: string) { return format(new Date(s), "EEEE, d MMMM", { locale: id }); }
function formatTime(s: string)  { return s ? format(new Date(s), "HH:mm") : "--:--"; }

function StatusIcon({ status }: { status: string }) {
  const configs = {
    present: { bg: "bg-emerald-100", color: "text-emerald-600", icon: "check_circle" },
    late:    { bg: "bg-amber-100",   color: "text-amber-600",   icon: "schedule" },
    absent:  { bg: "bg-rose-100",   color: "text-rose-600",     icon: "cancel" },
  };
  const c = configs[status as keyof typeof configs] ?? configs.absent;
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg}`}>
      <span className={`material-symbols-outlined text-lg ${c.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{c.icon}</span>
    </div>
  );
}

function StatRing({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(value / 50, 1) * 100;
  const r = 36, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 80, height: 80 }}>
        <svg width={80} height={80} className="-rotate-90">
          <circle cx={40} cy={40} r={r} fill="none" stroke="#e2e8f0" strokeWidth={7} />
          <circle cx={40} cy={40} r={r} fill="none" stroke={color} strokeWidth={7} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-slate-800">{value}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

const WEEKLY_DATA = [
  { day: "Sen", present: 0.95, late: 0.05 },
  { day: "Sel", present: 0.85, late: 0.10 },
  { day: "Rab", present: 0.90, late: 0.05 },
  { day: "Kam", present: 1.00, late: 0.00 },
  { day: "Jum", present: 0.80, late: 0.15 },
];

export default function StudentDashboard() {
  const { user, isLoaded } = useUser();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [stats, setStats] = useState<Stats>({ totalDays: 0, present: 0, late: 0, absent: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const userName = user?.fullName || user?.firstName || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "Siswa";

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const fetchAttendance = async () => {
      try {
        const res = await fetch("/api/attendance/me");
        if (res.ok) {
          const d = await res.json();
          setLogs(d.recent || []);
          setStats(d.stats || { totalDays: 0, present: 0, late: 0, absent: 0, percentage: 0 });
        }
      } finally { setLoading(false); }
    };
    fetchAttendance();
  }, [isLoaded, user]);

  const greeting = now.getHours() < 12 ? "Selamat Pagi" : now.getHours() < 18 ? "Selamat Siang" : "Selamat Malam";

  return (
    <div className="space-y-6 pb-6">

      {/* ── Greeting hero ──────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <span className="absolute -right-8 -bottom-8 text-[200px] opacity-[0.04] material-symbols-outlined select-none">school</span>
        <div className="relative z-10">
          <p className="text-emerald-400 text-[11px] font-bold uppercase tracking-widest mb-1">
            {greeting}
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {userName}
          </h2>
          <p className="text-slate-400 text-sm mt-1">{format(now, "EEEE, d MMMM yyyy", { locale: id })}</p>
        </div>
        <div className="relative z-10 mt-6 flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${getAvatarStyle(userName)}`}>
            {getInitials(userName)}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Portal Kehadiran RFID</p>
            <p className="text-xs text-slate-400">SMAN 1 Sumberlawang</p>
          </div>
        </div>
      </div>

      {/* ── Stats rings ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Statistik Kehadiran</h3>
            <p className="text-xs text-slate-400 mt-0.5">Keseluruhan semester</p>
          </div>
          {loading ? null : (
            <div className="text-right">
              <p className="text-2xl font-extrabold text-emerald-600">{stats.percentage}%</p>
              <p className="text-[10px] text-slate-400">Tingkat kehadiran</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-around gap-2">
          <StatRing label="Hadir" value={stats.present} color="#059669" />
          <div className="w-px h-16 bg-slate-100" />
          <StatRing label="Terlambat" value={stats.late} color="#f59e0b" />
          <div className="w-px h-16 bg-slate-100" />
          <StatRing label="Alfa" value={stats.absent} color="#e11d48" />
        </div>
      </div>

      {/* ── Content grid ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Weekly chart — 3 cols */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tren Mingguan</h3>
              <p className="text-[11px] text-slate-400">7 hari terakhir</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <div className="w-3 h-2 rounded bg-emerald-500" /> Tepat
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <div className="w-3 h-2 rounded bg-amber-400" /> Telat
              </span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-36">
            {WEEKLY_DATA.map(({ day, present, late }) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="w-full flex flex-col-reverse" style={{ height: "100%" }}>
                  <div className="w-full rounded-t-lg bg-emerald-500 transition-all group-hover:opacity-80" style={{ height: `${present * 100}%` }} />
                  <div className="w-full bg-amber-400 transition-all group-hover:opacity-80" style={{ height: `${late * 100}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-400">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quote card — 2 cols */}
        <div className="lg:col-span-2 bg-gradient-to-br from-brand to-brand-mid text-white rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div className="absolute top-4 right-4 opacity-10">
            <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
          </div>
          <div className="relative z-10">
            <p className="text-lg font-medium italic leading-relaxed">&#8220;{quote.text}&#8221;</p>
          </div>
          <div className="relative z-10 mt-4">
            <p className="text-sm font-semibold text-white/80">— {quote.author}</p>
          </div>
        </div>
      </div>

      {/* ── Recent logs ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">history</span>
            Log Kehadiran Terakhir
          </h3>
          <button className="text-xs font-semibold text-brand hover:underline">Riwayat Lengkap</button>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl skeleton" /><div><div className="h-4 w-40 rounded skeleton mb-1" /><div className="h-3 w-24 rounded skeleton" /></div></div>
                <div className="h-5 w-16 rounded-full skeleton" />
              </div>
            ))
          ) : logs.length === 0 ? (
            <div className="empty-state py-16">
              <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">inbox</span>
              <p className="text-sm font-semibold text-slate-500">Belum ada data presensi</p>
              <p className="text-xs text-slate-400 mt-1">Tap kartu RFID di gerbang untuk memulai</p>
            </div>
          ) : (
            logs.slice(0, 8).map((log) => (
              <div key={log.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <StatusIcon status={log.status} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{formatDate(log.date)}</p>
                    <p className="text-[11px] text-slate-400">{formatTime(log.tapTime)} WIB</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${
                  log.status === "present" ? "text-emerald-600" : log.status === "late" ? "text-amber-600" : "text-rose-600"
                }`}>
                  {log.status === "present" ? "Hadir" : log.status === "late" ? "Terlambat" : "Alfa"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}