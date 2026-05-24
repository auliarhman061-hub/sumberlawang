"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

/* ── Types ─────────────────────────────────────────── */
interface AttendanceLog {
  id: string;
  tapTime: string;
  status: "present" | "late" | "absent";
  studentName: string;
  nis: string;
  className: string | null;
  classId: string | null;
}

interface Summary {
  present: number;
  late: number;
  absent: number;
  total: number;
  checkedIn: number;
}

interface Device {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
  lastPing: string | null;
}

interface WeeklyBar {
  date: string;
  pct: number;
}

interface Stats {
  totalStudents: number;
  today: { present: number; late: number; absent: number };
  weekly: WeeklyBar[];
}

/* ── Color helpers ──────────────────────────────────── */
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
];

function getAvatarStyle(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/* ── Skeleton row ───────────────────────────────────── */
function SkeletonRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

/* ── Progress Ring ──────────────────────────────────── */
function ProgressRing({ pct, size = 80, stroke = 8 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#006c4e"
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

/* ── Stats Card ────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number;
  sublabel: string;
  icon: string;
  accentBg: string;
  accentText: string;
  badge?: number | null;
  badgeLabel?: string;
  ring?: number;
}

function StatCard({ label, value, sublabel, icon, accentBg, accentText, badge, badgeLabel, ring }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex gap-4 items-center relative overflow-hidden group">
      {/* Background icon watermark */}
      <span className="absolute -right-3 -bottom-3 text-7xl opacity-[0.04] material-symbols-outlined select-none">
        {icon}
      </span>

      <div className={`w-12 h-12 ${accentBg} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
        <span className={`material-symbols-outlined ${accentText} text-xl`}>{icon}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className="flex items-end gap-2 mt-0.5">
          <h3 className="text-3xl font-bold text-slate-900 leading-none">{value.toLocaleString("id-ID")}</h3>
          {ring != null && (
            <div className="mb-0.5">
              <div className="relative" style={{ width: 48, height: 48 }}>
                <ProgressRing pct={ring} size={48} stroke={4} />
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600">
                  {ring}%
                </span>
              </div>
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{sublabel}</p>
      </div>

      {badge != null && (
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${badge > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>
          {badgeLabel ?? `${badge}`}
        </div>
      )}
    </div>
  );
}

/* ── Bar Chart ─────────────────────────────────────── */
function WeeklyBarChart({ weekly }: { weekly: WeeklyBar[] }) {
  const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const max = 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Tren Mingguan</h3>
          <p className="text-[11px] text-slate-400">Kehadiran 7 hari terakhir</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 rounded bg-emerald-500" />
          <span className="text-[10px] text-slate-400 font-medium">Hadir + Terlambat</span>
        </div>
      </div>
      <div className="flex items-end gap-2 h-28">
        {DAY_LABELS.map((day, i) => {
          const w = weekly[i];
          const pct = w?.pct ?? 0;
          const heightPct = max > 0 ? pct : 0;
          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-1.5 group">
              <div className="w-full flex flex-col items-center justify-end h-full">
                <div className="relative w-full">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-500 group-hover:from-emerald-600 group-hover:to-emerald-500"
                    style={{ height: `${heightPct}%`, minHeight: pct > 0 ? "4px" : "0" }}
                  >
                    {pct > 0 && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {pct}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">{day}</span>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-1.5 rounded bg-gradient-to-r from-emerald-500 to-emerald-400" />
          <span className="text-[9px] text-slate-400">Target 100%</span>
        </div>
        {weekly.filter((w) => w.pct >= 90).length > 0 && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] text-slate-400">{weekly.filter((w) => w.pct >= 90).length}x di atas target</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Device Card ────────────────────────────────────── */
function DeviceCard({ device }: { device: Device }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 hover:border-emerald-200 transition-colors group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${device.isActive ? "bg-emerald-100" : "bg-slate-200"}`}>
            <span
              className={`material-symbols-outlined text-base ${device.isActive ? "text-emerald-600" : "text-slate-400"}`}
              style={{ fontVariationSettings: device.isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              sensors
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700 leading-tight">{device.name}</p>
            <p className="text-[10px] text-slate-400">{device.location ?? "Gerbang utama"}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
          device.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${device.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
          {device.isActive ? "Online" : "Offline"}
        </div>
      </div>
      {device.lastPing && (
        <p className="text-[10px] text-slate-400 mt-2 pl-10">
          Ping: {format(parseISO(device.lastPing), "HH:mm", { locale: id })}
        </p>
      )}
    </div>
  );
}

/* ── Status Badge ───────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "present":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded-full tracking-wide border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Hadir
        </span>
      );
    case "late":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase rounded-full tracking-wide border border-amber-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Terlambat
        </span>
      );
    case "absent":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold uppercase rounded-full tracking-wide border border-rose-100">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Alpa
        </span>
      );
    default:
      return null;
  }
}

/* ── Main Component ─────────────────────────────────── */
export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [summary, setSummary] = useState<Summary>({ present: 0, late: 0, absent: 0, total: 0, checkedIn: 0 });
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [statsRes, attRes, devRes] = await Promise.allSettled([
        fetch("/api/stats"),
        fetch(`/api/attendance?date=${selectedDate}&limit=50`),
        fetch("/api/devices"),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        setStats(await statsRes.value.json());
      }
      if (attRes.status === "fulfilled" && attRes.value.ok) {
        const data = await attRes.value.json();
        setLogs(data.data ?? []);
        setSummary(data.summary ?? { present: 0, late: 0, absent: 0, total: 0, checkedIn: 0 });
      }
      if (devRes.status === "fulfilled" && devRes.value.ok) {
        setDevices(await devRes.value.json() ?? []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!isLoaded) return;
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [isLoaded, fetchAll]);

  /* ── Derived ──────────────────────────────────────── */
  const totalCheckedIn = summary.present + summary.late;
  const attendancePct = summary.total > 0 ? Math.round((totalCheckedIn / summary.total) * 100) : 0;
  const absentCount = Math.max(0, summary.total - totalCheckedIn);

  const todayFormatted = format(parseISO(selectedDate), "EEEE, d MMMM yyyy", { locale: id });

  const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const weeklyBars: WeeklyBar[] = (() => {
    if (!stats?.weekly || stats.weekly.length === 0) {
      return DAY_LABELS.map((day) => ({ date: "", pct: 0 }));
    }
    return stats.weekly.map((w, i) => ({
      date: w.date,
      pct: w.pct,
    }));
  })();

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  const formatTapTime = (isoString: string) => {
    if (!isoString) return "--:--";
    return format(parseISO(isoString), "HH:mm:ss");
  };

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-6">

      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest">Live</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard Presensi
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {todayFormatted} &middot; {summary.checkedIn} dari {summary.total} siswa sudah tap
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm ${refreshing ? "animate-spin" : ""}`}>sync</span>
            Refresh
          </button>

          {/* Date picker */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:border-slate-300 transition-colors cursor-pointer focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* ── Stats Grid ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Siswa"
          value={stats?.totalStudents ?? summary.total}
          sublabel="Terdaftar aktif"
          icon="school"
          accentBg="bg-blue-50"
          accentText="text-blue-500"
        />
        <StatCard
          label="Hadir"
          value={summary.present}
          sublabel="Tepat waktu"
          icon="check_circle"
          accentBg="bg-emerald-50"
          accentText="text-emerald-500"
          ring={attendancePct}
        />
        <StatCard
          label="Terlambat"
          value={summary.late}
          sublabel="Melebihi jam masuk"
          icon="schedule"
          accentBg="bg-amber-50"
          accentText="text-amber-500"
          badge={summary.late > 0 ? summary.late : null}
          badgeLabel={summary.late > 0 ? `${Math.round((summary.late / summary.total) * 100)}%` : undefined}
        />
        <StatCard
          label="Alpa"
          value={absentCount}
          sublabel="Belum tap RFID"
          icon="cancel"
          accentBg="bg-rose-50"
          accentText="text-rose-500"
          badge={absentCount > 0 ? absentCount : null}
          badgeLabel={absentCount > 0 ? "Perlu aksi" : undefined}
        />
      </div>

      {/* ── Attendance Ring Hero ─────────────────────── */}
      {summary.total > 0 && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 rounded-2xl p-6 text-white relative overflow-hidden">
          {/* Watermark */}
          <span className="absolute -right-6 -bottom-6 text-[180px] opacity-[0.03] material-symbols-outlined select-none">analytics</span>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="relative" style={{ width: 96, height: 96 }}>
                <ProgressRing pct={attendancePct} size={96} stroke={9} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold">{attendancePct}%</span>
                  <span className="text-[9px] text-slate-400 font-medium">TAP</span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold">Tingkat Kehadiran</h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  {totalCheckedIn} dari {summary.total} siswa sudah tap RFID
                </p>
              </div>
            </div>

            <div className="flex-1 flex items-center gap-6 md:justify-end">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-emerald-400">{summary.present}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Hadir</p>
              </div>
              <div className="w-px h-10 bg-slate-700" />
              <div className="text-center">
                <p className="text-3xl font-extrabold text-amber-400">{summary.late}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Terlambat</p>
              </div>
              <div className="w-px h-10 bg-slate-700" />
              <div className="text-center">
                <p className="text-3xl font-extrabold text-rose-400">{absentCount}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Alpa</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Grid ────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* Attendance Table — 3 cols */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-500 text-lg">list_alt</span>
                Log Kehadiran
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {loading ? "Memuat..." : `${logs.length} tap tercatat`}
                {refreshing && <span className="ml-2 text-emerald-500">●</span>}
              </p>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors active:scale-95">
              <span className="material-symbols-outlined text-sm">download</span>
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["#", "Waktu", "Nama Siswa", "NIS", "Kelas", "Status"].map((h) => (
                    <th key={h} className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 first:rounded-tl-xl last:rounded-tr-xl">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-5xl text-slate-200">inbox</span>
                        <p className="text-sm font-semibold text-slate-400">Belum ada data presensi</p>
                        <p className="text-xs text-slate-300">Tap kartu RFID di gerbang untuk memulai</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log, i) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-6 py-3.5 text-xs font-semibold text-slate-300">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-bold text-slate-700 font-mono">
                        {formatTapTime(log.tapTime)}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${getAvatarStyle(log.studentName)}`}>
                            {getInitials(log.studentName)}
                          </div>
                          <span className="text-sm font-semibold text-slate-800">{log.studentName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs font-mono text-slate-500">{log.nis}</td>
                      <td className="px-6 py-3.5 text-xs text-slate-500">{log.className ?? "—"}</td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={log.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {logs.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 bg-slate-50/50">
              <span>Menampilkan {logs.length} dari {summary.total} siswa</span>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg hover:bg-white transition-colors" disabled>
                  <span className="material-symbols-outlined text-lg text-slate-300">chevron_left</span>
                </button>
                <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold">1</span>
                <button className="p-1.5 rounded-lg hover:bg-white transition-colors" disabled>
                  <span className="material-symbols-outlined text-lg text-slate-300">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Devices + Weekly Chart — 1 col */}
        <div className="xl:col-span-1 space-y-5">
          {/* Devices */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>sensors</span>
                IoT Gate Status
              </h3>
            </div>
            <div className="p-4 space-y-2.5">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3.5 h-16 animate-pulse" />
                ))
              ) : devices.length > 0 ? (
                devices.map((d) => <DeviceCard key={d.id} device={d} />)
              ) : (
                <>
                  <DeviceCard device={{ id: "1", name: "Gerbang Utama", location: "Pintu masuk", isActive: true, lastPing: new Date().toISOString() }} />
                  <DeviceCard device={{ id: "2", name: "Gerbang Utara", location: "Pintu samping", isActive: false, lastPing: null }} />
                  <DeviceCard device={{ id: "3", name: "Gerbang Parkiran", location: "Area parkir", isActive: true, lastPing: new Date().toISOString() }} />
                </>
              )}
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5">
            <WeeklyBarChart weekly={weeklyBars} />
          </div>
        </div>
      </div>

      {/* ── FAB — Tambah Siswa ─────────────────────── */}
      <a
        href="/admin/students"
        className="fixed bottom-20 right-6 w-14 h-14 bg-emerald-500 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all z-40 no-underline group"
        title="Tambah siswa"
      >
        <span className="material-symbols-outlined text-2xl">person_add</span>
        <span className="absolute -top-10 -left-2 bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-semibold shadow-lg">
          Tambah Siswa
        </span>
      </a>
    </div>
  );
}