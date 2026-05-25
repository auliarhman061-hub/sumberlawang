"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";

interface AttendanceLog {
  id: string;
  tapTime: string;
  status: string;
  date: string;
}

interface Stats {
  totalDays: number;
  present: number;
  late: number;
  absent: number;
  percentage: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  present: { label: "Hadir", color: "emerald" },
  late: { label: "Terlambat", color: "amber" },
  absent: { label: "Alfa", color: "rose" },
};

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: id }) };
});

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className={`bg-${color}-50 border border-${color}-200 rounded-2xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`material-symbols-outlined text-${color}-400 text-base`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        <span className={`text-xs font-semibold text-${color}-700`}>{label}</span>
      </div>
      <p className={`text-3xl font-extrabold text-${color}-800`}>{value}x</p>
    </div>
  );
}

export default function StudentReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [recent, setRecent] = useState<AttendanceLog[]>([]);
  const [stats, setStats] = useState<Stats>({ totalDays: 0, present: 0, late: 0, absent: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) { router.push("/sign-in"); return; }
    if (user && user.role !== "student") { router.push("/"); return; }
    fetchData();
  }, [user, authLoading, month]);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [year, mon] = month.split("-");
      const startDate = startOfMonth(new Date(parseInt(year), parseInt(mon) - 1));
      const endDate = endOfMonth(new Date(parseInt(year), parseInt(mon) - 1));
      const start = format(startDate, "yyyy-MM-dd");
      const end = format(endDate, "yyyy-MM-dd");

      const [recentRes, statsRes] = await Promise.all([
        fetch(`/api/attendance/me?start=${start}&end=${end}&limit=30`),
        fetch(`/api/attendance/me?start=${start}&end=${end}&stats=1`),
      ]);

      if (!recentRes.ok) {
        setError("Gagal mengambil data presensi");
        return;
      }

      const recentData = await recentRes.json();
      const statsData = await statsRes.json();

      setRecent(recentData.recent ?? []);
      setStats(statsData.stats ?? recentData.stats ?? { totalDays: 0, present: 0, late: 0, absent: 0, percentage: 0 });
    } catch {
      setError("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-100 rounded-xl" />
        <div className="h-20 bg-slate-100 rounded-xl" />
        <div className="h-64 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
        <p className="text-sm font-semibold text-rose-600">{error}</p>
        <button onClick={fetchData} className="mt-3 text-xs text-rose-500 underline">Coba lagi</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Rekapitulasi</h2>
        <p className="text-sm text-slate-500 mt-1">Histori dan statistik kehadiran Anda</p>
      </div>

      {/* Month Picker */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {MONTHS.map((m) => (
          <button
            key={m.value}
            onClick={() => setMonth(m.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              month === m.value
                ? "bg-brand text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Hadir" value={stats.present} color="emerald" icon="check_circle" />
        <StatCard label="Terlambat" value={stats.late} color="amber" icon="schedule" />
        <StatCard label="Alfa" value={stats.absent} color="rose" icon="close" />
        <StatCard label="Kehadiran" value={stats.percentage} color="blue" icon="percent" />
      </div>

      {/* Percentage Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>0%</span>
          <span>{stats.percentage}%</span>
          <span>100%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${Math.min(100, stats.percentage)}%` }}
          />
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          {stats.percentage}% kehadiran dari {stats.totalDays} hari aktif
        </p>
      </div>

      {/* Recent History */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700">Riwayat Presensi</h3>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>
            <p className="text-sm text-slate-500">Belum ada data presensi untuk bulan ini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((log) => {
              const s = STATUS_LABELS[log.status] ?? { label: log.status, color: "slate" };
              return (
                <div key={log.id} className="px-5 py-3 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${s.color}-50 border border-${s.color}-200`}>
                    <span className={`material-symbols-outlined text-${s.color}-600 text-base`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {log.status === "present" ? "check_circle" : log.status === "late" ? "schedule" : "cancel"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold text-${s.color}-700`}>{s.label}</p>
                    <p className="text-xs text-slate-400">
                      {log.date ? format(new Date(log.date), "EEEE, d MMMM yyyy", { locale: id }) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg bg-${s.color}-50 text-${s.color}-700 border border-${s.color}-200`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}